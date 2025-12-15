import { Call } from '@/types';

export type DateRange = 'today' | 'all' | string;

/**
 * Filter calls by date range
 * @param calls Array of calls to filter
 * @param range Date range string ('today', 'all', or number of days as string)
 * @returns Filtered array of calls
 */
export function filterCallsByDate(calls: Call[], range: DateRange): Call[] {
  if (range === 'all') return calls;

  const now = new Date();
  let startDate: Date;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(now.getDate() - parseInt(range));
  }

  return calls.filter(call => new Date(call.startTime) >= startDate);
}

/**
 * Convert date filter to days parameter for API calls
 * @param filter Date filter string
 * @returns Number of days (0 for 'all')
 */
export function filterToDays(filter: string): number {
  return filter === 'all' ? 0 : (filter === 'today' ? 1 : Number(filter));
}

/**
 * Get date range label for display
 * @param filter Date filter string
 * @returns Human-readable label
 */
export function getDateRangeLabel(filter: string): string {
  switch (filter) {
    case 'all':
      return 'All Time';
    case 'today':
      return 'Today';
    default:
      return `Last ${filter} Days`;
  }
}
