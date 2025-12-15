// src/calls/calls.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, userRole: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: CallStatus;
    assistantId?: string;
  }) {
    const where: any = {};

    // Tenant isolation: clients can only see their own calls
    if (userRole === 'CLIENT') {
      where.userId = userId;

      // Filter by currently assigned assistants only
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { vapiAssistants: true },
      });

      if (user?.vapiAssistants && Array.isArray(user.vapiAssistants)) {
        const assignedAssistantIds = user.vapiAssistants.map((a: any) => a.id);

        // If a specific assistant is requested, filter by that assistant (if they have access to it)
        if (filters?.assistantId && assignedAssistantIds.includes(filters.assistantId)) {
          where.assistantId = filters.assistantId;
        } else if (!filters?.assistantId && assignedAssistantIds.length > 0) {
          // If no specific assistant, show all assigned assistants
          where.assistantId = { in: assignedAssistantIds };
        }
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.startTime = {};
      if (filters.startDate) where.startTime.gte = filters.startDate;
      if (filters.endDate) where.startTime.lte = filters.endDate;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.call.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const call = await this.prisma.call.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Tenant isolation
    if (userRole === 'CLIENT' && call.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return call;
  }

  async getRecentCalls(userId: string, limit: number = 10) {
    // Get user's assigned assistants
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { vapiAssistants: true },
    });

    const where: any = { userId };

    // Filter by assigned assistants
    if (user?.vapiAssistants && Array.isArray(user.vapiAssistants)) {
      const assignedAssistantIds = user.vapiAssistants.map((a: any) => a.id);
      if (assignedAssistantIds.length > 0) {
        where.assistantId = { in: assignedAssistantIds };
      }
    }

    return this.prisma.call.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  async getCallAnalytics(userId: string, days: number = 30, assistantId?: string) {
    const now = new Date();
    const hasRange = typeof days === 'number' && days > 0;
    const startDate = hasRange ? new Date(now) : undefined;
    if (hasRange) {
      startDate.setDate(now.getDate() - days);
    }

    // Get user's assigned assistants
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { vapiAssistants: true },
    });

    const where: any = {
      userId,
      ...(hasRange ? { startTime: { gte: startDate! } } : {}),
    };

    // Filter by assigned assistants
    if (user?.vapiAssistants && Array.isArray(user.vapiAssistants)) {
      const assignedAssistantIds = user.vapiAssistants.map((a: any) => a.id);

      // If a specific assistant is requested, filter by that assistant (if they have access to it)
      if (assistantId && assignedAssistantIds.includes(assistantId)) {
        where.assistantId = assistantId;
      } else if (!assistantId && assignedAssistantIds.length > 0) {
        // If no specific assistant, show all assigned assistants
        where.assistantId = { in: assignedAssistantIds };
      }
    }

    const calls = await this.prisma.call.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    // Adaptive bucketing for trend chart
    // daily for ≤90 days, weekly for ≤365, monthly beyond that (or when no range provided)
    const bucket: 'daily' | 'weekly' | 'monthly' = !hasRange
      ? 'monthly'
      : days <= 90
        ? 'daily'
        : days <= 365
          ? 'weekly'
          : 'monthly';

    const toStartOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const toStartOfWeek = (d: Date) => {
      // Monday as start of week
      const x = toStartOfDay(d);
      const day = x.getDay(); // 0..6 (Sun..Sat)
      const diff = (day + 6) % 7; // 0 for Monday
      x.setDate(x.getDate() - diff);
      return x;
    };
    const toStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

    type BucketItem = { count: number; sortKey: number };
    const buckets = new Map<string, BucketItem>();

    for (const call of calls) {
      const dt = new Date(call.startTime);
      let key: string;
      let sortDate: Date;
      if (bucket === 'daily') {
        sortDate = toStartOfDay(dt);
        key = sortDate.toISOString().split('T')[0];
      } else if (bucket === 'weekly') {
        sortDate = toStartOfWeek(dt);
        key = sortDate.toISOString().split('T')[0]; // label with week start date
      } else {
        // Monthly bucket
        sortDate = toStartOfMonth(dt);
        const y = sortDate.getFullYear().toString();
        const m = String(sortDate.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`;
      }

      const prev = buckets.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        buckets.set(key, { count: 1, sortKey: sortDate.getTime() });
      }
    }

    let trendData = Array.from(buckets.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([date, info]) => ({ date, calls: info.count }));

    // Fill in missing dates with zero values for daily bucket
    if (bucket === 'daily' && hasRange && trendData.length > 0) {
      const filledData: { date: string; calls: number }[] = [];
      const endDate = toStartOfDay(now);
      let currentDate = new Date(startDate);
      currentDate = toStartOfDay(currentDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existing = trendData.find(d => d.date === dateStr);
        filledData.push({
          date: dateStr,
          calls: existing ? existing.calls : 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      trendData = filledData;
    }

    // Call status breakdown
    const statusBreakdown = {
      completed: calls.filter(c => c.status === 'COMPLETED').length,
      transferred: calls.filter(c => c.status === 'TRANSFERRED').length,
      failed: calls.filter(c => c.status === 'FAILED').length,
    };

    return {
      trendData,
      statusBreakdown,
      totalCalls: calls.length,
    };
  }

  async syncFromVapi(userId: string, vapiCalls: any[]) {
    const created = [];
    const updated = [];

    for (const vapiCall of vapiCalls) {
      try {
        const existing = await this.prisma.call.findUnique({
          where: { callId: vapiCall.id },
        });

        // Map VAPI call status to our CallStatus enum
        let status: CallStatus = 'COMPLETED';
        if (vapiCall.status === 'ended') {
          status = 'COMPLETED';
        } else if (vapiCall.status === 'forwarding-phone-call') {
          status = 'TRANSFERRED';
        } else if (vapiCall.endedReason === 'assistant-error' || vapiCall.endedReason === 'pipeline-error-openai-voice-failed') {
          status = 'FAILED';
        } else if (vapiCall.status === 'in-progress' || vapiCall.status === 'ringing') {
          status = 'ACTIVE';
        }

        // Calculate duration from start and end times if not provided
        let duration = 0;
        if (vapiCall.startedAt && vapiCall.endedAt) {
          const start = new Date(vapiCall.startedAt);
          const end = new Date(vapiCall.endedAt);
          duration = Math.floor((end.getTime() - start.getTime()) / 1000); // Convert to seconds
        } else if (vapiCall.duration) {
          duration = vapiCall.duration;
        }

        // Helper function to extract phone number from SIP URI
        const extractNumberFromSipUri = (value: string): string => {
          if (!value || typeof value !== 'string') return value;

          // Check if it's a SIP URI format (sip:NUMBER@...)
          if (value.toLowerCase().includes('sip:') && value.includes('@')) {
            const match = value.match(/sip:([^@]+)@/i);
            if (match && match[1]) {
              return match[1];
            }
          }

          return value;
        };

        // Extract customer phone from various possible fields and clean SIP URIs
        let customerPhone = vapiCall.customer?.number ||
                           vapiCall.customer?.phoneNumber ||
                           vapiCall.customer?.sipUri ||
                           vapiCall.phoneNumber ||
                           vapiCall.toNumber ||
                           'Unknown';

        // Clean SIP URI if present
        customerPhone = extractNumberFromSipUri(customerPhone);

        // Extract call type from VAPI data
        const callType = vapiCall.type || null; // inbound, outbound, or web

        // Calculate cost based on duration and user's rate
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { pricePerMinute: true },
        });
        const minutes = Math.ceil(duration / 60);
        const cost = minutes * (user?.pricePerMinute || 0);

        const callData = {
          userId,
          callId: vapiCall.id,
          assistantId: vapiCall.assistantId || null,
          customerPhone,
          type: callType,
          status,
          duration,
          cost,
          startTime: vapiCall.startedAt ? new Date(vapiCall.startedAt) : new Date(),
          endTime: vapiCall.endedAt ? new Date(vapiCall.endedAt) : null,
          endReason: vapiCall.endedReason || null,
          transcript: vapiCall.transcript || null,
          summary: vapiCall.summary || null,
          recordingUrl: vapiCall.recordingUrl || vapiCall.recordingUrl || null,
          isSuccessful: status === 'COMPLETED' || status === 'TRANSFERRED',
          transferredTo: vapiCall.forwardedPhoneNumber || null,
        };

        if (existing) {
          // Update existing call
          const call = await this.prisma.call.update({
            where: { callId: vapiCall.id },
            data: callData,
          });
          updated.push(call);
        } else {
          // Create new call
          const call = await this.prisma.call.create({
            data: callData,
          });
          created.push(call);
        }
      } catch (error) {
        console.error(`Error syncing call ${vapiCall.id}:`, error.message);
      }
    }

    return {
      synced: created.length + updated.length,
      created: created.length,
      updated: updated.length,
      calls: [...created, ...updated]
    };
  }
}
