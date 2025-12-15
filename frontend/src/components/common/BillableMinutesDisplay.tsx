import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { UserStats } from '@/types';
import { filterToDays } from '@/lib/dateFilters';

interface BillableMinutesDisplayProps {
  userId: string;
  dateFilter: string;
  className?: string;
}

export function BillableMinutesDisplay({ userId, dateFilter, className = '' }: BillableMinutesDisplayProps) {
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ['user-stats', userId, dateFilter],
    queryFn: async () => {
      const daysParam = filterToDays(dateFilter);
      const res = await api.get(`/users/stats/${userId}?days=${daysParam}`);
      return res.data;
    },
    enabled: !!userId,
  });

  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">Billable Duration</span>
        <div className="p-2 rounded-pill" style={{background: 'var(--color-primary-light)'}}>
          <Clock className="h-4 w-4" style={{color: 'var(--color-primary)'}} />
        </div>
      </div>
      <div className="stat-value">
        {isLoading ? '...' : (stats?.billableMinutes || 0)}
      </div>
    </div>
  );
}
