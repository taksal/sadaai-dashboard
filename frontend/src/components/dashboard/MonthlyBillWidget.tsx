'use client';

import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { MonthlyBill } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface MonthlyBillWidgetProps {
  userId: string;
}

export function MonthlyBillWidget({ userId }: MonthlyBillWidgetProps) {
  const { data: billing } = useQuery<MonthlyBill>({
    queryKey: ['monthly-bill', userId],
    queryFn: async () => {
      const res = await api.get(`/users/monthly-bill/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  if (!billing) return null;

  const usagePercent = Math.min((billing.billableMinutes / billing.includedMinutes) * 100, 100);
  const hasOverage = billing.overageMinutes > 0;
  const remainingMinutes = Math.max(0, billing.includedMinutes - billing.billableMinutes);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = () => {
    if (hasOverage) return 'bg-red-500';
    if (usagePercent >= 90) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gradient-primary-horizontal text-white border-0 rounded-3xl shadow-md p-4 flex flex-col justify-between w-[235px]">
      {/* Top: Subscription and Billing Period */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white">Subscription</span>
        <span className="text-[10px] text-white/80 font-medium">
          {formatDate(billing.billingPeriodStart)} - {formatDate(billing.billingPeriodEnd)}
        </span>
      </div>

      {/* Remaining Minutes - Inline with label */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <div className="text-3xl font-bold text-white leading-none">
          {hasOverage ? 0 : remainingMinutes}
        </div>
        <div className="text-[10px] text-white/80 font-medium pb-0.5">
          {hasOverage ? 'over limit' : 'remaining'}
        </div>
      </div>

      {/* Usage Stats - Compact */}
      <div className="text-[10px] text-white/90 mb-1.5">
        <span className="font-semibold">{billing.billableMinutes}</span> / {billing.includedMinutes} used
      </div>

      {/* Ultra-Slim Progress Bar with Color Status */}
      <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      {/* Overage Alert - Compact */}
      {hasOverage && (
        <div className="mt-2 text-[10px] text-white/90 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
          <AlertTriangle className="h-3 w-3" />
          <span>Overage: +{formatCurrency(billing.overageCharge)}</span>
        </div>
      )}
    </div>
  );
}
