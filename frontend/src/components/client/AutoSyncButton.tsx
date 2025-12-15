'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface AutoSyncButtonProps {
  onSyncComplete?: () => void;
}

export function AutoSyncButton({ onSyncComplete }: AutoSyncButtonProps) {
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const queryClient = useQueryClient();

  const syncCalls = async () => {
    try {
      setIsSyncing(true);
      await api.post('/calls/sync');
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['call-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
      onSyncComplete?.();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isAutoSync) {
      setCountdown(30);
      return;
    }

    // Sync immediately when turned on
    syncCalls();

    // Set up auto-sync timer (every 30 seconds)
    const interval = setInterval(() => {
      syncCalls();
      setCountdown(30);
    }, 30000);

    // Countdown timer (every second)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [isAutoSync]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isAutoSync ? 'default' : 'secondary'}
        size="sm"
        onClick={() => setIsAutoSync(!isAutoSync)}
        disabled={isSyncing}
        className="h-9 px-3 text-xs font-medium"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
        {isAutoSync ? `Auto Refresh (${countdown}s)` : 'Auto Refresh OFF'}
      </Button>
    </div>
  );
}
