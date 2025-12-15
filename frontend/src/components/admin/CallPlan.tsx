'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Clock, TrendingUp, Calendar } from 'lucide-react';
import { ModernSelect } from '@/components/common/ModernSelect';

interface User {
  id: string;
  name: string;
  companyName?: string;
  pricePerMinute?: number;
  monthlyCharge?: number;
  billingCycle?: string;
  includedMinutes?: number;
  overageRate?: number;
  billingResetDay?: number;
}

interface CallPlanProps {
  user: User;
  onUpdate: () => void;
}

interface CallPlanData {
  includedMinutes: number;        // Minutes included in the plan (e.g., 50)
  monthlyFee: number;              // Fixed monthly fee (e.g., $20)
  overageRate: number;             // Price per minute after included minutes (e.g., $0.10)
  billingCycle: string;            // monthly, custom
  billingResetDay: number;         // 1-31, or special: first, 15th, last
}

export function CallPlan({ user, onUpdate }: CallPlanProps) {
  const { toast } = useToast();

  const [planData, setPlanData] = useState<CallPlanData>({
    includedMinutes: user.includedMinutes || 50,
    monthlyFee: user.monthlyCharge || 20.00,
    overageRate: user.overageRate || user.pricePerMinute || 0.10,
    billingCycle: user.billingCycle || 'monthly',
    billingResetDay: user.billingResetDay || 1,
  });

  useEffect(() => {
    setPlanData({
      includedMinutes: user.includedMinutes || 50,
      monthlyFee: user.monthlyCharge || 20.00,
      overageRate: user.overageRate || user.pricePerMinute || 0.10,
      billingCycle: user.billingCycle || 'monthly',
      billingResetDay: user.billingResetDay || 1,
    });
  }, [user]);

  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/users/${user.id}`, {
        includedMinutes: planData.includedMinutes,
        monthlyCharge: planData.monthlyFee,
        overageRate: planData.overageRate,
        billingCycle: planData.billingCycle,
        billingResetDay: planData.billingResetDay,
        // Keep pricePerMinute for backward compatibility
        pricePerMinute: planData.overageRate,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Call plan updated successfully',
      });
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update call plan',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updatePlanMutation.mutate();
  };

  const getResetDayDisplay = () => {
    if (planData.billingResetDay === 1) return '1st of every month';
    if (planData.billingResetDay === 15) return '15th of every month';
    if (planData.billingResetDay === 32) return 'Last day of month';
    return `${planData.billingResetDay}${getOrdinalSuffix(planData.billingResetDay)} of every month`;
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm md:text-base text-foreground">Call Plan Configuration for {user.companyName || user.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">Set included minutes, monthly fee, overage rates, and billing cycle</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Monthly Fee */}
            <div className="space-y-2">
              <Label htmlFor="monthly-fee" className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Monthly Fee ($)
              </Label>
              <Input
                id="monthly-fee"
                type="number"
                step="0.01"
                min="0"
                value={planData.monthlyFee}
                onChange={(e) =>
                  setPlanData({ ...planData, monthlyFee: parseFloat(e.target.value) || 0 })
                }
                className="h-10 rounded-pill"
              />
              <p className="text-xs text-muted-foreground">
                Fixed fee customer pays per month
              </p>
            </div>

            {/* Included Minutes */}
            <div className="space-y-2">
              <Label htmlFor="included-minutes" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Included Minutes
              </Label>
              <Input
                id="included-minutes"
                type="number"
                min="0"
                value={planData.includedMinutes}
                onChange={(e) =>
                  setPlanData({ ...planData, includedMinutes: parseInt(e.target.value) || 0 })
                }
                className="h-10 rounded-pill"
              />
              <p className="text-xs text-muted-foreground">
                Free minutes included with monthly fee
              </p>
            </div>

            {/* Overage Rate */}
            <div className="space-y-2">
              <Label htmlFor="overage-rate" className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Overage Rate ($/min)
              </Label>
              <Input
                id="overage-rate"
                type="number"
                step="0.001"
                min="0"
                value={planData.overageRate}
                onChange={(e) =>
                  setPlanData({ ...planData, overageRate: parseFloat(e.target.value) || 0 })
                }
                className="h-10 rounded-pill"
              />
              <p className="text-xs text-muted-foreground">
                Price per minute after included minutes are consumed
              </p>
            </div>

            {/* Billing Reset Day */}
            <div className="space-y-2">
              <Label htmlFor="reset-day" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Usage Reset Day
              </Label>
              <ModernSelect
                value={planData.billingResetDay.toString()}
                onChange={(value) => setPlanData({ ...planData, billingResetDay: parseInt(value) })}
                options={[
                  { value: '1', label: '1st of every month' },
                  { value: '15', label: '15th of every month' },
                  { value: '32', label: 'Last day of month' },
                  { value: '5', label: '5th of every month' },
                  { value: '10', label: '10th of every month' },
                  { value: '20', label: '20th of every month' },
                  { value: '25', label: '25th of every month' }
                ]}
                placeholder="Select reset day"
              />
              <p className="text-xs text-muted-foreground">
                Day when usage counter resets each month
              </p>
            </div>
          </div>

          {/* Usage Reset Info */}
          <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-blue-50 to-primary/5 rounded-card border border-border">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Usage resets on {getResetDayDisplay()}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={updatePlanMutation.isPending}
              className="h-10 px-6 bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90 rounded-pill"
            >
              {updatePlanMutation.isPending ? 'Saving...' : 'Save Call Plan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm md:text-base text-foreground">Plan Summary</h3>
          <p className="text-xs text-muted-foreground mt-1">Quick overview of the billing structure</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-card border border-primary/20">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Monthly Fee</p>
                <p className="text-lg font-bold text-foreground">${planData.monthlyFee.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-card border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Included Minutes</p>
                <p className="text-lg font-bold text-foreground">{planData.includedMinutes} min</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-card border border-green-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Overage Rate</p>
                <p className="text-lg font-bold text-foreground">${planData.overageRate.toFixed(3)}/min</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-card border border-orange-200">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Resets On</p>
                <p className="text-sm font-bold text-foreground leading-tight">
                  {planData.billingResetDay === 1 ? '1st' : planData.billingResetDay === 15 ? '15th' : planData.billingResetDay === 32 ? 'Last day' : `${planData.billingResetDay}${getOrdinalSuffix(planData.billingResetDay)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-card border border-border">
            <p className="text-xs md:text-sm text-foreground">
              <span className="font-semibold">Plan Structure:</span> Customer pays <span className="font-bold text-primary">${planData.monthlyFee.toFixed(2)}/month</span> which includes <span className="font-bold text-primary">{planData.includedMinutes} minutes</span>. Any usage beyond the included minutes is billed at <span className="font-bold text-primary">${planData.overageRate.toFixed(3)}/minute</span>. Usage counter resets on the <span className="font-bold text-primary">{getResetDayDisplay().toLowerCase()}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
