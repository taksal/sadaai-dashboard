'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneCall } from 'lucide-react';
import api from '@/lib/api';

interface LiveCallsCardProps {
  userId: string;
}

// Efficiently fetch active calls for user's assigned assistants
export function LiveCallsCard({ userId }: LiveCallsCardProps) {
  const { data, isLoading } = useQuery<number>({
    queryKey: ['live-calls', userId],
    queryFn: async () => {
      try {
        // Fetch assigned assistant IDs for user
        const userRes = await api.get(`/users/assistant-ids/${userId}`);
        const { assistantIds } = userRes.data;

        if (!assistantIds || assistantIds.length === 0) return 0;

        // Fetch active calls for those assistants from VAPI with user credentials
        const callsRes = await api.get(`/vapi/active-calls?assistantIds=${assistantIds.join(',')}&userId=${userId}`);
        const { activeCalls } = callsRes.data;

        return activeCalls || 0;
      } catch (error) {
        // Silently handle network errors - endpoint may not be available
        return 0;
      }
    },
    staleTime: 5000, // 5s cache for speed
    refetchInterval: 10000, // auto-refresh every 10s for real-time updates
    enabled: !!userId,
    retry: false, // Don't retry on network errors
  });

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">Active Calls</span>
        <div className="p-2 rounded-pill" style={{background: 'var(--color-primary-light)'}}>
          <PhoneCall className="h-4 w-4" style={{color: 'var(--color-primary)'}} />
        </div>
      </div>
      <div className="stat-value">
        {isLoading ? <span className="animate-pulse">...</span> : data || 0}
      </div>
    </div>
  );
}
