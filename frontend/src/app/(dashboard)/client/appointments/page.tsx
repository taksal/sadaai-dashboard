'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, X, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useComponentAccess } from '@/hooks/useComponentAccess';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  provider?: string;
  bookingReference?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function ClientAppointmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuthUser({ requiredRole: UserRole.CLIENT });
  const { canAccessPage } = useComponentAccess(user);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!isAuthLoading && user) {
      const hasAccess = canAccessPage('appointments');
      if (!hasAccess) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the appointments page',
          variant: 'destructive',
        });
        router.push('/client');
      }
    }
  }, [user, isAuthLoading, canAccessPage, router, toast]);

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data;
    },
    enabled: !!user,
  });

  useQuery({
    queryKey: ['calendar-sync', user?.id],
    queryFn: async () => {
      const res = await api.post('/appointments/sync');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      return api.post(`/appointments/${appointmentId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
      toast({ title: 'Success', description: 'Appointment cancelled' });
    },
  });

  const appointments: Appointment[] = appointmentsData?.appointments || [];

  // Generate all 24 hours starting from 7 AM
  const hours = Array.from({ length: 24 }, (_, i) => (i + 7) % 24);

  const getWeekDays = () => {
    const start = new Date(currentDate);
    // Start from Monday (1) instead of Sunday (0)
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust to start from Monday
    const startDay = firstDay.getDay();
    const startOffset = startDay === 0 ? -6 : 1 - startDay;
    const start = new Date(firstDay);
    start.setDate(start.getDate() + startOffset);

    const days = [];
    let current = new Date(start);

    // Generate 6 weeks (42 days) for consistent grid
    for (let i = 0; i < 42; i++) {
      if (current.getMonth() === month) {
        days.push(new Date(current));
      } else {
        days.push(null);
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();

  const getAppointmentsForDay = (day: Date | null) => {
    if (!day) return [];
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return (
        aptDate.getFullYear() === day.getFullYear() &&
        aptDate.getMonth() === day.getMonth() &&
        aptDate.getDate() === day.getDate()
      );
    });
  };

  const isToday = (day: Date | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500',
      CONFIRMED: 'bg-green-500',
      CANCELLED: 'bg-red-500',
      COMPLETED: 'bg-gray-500',
    };
    return colors[status] || 'bg-blue-500';
  };

  const getAppointmentPosition = (startTime: string) => {
    const date = new Date(startTime);
    const hour = date.getHours();
    const minute = date.getMinutes();
    // Adjust for 7 AM start time
    const adjustedHour = hour >= 7 ? hour - 7 : hour + 17; // 0-6 AM becomes 17-23
    return (adjustedHour + minute / 60) * 60; // 60px per hour
  };

  const getAppointmentHeight = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max((durationMinutes / 60) * 60, 30); // Minimum 30px
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-AU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  };

  if (isAuthLoading) {
    return (
      <DashboardLayout userRole={UserRole.CLIENT}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      userRole={UserRole.CLIENT}
      user={user}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showViewModeSelector={true}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your calendar appointments
          </p>
        </div>

        <div className="space-y-3">
          {/* Navigation & View Controls */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm sm:text-lg font-medium">{getDateRangeText()}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Stats Capsule Bar - Single unified bar on desktop */}
              <div className="hidden lg:flex items-center bg-white rounded-full border shadow-sm px-4 py-1.5">
                {[
                  { label: 'Scheduled', color: 'bg-blue-500', status: 'SCHEDULED' },
                  { label: 'Confirmed', color: 'bg-green-500', status: 'CONFIRMED' },
                  { label: 'Completed', color: 'bg-gray-500', status: 'COMPLETED' },
                  { label: 'Cancelled', color: 'bg-red-500', status: 'CANCELLED' },
                ].map((stat, index, array) => (
                  <div key={stat.status} className="flex items-center">
                    <div className="flex items-center gap-1.5 px-2">
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', stat.color)} />
                      <span className="text-xs text-gray-600 whitespace-nowrap">{stat.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {appointments.filter((a) => a.status === stat.status).length}
                      </span>
                    </div>
                    {index < array.length - 1 && (
                      <div className="h-4 w-px bg-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats - Mobile View Only */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:hidden">
            {[
              { label: 'Scheduled', color: 'bg-blue-500', status: 'SCHEDULED' },
              { label: 'Confirmed', color: 'bg-green-500', status: 'CONFIRMED' },
              { label: 'Completed', color: 'bg-gray-500', status: 'COMPLETED' },
              { label: 'Cancelled', color: 'bg-red-500', status: 'CANCELLED' },
            ].map((stat) => (
              <div key={stat.status} className="bg-white rounded-xl border shadow-sm px-3 py-1.5 flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full flex-shrink-0', stat.color)} />
                <span className="text-[10px] sm:text-xs text-gray-600 truncate">{stat.label}</span>
                <span className="text-sm sm:text-base font-bold text-gray-900 ml-auto">
                  {appointments.filter((a) => a.status === stat.status).length}
                </span>
              </div>
            ))}
          </div>

        {/* Week View */}
        {viewMode === 'week' && (
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            {/* Scrollable Container */}
            <div className="overflow-auto max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-220px)]">
              <div className="relative">
                {/* Week Header - Sticky */}
                <div className="sticky top-0 z-20 bg-white border-b">
                  <div className="flex">
                    <div className="w-16 flex-shrink-0 p-3 text-xs font-medium text-gray-500 border-r bg-white">
                      TIME
                    </div>
                    <div className="flex-1 grid grid-cols-7">
                      {weekDays.map((day, idx) => (
                        <div
                          key={idx}
                          className={cn('p-1 sm:p-2 md:p-3 text-center border-r last:border-r-0', isToday(day) && 'bg-blue-50')}
                        >
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-500 uppercase">
                            {day.toLocaleDateString('en-AU', { weekday: 'short' })}
                          </div>
                          <div
                            className={cn(
                              'text-sm sm:text-lg md:text-2xl font-semibold mt-0.5 sm:mt-1',
                              isToday(day)
                                ? 'bg-blue-600 text-white w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center mx-auto text-xs sm:text-base md:text-2xl'
                                : 'text-gray-900'
                            )}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time Grid */}
                {hours.map((hour) => (
                  <div key={hour} className="flex border-b" style={{ height: '60px' }}>
                    <div className="w-16 flex-shrink-0 p-2 text-xs text-gray-500 border-r flex items-start justify-end pr-2 bg-gray-50/50">
                      {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                    <div className="flex-1 grid grid-cols-7">
                      {weekDays.map((day, dayIdx) => (
                        <div
                          key={dayIdx}
                          className={cn('border-r last:border-r-0 relative', isToday(day) && 'bg-blue-50/20')}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Appointments Overlay */}
                <div className="absolute left-16 right-0" style={{ top: '81px' }}>
                  {weekDays.map((day, dayIdx) => {
                    const dayAppointments = getAppointmentsForDay(day);

                    // Sort appointments by start time
                    const sortedAppointments = [...dayAppointments].sort((a, b) =>
                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                    );

                    // Calculate overlap positions
                    const appointmentsWithPosition: Array<Appointment & { column: number }> = [];

                    for (let idx = 0; idx < sortedAppointments.length; idx++) {
                      const apt = sortedAppointments[idx];
                      const aptStart = new Date(apt.startTime).getTime();
                      const aptEnd = new Date(apt.endTime).getTime();

                      // Find which columns are already occupied by overlapping appointments
                      const occupiedColumns = new Set<number>();
                      for (let i = 0; i < idx; i++) {
                        const prevApt = sortedAppointments[i];
                        const prevStart = new Date(prevApt.startTime).getTime();
                        const prevEnd = new Date(prevApt.endTime).getTime();

                        // Check if they overlap
                        if (aptStart < prevEnd && aptEnd > prevStart) {
                          const prevColumn = appointmentsWithPosition[i].column;
                          occupiedColumns.add(prevColumn);
                        }
                      }

                      // Find the first available column
                      let column = 0;
                      while (occupiedColumns.has(column)) {
                        column++;
                      }

                      appointmentsWithPosition.push({ ...apt, column });
                    }

                    // Calculate max columns for this day (max column index + 1)
                    const maxColumns = appointmentsWithPosition.length > 0
                      ? Math.max(...appointmentsWithPosition.map(a => a.column)) + 1
                      : 1;

                    return appointmentsWithPosition.map((apt) => {
                      const top = getAppointmentPosition(apt.startTime);
                      const height = getAppointmentHeight(apt.startTime, apt.endTime);
                      const dayWidth = 100 / 7;
                      const columnWidth = dayWidth / maxColumns;
                      const left = (dayIdx * dayWidth) + (apt.column * columnWidth);

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            'absolute rounded-lg p-2 text-white text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:shadow-lg hover:z-10',
                            getStatusColor(apt.status)
                          )}
                          style={{
                            top: `${top + 2}px`,
                            left: `${left}%`,
                            width: `calc(${columnWidth}% - 4px)`,
                            height: `${height - 4}px`,
                            marginLeft: '2px',
                          }}
                          onClick={() => setSelectedAppointment(apt)}
                        >
                          <div className="font-semibold truncate text-xs">{apt.title}</div>
                          <div className="text-[10px] opacity-90 truncate">{apt.customerName}</div>
                          {height > 50 && apt.bookingReference && (
                            <div className="text-[10px] opacity-75 font-mono mt-1">#{apt.bookingReference}</div>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            {/* Scrollable Container */}
            <div className="overflow-auto max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-220px)]">
              <div className="relative">
                {/* Day Header - Sticky */}
                <div className="sticky top-0 z-20 bg-white border-b">
                  <div className="flex">
                    <div className="w-12 sm:w-16 flex-shrink-0 p-2 sm:p-3 text-[10px] sm:text-xs font-medium text-gray-500 border-r bg-white">
                      TIME
                    </div>
                    <div className="flex-1 p-2 sm:p-3 text-center">
                      <div className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                        {currentDate.toLocaleDateString('en-AU', { weekday: 'long' })}
                      </div>
                      <div className={cn(
                        'text-lg sm:text-2xl font-semibold mt-0.5 sm:mt-1',
                        isToday(currentDate) && 'text-blue-600'
                      )}>
                        {currentDate.getDate()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Grid */}
                {hours.map((hour) => (
                  <div key={hour} className="flex border-b" style={{ height: '60px' }}>
                    <div className="w-12 sm:w-16 flex-shrink-0 p-1 sm:p-2 text-[10px] sm:text-xs text-gray-500 border-r flex items-start justify-end pr-1 sm:pr-2 bg-gray-50/50">
                      {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                    <div className="flex-1 relative bg-gray-50/30" />
                  </div>
                ))}

                {/* Appointments */}
                <div className="absolute left-12 sm:left-16 right-0" style={{ top: '81px' }}>
                  {getAppointmentsForDay(currentDate).map((apt) => {
                    const top = getAppointmentPosition(apt.startTime);
                    const height = getAppointmentHeight(apt.startTime, apt.endTime);

                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          'absolute rounded-lg p-2 sm:p-3 text-white text-xs sm:text-sm cursor-pointer hover:opacity-90 transition-all hover:shadow-lg',
                          getStatusColor(apt.status)
                        )}
                        style={{
                          top: `${top + 2}px`,
                          left: '4px',
                          right: '4px',
                          height: `${height - 4}px`,
                        }}
                        onClick={() => setSelectedAppointment(apt)}
                      >
                        <div className="font-semibold truncate">{apt.title}</div>
                        <div className="text-[10px] sm:text-xs opacity-90 mt-1">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </div>
                        <div className="text-[10px] sm:text-xs opacity-90 mt-1 truncate">{apt.customerName}</div>
                        {apt.bookingReference && (
                          <div className="text-[10px] sm:text-xs opacity-75 font-mono mt-1">#{apt.bookingReference}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            {/* Month Header - Fixed */}
            <div className="sticky top-0 z-20 bg-white border-b">
              <div className="grid grid-cols-7 bg-white">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-medium text-gray-500 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Month Grid */}
            <div className="overflow-auto max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-220px)]">
              <div className="grid grid-cols-7">
                {monthDays.map((day, idx) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'min-h-[80px] sm:min-h-[120px] border-r border-b last:border-r-0 p-1 sm:p-2',
                        !day && 'bg-gray-50/50',
                        isToday(day) && 'bg-blue-50'
                      )}
                    >
                      {day && (
                        <>
                          <div
                            className={cn(
                              'text-xs sm:text-sm font-medium mb-1 sm:mb-2',
                              isToday(day)
                                ? 'bg-blue-600 text-white w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-sm'
                                : 'text-gray-700'
                            )}
                          >
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 2).map((apt) => (
                              <div
                                key={apt.id}
                                className={cn(
                                  'text-[10px] sm:text-xs p-0.5 sm:p-1 rounded text-white cursor-pointer hover:opacity-90 truncate',
                                  getStatusColor(apt.status)
                                )}
                                onClick={() => setSelectedAppointment(apt)}
                              >
                                <span className="hidden sm:inline">{formatTime(apt.startTime)} </span>{apt.title}
                              </div>
                            ))}
                            {dayAppointments.length > 2 && (
                              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                +{dayAppointments.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedAppointment.title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setSelectedAppointment(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Date & Time</div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(selectedAppointment.startTime).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Customer</div>
                  <div className="text-sm font-medium text-gray-900">{selectedAppointment.customerName}</div>
                  <div className="text-sm text-gray-600">{selectedAppointment.customerPhone}</div>
                  {selectedAppointment.customerEmail && (
                    <div className="text-sm text-gray-600">{selectedAppointment.customerEmail}</div>
                  )}
                </div>

                {selectedAppointment.bookingReference && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Booking Reference</div>
                    <div className="text-sm font-mono font-medium text-gray-900">
                      {selectedAppointment.bookingReference}
                    </div>
                  </div>
                )}

                {selectedAppointment.description && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Description</div>
                    <div className="text-sm text-gray-900">{selectedAppointment.description}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <span
                    className={cn(
                      'inline-flex px-3 py-1 rounded-full text-xs font-medium text-white',
                      getStatusColor(selectedAppointment.status)
                    )}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toast({ title: 'Reschedule feature coming soon' })}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => cancelMutation.mutate({ appointmentId: selectedAppointment.id })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
