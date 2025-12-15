'use client';
import { TrendingUp, PieChartIcon, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { UserRole, CallAnalytics, Call } from '@/types';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LiveCallsCard } from '@/components/dashboard/LiveCallsCard';
import { CallDetailsPanel } from '@/components/client/CallDetailsPanel';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CallsTable } from '@/components/common/CallsTable';
import { BillableMinutesDisplay } from '@/components/common/BillableMinutesDisplay';
import { MonthlyPlanUsage } from '@/components/common/MonthlyPlanUsage';
import { useAuthUser } from '@/hooks/useAuthUser';
import { filterCallsByDate, filterToDays } from '@/lib/dateFilters';
import { ProtectedComponent } from '@/components/common/ProtectedComponent';

interface UserStats {
  totalCalls: number;
  totalMinutes: number;
  totalCost: number;
}


export default function ClientDashboard() {
  const { user, isLoading } = useAuthUser({ requiredRole: UserRole.CLIENT });
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Always default to 'today' on page load
  const [dateFilter, setDateFilter] = useState('today');
  // Assistant filter state - defaults to first assistant if available
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');

  // Set default assistant to first one when user data loads
  useEffect(() => {
    if (user?.vapiAssistants && user.vapiAssistants.length > 0 && !selectedAssistantId) {
      setSelectedAssistantId(user.vapiAssistants[0].id);
    }
  }, [user, selectedAssistantId]);

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['user-stats', user?.id, dateFilter, selectedAssistantId],
    queryFn: async () => {
      if (!user) throw new Error('User not found');
      const daysParam = filterToDays(dateFilter);
      const assistantParam = selectedAssistantId && selectedAssistantId !== 'all' ? `&assistantId=${selectedAssistantId}` : '';
      const res = await api.get(`/users/stats/${user.id}?days=${daysParam}${assistantParam}`);
      return res.data;
    },
    enabled: !!user && !!selectedAssistantId,
  });

  const { data: analytics } = useQuery<CallAnalytics>({
    queryKey: ['call-analytics', user?.id, dateFilter, selectedAssistantId],
    queryFn: async () => {
      const days = dateFilter === 'all' ? 3650 : filterToDays(dateFilter);
      const assistantParam = selectedAssistantId && selectedAssistantId !== 'all' ? `&assistantId=${selectedAssistantId}` : '';
      const res = await api.get(`/calls/analytics?days=${days}${assistantParam}`);
      return res.data;
    },
    enabled: !!user && !!selectedAssistantId,
  });

  const { data: recentCalls } = useQuery<Call[]>({
    queryKey: ['recent-calls', user?.id, selectedAssistantId],
    queryFn: async () => {
      const assistantParam = selectedAssistantId && selectedAssistantId !== 'all' ? `?assistantId=${selectedAssistantId}` : '';
      const res = await api.get(`/calls${assistantParam}`);
      return res.data;
    },
    enabled: !!user && !!selectedAssistantId,
  });

  // Fetch appointment stats
  const { data: appointmentStats } = useQuery({
    queryKey: ['appointment-stats-dashboard', user?.id, dateFilter],
    queryFn: async () => {
      const days = filterToDays(dateFilter);
      const daysParam = days ? `?days=${days}` : '';
      console.log(`[Frontend] Fetching appointment stats with dateFilter="${dateFilter}", days=${days}, URL: /appointments/stats/overview${daysParam}`);
      const res = await api.get(`/appointments/stats/overview${daysParam}`);
      console.log('[Frontend] Appointment stats received:', res.data.stats);
      return res.data.stats;
    },
    enabled: !!user,
  });

  // Filter recent calls by date filter to respect user's date access permissions
  // Assistant filtering is now handled by the API query
  const filteredRecentCalls = filterCallsByDate(recentCalls || [], dateFilter);

  if (!user) return null;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const pieData = analytics ? [
    { name: 'Completed', value: analytics.statusBreakdown.completed },
    { name: 'Agent Transfer', value: analytics.statusBreakdown.transferred },
    { name: 'Failed', value: analytics.statusBreakdown.failed },
  ] : [];

  const hasCallStatusData = pieData.some(item => item.value > 0);
  const hasTrendData = (analytics?.trendData || []).length > 0;

  return (
    <DashboardLayout
      userRole={UserRole.CLIENT}
      user={user}
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
      showDateFilter={true}
      selectedAssistantId={selectedAssistantId}
      onAssistantChange={setSelectedAssistantId}
      showAssistantSelector={true}
    >
      {/* Welcome message */}
      <div className="mb-10 mt-4">
        <h1 className="text-3xl font-extrabold text-main">
          Welcome, <span className="text-gradient-primary-horizontal">{user.name.split(' ')[0]}</span>.
        </h1>
        <p className="text-sm text-base mt-2">
         {/* AI Agent Call Overview for <span className="text-gradient-primary-horizontal font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span> */}
         AI Agent Interaction & Performance Analytics.....
        </p>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">Call Volume</span>
              <div className="p-2 rounded-pill" style={{background: 'var(--color-primary-light)'}}>
                <Phone className="h-4 w-4" style={{color: 'var(--color-primary)'}} />
              </div>
            </div>
            <div className="stat-value">{stats?.totalCalls || 0}</div>
          </div>

          <ProtectedComponent componentId="billable_minutes">
            <BillableMinutesDisplay userId={user.id} dateFilter={dateFilter} />
          </ProtectedComponent>

          <ProtectedComponent componentId="live_calls">
            <LiveCallsCard userId={user.id} />
          </ProtectedComponent>

          <ProtectedComponent componentId="monthly_plan">
            <MonthlyPlanUsage userId={user.id} variant="card" />
          </ProtectedComponent>
        </div>

        {/* Appointment Calendar Cards - Slim & Sleek Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Confirmed Appointments */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border-l-[6px] border-l-green-700 pl-5 pr-6 py-3.5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}></rect>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2}></line>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2}></line>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}></line>
                    <path d="M8 14l2 2 4-4" strokeWidth={2}></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Confirmed</p>
                  <p className="text-xs text-gray-500">Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-green-800">{appointmentStats?.confirmed || 0}</span>
              </div>
            </div>
          </div>

          {/* Rescheduled Appointments */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-50 to-amber-50 border-l-[6px] border-l-orange-600 pl-5 pr-6 py-3.5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}></rect>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2}></line>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2}></line>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}></line>
                    <path d="M12 14a2 2 0 100-4 2 2 0 000 4z" strokeWidth={2}></path>
                    <path d="M12 14v4" strokeWidth={2}></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Rescheduled</p>
                  <p className="text-xs text-gray-500">Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-orange-700">{appointmentStats?.scheduled || 0}</span>
              </div>
            </div>
          </div>

          {/* Cancelled Appointments */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-50 to-rose-50 border-l-[6px] border-l-red-700 pl-5 pr-6 py-3.5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}></rect>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2}></line>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2}></line>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}></line>
                    <line x1="9" y1="14" x2="15" y2="18" strokeWidth={2}></line>
                    <line x1="15" y1="14" x2="9" y2="18" strokeWidth={2}></line>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Cancelled</p>
                  <p className="text-xs text-gray-500">Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-red-800">{appointmentStats?.cancelled || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - Responsive Grid */}
        <div className="mb-6">
          {/* Removed Call Analytics heading as requested */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Call Outcomes - Wider to match metric boxes */}
          <ProtectedComponent componentId="call_distribution">
            <div className="bg-card rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[350px] lg:col-span-2">
              <div className="px-6 pt-5 pb-2">
                <h3 className="text-base font-semibold text-foreground">Call Outcomes</h3>
              </div>
            <div className="flex flex-col items-center justify-center flex-1 px-4 pb-4">
              {hasCallStatusData ? (
                <>
                  {/* Donut Chart */}
                  <div className="relative w-56 h-56 flex-shrink-0 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="85%"
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value) => [`${value} calls`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend below chart - Single row */}
                  <div className="w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {entry.name}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-3">
                    <PieChartIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No Call Data</h3>
                  <p className="text-xs text-gray-500">
                    Call status will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
          </ProtectedComponent>

          {/* Volume Trend - Modern gradient area chart */}
          <ProtectedComponent componentId="call_trends">
            <div className="bg-card rounded-3xl shadow-sm flex flex-col lg:col-span-3 min-h-[350px]">
            <div className="px-6 pt-5 pb-2">
              <h3 className="text-base font-semibold text-foreground">Call Volume Trend</h3>
            </div>
            <div className="pb-4 px-6 flex-1 flex items-center justify-center">
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={analytics?.trendData || []} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B52FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#5B52FF" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={(() => {
                        const shownMonths = new Set<string>();

                        return (props: any) => {
                          const { x, y, payload, index } = props;
                          const date = new Date(payload.value);
                          const day = date.getDate();
                          const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                          const year = date.getFullYear();
                          const monthYear = `${year}-${date.getMonth()}`;

                          let label = `${day}`;
                          let showMonthLabel = false;

                          // Always show month for first tick
                          if (index === 0) {
                            showMonthLabel = true;
                            shownMonths.add(monthYear);
                          } else if (!shownMonths.has(monthYear)) {
                            // This is the first time we're showing this month
                            showMonthLabel = true;
                            shownMonths.add(monthYear);
                          }

                          // Format label
                          if (showMonthLabel) {
                            label = index === 0 ? `${day} ${month}` : `1 ${month}`;
                          }

                          return (
                            <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill="#888">
                              {label}
                            </text>
                          );
                        };
                      })()}
                      height={30}
                      interval={
                        dateFilter === 'today' ? 0 :
                        dateFilter === '7' ? 0 :
                        dateFilter === '15' ? 1 :
                        dateFilter === '30' ? 2 :
                        'preserveStartEnd'
                      }
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#888' }}
                      width={35}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                      labelStyle={{ fontWeight: '600', marginBottom: '4px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="#5B52FF"
                      strokeWidth={2}
                      fill="url(#colorCalls)"
                      fillOpacity={1}
                      dot={false}
                      activeDot={{ r: 4, fill: '#5B52FF', strokeWidth: 2, stroke: '#fff' }}
                      name="Calls"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center px-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No Trend Data</h3>
                  <p className="text-xs text-gray-500">
                    Call trends will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
          </ProtectedComponent>
        </div>
        </div>

        <ProtectedComponent componentId="recent_calls">
          <div className="bg-card rounded-3xl shadow-sm">
          <div className="px-6 pt-6 pb-3">
            <h3 className="text-xl font-bold text-foreground">Latest Call Activity</h3>
          </div>
          <div className="px-6 pb-6">
            <CallsTable
              calls={[...(filteredRecentCalls ?? [])].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 10)}
              onViewDetails={(call) => {
                setSelectedCall(call);
                setIsDetailsOpen(true);
              }}
              emptyMessage="No recent calls found"
            />
          </div>
        </div>
        </ProtectedComponent>

      <CallDetailsPanel
        selectedCall={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        calls={filteredRecentCalls}
        onNavigate={setSelectedCall}
      />
    </DashboardLayout>
  );
}
