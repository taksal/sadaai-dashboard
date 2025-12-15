// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUserRole: UserRole) {
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Only admins can view all users');
    }

    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        role: true,
        isActive: true,
        pricePerMinute: true,
        monthlyCharge: true,
        billingCycle: true,
        includedMinutes: true,
        overageRate: true,
        billingResetDay: true,
        vapiAssistantId: true,
        vapiAssistants: true,
        vapiApiKey: true,
        vapiOrgId: true,
        appAccess: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    companyName?: string;
    role: UserRole;
    isActive?: boolean;
    pricePerMinute?: number;
    monthlyCharge?: number;
    appAccess?: string[];
    mustChangePassword?: boolean;
  }) {
    // Check if user already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        companyName: data.companyName,
        role: data.role,
        isActive: data.isActive !== undefined ? data.isActive : true,
        pricePerMinute: data.pricePerMinute || 0,
        monthlyCharge: data.monthlyCharge || 0,
        appAccess: data.appAccess || ['dashboard', 'calls'],
        mustChangePassword: data.mustChangePassword || false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        role: true,
        isActive: true,
        pricePerMinute: true,
        monthlyCharge: true,
        createdAt: true,
      },
    });

    // If client, set tenantId to user's own ID
    if (data.role === 'CLIENT') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tenantId: user.id },
      });
    }

    return user;
  }

  async update(id: string, data: {
    name?: string;
    email?: string;
    companyName?: string;
    isActive?: boolean;
    pricePerMinute?: number;
    monthlyCharge?: number;
    billingCycle?: string;
    includedMinutes?: number;
    overageRate?: number;
    billingResetDay?: number;
    vapiAssistantId?: string;
    vapiAssistants?: any;
    vapiApiKey?: string;
    vapiOrgId?: string;
    appAccess?: string[];
  }) {
    const user = await this.findOne(id);

    console.log('Updating user:', id);
    console.log('Update data:', JSON.stringify(data, null, 2));

    // If vapiAssistants is being updated, delete calls from removed assistants
    if (data.vapiAssistants !== undefined) {
      const oldAssistantIds = user.vapiAssistants && Array.isArray(user.vapiAssistants)
        ? user.vapiAssistants.map((a: any) => a.id)
        : [];

      const newAssistantIds = data.vapiAssistants && Array.isArray(data.vapiAssistants)
        ? data.vapiAssistants.map((a: any) => a.id)
        : [];

      // Find removed assistant IDs
      const removedAssistantIds = oldAssistantIds.filter(oldId => !newAssistantIds.includes(oldId));

      // Delete calls from removed assistants
      if (removedAssistantIds.length > 0) {
        const deletedCount = await this.prisma.call.deleteMany({
          where: {
            userId: id,
            // Only filter assistantId if it exists in the model
            ...(removedAssistantIds.length > 0 ? { assistantId: { in: removedAssistantIds } } : {}),
          },
        });
        console.log(`Deleted ${deletedCount.count} calls from removed assistants:`, removedAssistantIds);
      }
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          role: true,
          isActive: true,
          pricePerMinute: true,
          monthlyCharge: true,
          billingCycle: true,
          includedMinutes: true,
          overageRate: true,
          billingResetDay: true,
          vapiAssistantId: true,
          vapiAssistants: true,
          appAccess: true,
          updatedAt: true,
        },
      });

      console.log('Update successful:', updated.id);
      return updated;
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  }

  async changePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async forceLogout(id: string) {
    const user = await this.findOne(id);

    // Set force logout timestamp
    await this.prisma.user.update({
      where: { id },
      data: { forceLogoutAt: new Date() },
    });

    // Log the force logout action
    await this.prisma.activityLog.create({
      data: {
        userId: id,
        action: 'FORCE_LOGOUT',
        description: `User was forcefully logged out by admin`,
      },
    });

    return {
      message: 'User logged out successfully',
      userId: id,
      userName: user.name,
      forceLogoutAt: new Date().toISOString(),
    };
  }

  async delete(id: string) {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserStats(userId: string, days?: number, assistantId?: string) {
    const user = await this.findOne(userId);

    // Check if user has assistants configured
    const assignedAssistantIds = user.vapiAssistants && Array.isArray(user.vapiAssistants)
      ? user.vapiAssistants.map((a: any) => a.id)
      : [];

    if (assignedAssistantIds.length === 0) {
      return {
        totalCalls: 0,
        totalDuration: 0,
        billableMinutes: 0,
        totalCost: user.monthlyCharge,
        monthlyCharge: user.monthlyCharge,
        pricePerMinute: user.pricePerMinute,
        callBreakdown: {
          successful: 0,
          transferred: 0,
          failed: 0,
        },
      };
    }

    const now = new Date();
    let startDate: Date | undefined;
    if (typeof days === 'number' && days > 0) {
      if (days === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(now.getDate() - days);
      }
    } else if (days === 0) {
      // all time: no start date filter
      startDate = undefined;
    } else {
      // default to current month if not provided
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const where: any = {
      userId,
      ...(startDate ? { startTime: { gte: startDate } } : {}),
    };

    // Only include calls from currently assigned assistants
    // If a specific assistant is requested, filter by that assistant (if they have access to it)
    if (assistantId && assignedAssistantIds.includes(assistantId)) {
      where.assistantId = assistantId;
    } else if (!assistantId && assignedAssistantIds.length > 0) {
      // If no specific assistant, show all assigned assistants
      where.assistantId = { in: assignedAssistantIds };
    }

    const calls = await this.prisma.call.findMany({ where });

    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    // Calculate billable minutes by rounding up each call individually, then summing
    const billableMinutes = calls.reduce((sum, call) => sum + Math.ceil(call.duration / 60), 0);
    
    // Calculate overage charges based on included minutes
    const includedMinutes = user.includedMinutes || 0;
    const overageMinutes = Math.max(0, billableMinutes - includedMinutes);
    const overageCharge = overageMinutes * (user.overageRate || 0);
    const totalMonthlyBill = user.monthlyCharge + overageCharge;

    const callCost = (billableMinutes * user.pricePerMinute) + user.monthlyCharge;

    const successfulCalls = calls.filter(c => c.status === 'COMPLETED').length;
    const transferredCalls = calls.filter(c => c.status === 'TRANSFERRED').length;
    const failedCalls = calls.filter(c => c.status === 'FAILED').length;

    return {
      totalCalls,
      totalDuration,
      billableMinutes,
      totalCost: callCost,
      monthlyCharge: user.monthlyCharge,
      pricePerMinute: user.pricePerMinute,
      // Billing plan details
      includedMinutes: user.includedMinutes || 0,
      overageRate: user.overageRate || 0,
      billingResetDay: user.billingResetDay || 1,
      overageMinutes,
      overageCharge,
      totalMonthlyBill,
      callBreakdown: {
        successful: successfulCalls,
        transferred: transferredCalls,
        failed: failedCalls,
      },
    };
  }

  async getMonthlyBill(userId: string) {
    const user = await this.findOne(userId);

    // Check if user has assistants configured
    const assignedAssistantIds = user.vapiAssistants && Array.isArray(user.vapiAssistants)
      ? user.vapiAssistants.map((a: any) => a.id)
      : [];

    if (assignedAssistantIds.length === 0) {
      const now = new Date();
      const resetDay = user.billingResetDay || 1;
      let billingPeriodStart: Date;
      let billingPeriodEnd: Date;
      
      if (now.getDate() < resetDay) {
        billingPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
        billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), resetDay - 1, 23, 59, 59, 999);
      } else {
        billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), resetDay);
        billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, resetDay - 1, 23, 59, 59, 999);
      }

      return {
        billableMinutes: 0,
        includedMinutes: user.includedMinutes || 0,
        overageRate: user.overageRate || 0,
        billingResetDay: resetDay,
        overageMinutes: 0,
        overageCharge: 0,
        monthlyCharge: user.monthlyCharge,
        totalMonthlyBill: user.monthlyCharge,
        billingPeriodStart: billingPeriodStart.toISOString(),
        billingPeriodEnd: billingPeriodEnd.toISOString(),
      };
    }

    // Calculate current billing period based on billingResetDay
    const now = new Date();
    const resetDay = user.billingResetDay || 1;
    
    let billingPeriodStart: Date;
    let billingPeriodEnd: Date;

    // If today is before reset day, period is from last month's reset day to day before this month's reset day
    // If today is on/after reset day, period is from this month's reset day to day before next month's reset day
    if (now.getDate() < resetDay) {
      // Period started last month
      billingPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
      // End is day before reset day of current month
      billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), resetDay - 1, 23, 59, 59, 999);
    } else {
      // Period started this month
      billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), resetDay);
      // End is day before reset day of next month
      billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, resetDay - 1, 23, 59, 59, 999);
    }

    // Get calls within current billing period from assigned assistants only
    const calls = await this.prisma.call.findMany({
      where: {
        userId,
        assistantId: { in: assignedAssistantIds },
        startTime: {
          gte: billingPeriodStart,
          lte: billingPeriodEnd,
        },
      },
    });

    // Calculate billable minutes (rounded up per call)
    const billableMinutes = calls.reduce((sum, call) => {
      return sum + Math.ceil(call.duration / 60);
    }, 0);

    const includedMinutes = user.includedMinutes || 0;
    const overageMinutes = Math.max(0, billableMinutes - includedMinutes);
    const overageCharge = overageMinutes * (user.overageRate || 0);
    const totalMonthlyBill = user.monthlyCharge + overageCharge;

    return {
      billableMinutes,
      includedMinutes,
      overageRate: user.overageRate || 0,
      billingResetDay: resetDay,
      overageMinutes,
      overageCharge,
      monthlyCharge: user.monthlyCharge,
      totalMonthlyBill,
      billingPeriodStart: billingPeriodStart.toISOString(),
      billingPeriodEnd: billingPeriodEnd.toISOString(),
    };
  }

  async saveBillingHistory(id: string) {
    const user = await this.findOne(id);
    const monthlyBill = await this.getMonthlyBill(id);

    // Get billing month in format "YYYY-MM"
    const billingMonth = new Date(monthlyBill.billingPeriodStart).toISOString().substring(0, 7);

    // Check if billing history already exists for this month
    const existing = await this.prisma.billingHistory.findUnique({
      where: {
        userId_billingMonth: {
          userId: id,
          billingMonth,
        },
      },
    });

    if (existing) {
      // Update existing record
      return this.prisma.billingHistory.update({
        where: { id: existing.id },
        data: {
          billingPeriodStart: new Date(monthlyBill.billingPeriodStart),
          billingPeriodEnd: new Date(monthlyBill.billingPeriodEnd),
          totalMinutes: monthlyBill.billableMinutes,
          includedMinutes: monthlyBill.includedMinutes,
          overageMinutes: monthlyBill.overageMinutes,
          monthlyCharge: monthlyBill.monthlyCharge,
          overageCharge: monthlyBill.overageCharge,
          totalCharge: monthlyBill.totalMonthlyBill,
          pricePerMinute: user.pricePerMinute,
          overageRate: monthlyBill.overageRate,
        },
      });
    }

    // Create new record
    return this.prisma.billingHistory.create({
      data: {
        userId: id,
        billingPeriodStart: new Date(monthlyBill.billingPeriodStart),
        billingPeriodEnd: new Date(monthlyBill.billingPeriodEnd),
        billingMonth,
        totalMinutes: monthlyBill.billableMinutes,
        includedMinutes: monthlyBill.includedMinutes,
        overageMinutes: monthlyBill.overageMinutes,
        monthlyCharge: monthlyBill.monthlyCharge,
        overageCharge: monthlyBill.overageCharge,
        totalCharge: monthlyBill.totalMonthlyBill,
        pricePerMinute: user.pricePerMinute,
        overageRate: monthlyBill.overageRate,
      },
    });
  }

  async getBillingHistory(id: string) {
    // Get all billing history for user, sorted by most recent first
    const history = await this.prisma.billingHistory.findMany({
      where: { userId: id },
      orderBy: { billingPeriodStart: 'desc' },
    });

    // Also get current month bill
    const currentBill = await this.getMonthlyBill(id);

    return {
      currentBill,
      history,
    };
  }

  async updateBillingStatus(billingId: string, status: string) {
    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be one of: pending, paid, overdue');
    }

    const updated = await this.prisma.billingHistory.update({
      where: { id: billingId },
      data: {
        status,
        ...(status === 'paid' ? { paidAt: new Date() } : {}),
      },
    });

    return updated;
  }

  async deleteBillingHistory(billingId: string) {
    await this.prisma.billingHistory.delete({
      where: { id: billingId },
    });

    return { message: 'Billing history record deleted successfully' };
  }
}
