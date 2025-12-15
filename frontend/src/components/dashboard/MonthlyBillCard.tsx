'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { MonthlyBill } from '@/types';

interface MonthlyBillCardProps {
  userId: string;
}

export function MonthlyBillCard({ userId }: MonthlyBillCardProps) {
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
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Loading billing information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billing) {
    return null;
  }

  const usagePercentage = billing.includedMinutes > 0
    ? Math.min((billing.billableMinutes / billing.includedMinutes) * 100, 100)
    : 0;

  const hasOverage = billing.overageMinutes > 0;

  // Format billing period dates
  const startDate = new Date(billing.billingPeriodStart);
  const endDate = new Date(billing.billingPeriodEnd);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Status</CardTitle>
        <CardDescription>
          Billing Period: {formatDate(startDate)} - {formatDate(endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Monthly Charge */}
        <div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
            <span>Base Monthly Fee</span>
            <span>{formatCurrency(billing.monthlyCharge)}</span>
          </div>
        </div>

        {/* Included Minutes Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Included Minutes</span>
            <span className="font-medium">
              {billing.billableMinutes} / {billing.includedMinutes} min
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                hasOverage ? 'bg-red-500' : usagePercentage >= 90 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          {usagePercentage >= 90 && !hasOverage && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Approaching limit
            </p>
          )}
        </div>

        {/* Overage Charges */}
        {hasOverage && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Overage ({billing.overageMinutes} min @ {formatCurrency(billing.overageRate)}/min)</span>
              <span className="text-red-600 font-medium">+{formatCurrency(billing.overageCharge)}</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              ⚠️ You have exceeded your included minutes
            </p>
          </div>
        )}

        {/* Total Monthly Bill */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(billing.totalMonthlyBill)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Resets on day {billing.billingResetDay} of each month
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
