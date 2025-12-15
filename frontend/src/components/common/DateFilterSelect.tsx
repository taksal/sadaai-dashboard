import React from 'react';
import { ModernSelect } from './ModernSelect';

interface DateFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  includeToday?: boolean;
  appAccess?: string[];
}

export function DateFilterSelect({
  value,
  onChange,
  className = '',
  includeToday = true,
  appAccess = []
}: DateFilterSelectProps) {
  // Map app access permissions to available options
  const allOptions = [
    ...(includeToday ? [{ value: 'today', label: 'Today' }] : []),
    { value: '7', label: 'Last 7 days', permission: 'date_filter_7_days' },
    { value: '15', label: 'Last 15 days', permission: 'date_filter_15_days' },
    { value: '30', label: 'Last 30 days', permission: 'date_filter_30_days' },
    { value: 'all', label: 'All time', permission: 'date_filter_all_time' }
  ];

  // Filter options based on app access permissions
  // If no appAccess provided or empty, show all options (for admin/backward compatibility)
  const options = appAccess.length > 0
    ? allOptions.filter(option =>
        !option.permission || appAccess.includes(option.permission)
      )
    : allOptions;

  return (
    <ModernSelect
      value={value}
      onChange={onChange}
      options={options.map(({ value, label }) => ({ value, label }))}
      className={className}
      placeholder="Select period"
    />
  );
}
