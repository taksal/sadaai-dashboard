export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export enum CallStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TRANSFERRED = 'TRANSFERRED',
  ACTIVE = 'ACTIVE',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  pricePerMinute?: number;
  monthlyCharge?: number;
  billingCycle?: string;
  vapiAssistantId?: string;
  vapiAssistants?: Array<{ id: string; name: string }>;
  appAccess?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBill {
  billableMinutes: number;
  includedMinutes: number;
  overageMinutes: number;
  overageRate: number;
  monthlyCharge: number;
  overageCharge: number;
  totalMonthlyBill: number;
  billingResetDay: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface Call {
  id: string;
  userId: string;
  callId: string;
  assistantId?: string;
  customerPhone: string;
  type?: string; // inbound, outbound, web
  status: CallStatus;
  duration: number;
  cost: number;
  startTime: string;
  endTime?: string;
  endReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  isSuccessful: boolean;
  transferredTo?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Appointment {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface UserStats {
  totalCalls: number;
  totalDuration: number;
  billableMinutes: number;
  totalCost: number;
  monthlyCharge: number;
  pricePerMinute: number;
  // Billing plan details
  includedMinutes: number;
  overageRate: number;
  billingResetDay: number;
  overageMinutes: number;
  overageCharge: number;
  totalMonthlyBill: number;
  callBreakdown: {
    successful: number;
    transferred: number;
    failed: number;
  };
}

export interface CallAnalytics {
  trendData: { date: string; calls: number }[];
  statusBreakdown: {
    completed: number;
    transferred: number;
    failed: number;
  };
  totalCalls: number;
}
