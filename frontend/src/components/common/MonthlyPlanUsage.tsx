import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { formatBillingPeriod, calculateUsagePercentage, getUsageStatus, formatMinutes } from '@/lib/billing';

interface MonthlyBill {
  period: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  includedMinutes: number;
  billableMinutes: number;
  overageMinutes: number;
  monthlyCharge: number;
  overageCharge: number;
  totalMonthlyBill: number;
  overageRate: number;
}

interface MonthlyPlanUsageProps {
  userId: string;
  variant?: 'card' | 'mini' | 'compact';
  className?: string;
}

export function MonthlyPlanUsage({ userId, variant = 'card', className = '' }: MonthlyPlanUsageProps) {
  const { data: billing, isLoading } = useQuery<MonthlyBill>({
    queryKey: ['monthly-bill', userId],
    queryFn: async () => {
      const res = await api.get(`/users/monthly-bill/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!billing) {
    return null;
  }

  const usagePercentage = calculateUsagePercentage(billing.billableMinutes, billing.includedMinutes);
  const usageStatus = getUsageStatus(usagePercentage);
  const isOverage = billing.billableMinutes > billing.includedMinutes;

  // Color mapping
  const statusColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const statusTextColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  // Mini variant (compact card for sidebar/dashboard)
  if (variant === 'mini') {
    const remainingMinutes = Math.max(0, billing.includedMinutes - billing.billableMinutes);

    return (
      <Card className={`${className} bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-blue-100 dark:border-slate-700 w-[280px]`}>
         
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between mb-1">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subscription Status</CardTitle>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {formatBillingPeriod(billing.billingPeriodStart, billing.billingPeriodEnd)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-1">
          {/* Minutes remaining highlight */}
          <div className="mb-2">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isOverage ? 0 : remainingMinutes}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5">
              {isOverage ? 'minutes over limit' : 'remaining'}
            </div>
          </div>

          {/* Usage stats */}
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
            <span className="font-medium">{billing.billableMinutes}</span> / {billing.includedMinutes} used
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`${statusColors[usageStatus]} h-1.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Overage warning */}
          {isOverage && (
            <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>+{formatMinutes(billing.overageMinutes)} overage</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Compact variant (one-line widget)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`${statusColors[usageStatus]} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {billing.billableMinutes}/{billing.includedMinutes} min
          </span>
        </div>
        {isOverage && <AlertTriangle className="h-4 w-4 text-red-500" />}
      </div>
    );
  }

  // Full card variant (default) - Simple metric card with gradient
  return (
    <div className={`bg-gradient-primary-horizontal text-white border-0 rounded-3xl shadow-md p-6 flex flex-col justify-between min-h-[140px] ${className}`}>
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-xs font-medium text-white">Current Spend</h3>
        <div className="text-[10px] text-white/80">
          {formatBillingPeriod(billing.billingPeriodStart, billing.billingPeriodEnd)}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-4xl font-bold mb-1">${billing.totalMonthlyBill.toFixed(2)}</div>
        {isOverage && (
          <p className="text-[10px] text-white/90 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Includes ${billing.overageCharge.toFixed(2)} overage
          </p>
        )}
      </div>
    </div>
  );
}
