import React from 'react';
import { PhoneIncoming, PhoneOutgoing, Globe, HelpCircle } from 'lucide-react';

export type CallType = 'inbound' | 'outbound' | 'web' | 'unknown';

interface CallTypeBadgeProps {
  type: string | null | undefined;
  className?: string;
}

export function getCallType(typeString: string | null | undefined): CallType {
  if (!typeString) return 'unknown';
  const lower = typeString.toLowerCase();
  if (lower.includes('inbound')) return 'inbound';
  if (lower.includes('outbound')) return 'outbound';
  if (lower.includes('web')) return 'web';
  return 'unknown';
}

export function getCallTypeLabel(callType: CallType): string {
  switch (callType) {
    case 'inbound': return 'Inbound';
    case 'outbound': return 'Outbound';
    case 'web': return 'Web';
    default: return 'Unknown';
  }
}

export function getCallTypeIconColor(callType: CallType): string {
  switch (callType) {
    case 'inbound':
      return 'text-green-600';
    case 'outbound':
      return 'text-blue-600';
    case 'web':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

export function CallTypeBadge({ type, className = '' }: CallTypeBadgeProps) {
  const callType = getCallType(type);
  const label = getCallTypeLabel(callType);
  const iconColor = getCallTypeIconColor(callType);

  const icon = (() => {
    switch (callType) {
      case 'inbound':
        return <PhoneIncoming className={`h-3.5 w-3.5 ${iconColor}`} />;
      case 'outbound':
        return <PhoneOutgoing className={`h-3.5 w-3.5 ${iconColor}`} />;
      case 'web':
        return <Globe className={`h-3.5 w-3.5 ${iconColor}`} />;
      default:
        return <HelpCircle className={`h-3.5 w-3.5 ${iconColor}`} />;
    }
  })();

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-normal text-gray-900 ${className}`}>
      {icon}
      {label}
    </span>
  );
}
