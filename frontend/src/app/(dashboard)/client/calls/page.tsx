'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole, Call } from '@/types';
import { CallDetailsPanel } from '@/components/client/CallDetailsPanel';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CallsTable } from '@/components/common/CallsTable';
import { useAuthUser } from '@/hooks/useAuthUser';
import { filterCallsByDate } from '@/lib/dateFilters';

// Get maximum allowed date filter based on user permissions
const getMaxAllowedDateFilter = (appAccess: string[] = []): string => {
  if (appAccess.includes('date_filter_all_time')) return 'all';
  if (appAccess.includes('date_filter_30_days')) return '30';
  if (appAccess.includes('date_filter_15_days')) return '15';
  if (appAccess.includes('date_filter_7_days')) return '7';
  return '7'; // Default to 7 days (free tier)
};

export default function ClientCallsPage() {
  const { user, isLoading } = useAuthUser({ requiredRole: UserRole.CLIENT });
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7'); // Initialize with default

  // Update date filter when user loads or appAccess changes
  useEffect(() => {
    if (user?.appAccess) {
      const maxAllowedFilter = getMaxAllowedDateFilter(user.appAccess);
      setDateFilter(maxAllowedFilter);
    }
  }, [user?.appAccess]);

  const { data: calls, isLoading: isLoadingCalls } = useQuery<Call[]>({
    queryKey: ['all-calls', user?.id],
    queryFn: async () => {
      const res = await api.get('/calls');
      return res.data;
    },
    enabled: !!user,
  });

  let filteredCalls = filterCallsByDate(calls || [], dateFilter);
  filteredCalls = filteredCalls.filter((call) => {
    const matchesSearch = call.customerPhone.includes(searchTerm) ||
                         call.callId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetails = (call: Call) => {
    setSelectedCall(call);
    setIsDetailsOpen(true);
  };

  if (!user) return null;

  return (
    <DashboardLayout
      userRole={UserRole.CLIENT}
      user={user}
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
      showDateFilter={true}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by phone or call ID..."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Call History</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your call history
            </p>
          </div>
          <div className="text-sm text-muted-foreground mr-4">
            <span className="font-bold text-2xl text-foreground">{filteredCalls?.length || 0}</span> calls
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
          {isLoadingCalls ? (
            <div className="text-center py-8">Loading...</div>
          ) : calls?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Your assistant is not configured yet
              </p>
              <p className="text-sm text-muted-foreground">
                Please contact SADA Conversational AI to configure your assistant
              </p>
            </div>
          ) : (
            <CallsTable
              calls={filteredCalls}
              onViewDetails={handleViewDetails}
            />
          )}
        </CardContent>
      </Card>

      <CallDetailsPanel
        selectedCall={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        calls={filteredCalls}
        onNavigate={setSelectedCall}
      />
      </div>
    </DashboardLayout>
  );
}
