import { Call } from '@/types';

/**
 * Calculate billable minutes for a single call
 * Industry standard: Round up to nearest minute
 */
export function calculateCallBillableMinutes(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 60);
}

/**
 * Calculate total billable minutes for multiple calls
 * Rounds up each call individually, then sums
 */
export function calculateTotalBillableMinutes(calls: Call[]): number {
  return calls.reduce((sum, call) => sum + calculateCallBillableMinutes(call.duration), 0);
}

/**
 * Format billing period for display
 */
export function formatBillingPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(used: number, included: number): number {
  if (included === 0) return 0;
  return Math.min(Math.round((used / included) * 100), 100);
}

/**
 * Get usage status color
 */
export function getUsageStatus(percentage: number): 'success' | 'warning' | 'danger' {
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'danger';
}

/**
 * Format minutes for display
 */
export function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString()} min`;
}

/**
 * Calculate overage minutes
 */
export function calculateOverageMinutes(used: number, included: number): number {
  return Math.max(0, used - included);
}

/**
 * Calculate overage cost
 */
export function calculateOverageCost(overageMinutes: number, overageRate: number): number {
  return overageMinutes * overageRate;
}
