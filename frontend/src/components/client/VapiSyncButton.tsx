'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export function VapiSyncButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/calls/sync');
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync Successful',
        description: `Synced ${data.synced} calls (${data.created} new, ${data.updated} updated)`,
      });

      // Refresh all call-related queries
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['call-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['all-calls'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.response?.data?.message || 'Failed to sync calls from VAPI',
        variant: 'destructive',
      });
    },
  });

  return (
    <Button
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
      variant="secondary"
      size="sm"
      className="h-9 px-3 text-xs font-medium"
    >
      {syncMutation.isPending ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </>
      )}
    </Button>
  );
}
