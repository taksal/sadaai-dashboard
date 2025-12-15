'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { MonthlyBill } from '@/types';
import { DollarSign } from 'lucide-react';

interface MonthlyBillMiniCardProps {
  userId: string;
  className?: string;
}

export function MonthlyBillMiniCard({ userId, className }: MonthlyBillMiniCardProps) {
  const { data: billing, isLoading } = useQuery<MonthlyBill>({
    queryKey: ['monthly-bill', userId],
    queryFn: async () => {
      const res = await api.get(`/users/monthly-bill/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  if (isLoading || !billing) {
    return (
  <Card className={`bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white ${className ?? ''}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Subscription</CardTitle>
          <DollarSign className="h-4 w-4 text-white" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-8 bg-gray-700 rounded w-2/3 mx-auto mb-2" />
        </CardContent>
      </Card>
    );
  }

  const hasOverage = billing.overageMinutes > 0;

  return (
  <Card className={`bg-gradient-to-r from-[#A5CC82] to-[#00467F] text-white ${className ?? ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-black">Subscription</CardTitle>
        <DollarSign className="h-4 w-4 text-white" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-white">{formatCurrency(billing.totalMonthlyBill)}</div>
        {hasOverage && (
          <div className="mt-2 text-xs font-semibold text-red-400">
            Overage: +{formatCurrency(billing.overageCharge)} for {billing.overageMinutes} min
          </div>
        )}
      </CardContent>
    </Card>
  );
}
