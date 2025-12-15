import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AppointmentStatus,
  CalendarProvider,
  UserRole,
  Prisma,
} from '@prisma/client';
import { GoogleCalendarService } from '../google/google-calendar.service';
import { OutlookCalendarService } from '../outlook/outlook-calendar.service';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private prisma: PrismaService,
    private googleCalendarService: GoogleCalendarService,
    private outlookCalendarService: OutlookCalendarService,
  ) {}

  /**
   * Find appointment by booking reference
   */
  async findByBookingReference(bookingReference: string, userId?: string) {
    const where: any = { bookingReference };
    if (userId) {
      where.userId = userId;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { bookingReference },
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

    if (!appointment) {
      throw new HttpException(
        `Appointment with booking reference ${bookingReference} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // If userId provided, verify ownership
    if (userId && appointment.userId !== userId) {
      throw new HttpException(
        'You do not have permission to access this appointment',
        HttpStatus.FORBIDDEN,
      );
    }

    return appointment;
  }

  /**
   * Generate a unique booking reference
   * Format: BK-YYYY-NNNNNN (e.g., BK-2025-000123)
   */
  private async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();

    // Get the count of appointments this year
    const count = await this.prisma.appointment.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    // Generate reference with 6-digit number (padded with zeros)
    const number = (count + 1).toString().padStart(6, '0');
    const reference = `BK-${year}-${number}`;

    // Check if reference already exists (collision check)
    const existing = await this.prisma.appointment.findUnique({
      where: { bookingReference: reference },
    });

    if (existing) {
      // If collision, try with a random suffix
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `BK-${year}-${number}${randomSuffix}`;
    }

    return reference;
  }

  async getAppointments(
    userId: string,
    userRole: UserRole,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
      includeCancelled?: boolean;
    },
  ) {
    const { status, startDate, endDate, page = 1, limit = 50, includeCancelled = false } = filters;

    const where: Prisma.AppointmentWhereInput = {};

    // Tenant isolation: CLIENT users can only see their own appointments
    if (userRole === UserRole.CLIENT) {
      where.userId = userId;
    }

    if (status) {
      where.status = status as AppointmentStatus;
    } else if (!includeCancelled) {
      // By default, exclude CANCELLED appointments unless explicitly requested
      where.status = { not: AppointmentStatus.CANCELLED };
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = startDate;
      }
      if (endDate) {
        where.startTime.lte = endDate;
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAppointment(id: string, userId: string, userRole: UserRole) {
    const appointment = await this.prisma.appointment.findUnique({
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

    if (!appointment) {
      return null;
    }

    // Tenant isolation check
    if (userRole === UserRole.CLIENT && appointment.userId !== userId) {
      throw new HttpException(
        'Unauthorized access to appointment',
        HttpStatus.FORBIDDEN,
      );
    }

    return appointment;
  }

  async createAppointment(
    userId: string,
    data: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      title: string;
      description?: string;
      startTime: string | Date;
      endTime: string | Date;
      timezone?: string;
      provider?: string;
      syncToCalendar?: boolean;
      vapiCallId?: string;
      notes?: string;
    },
  ) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validate times
    if (startTime >= endTime) {
      throw new HttpException(
        'End time must be after start time',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (startTime < new Date()) {
      throw new HttpException(
        'Cannot create appointment in the past',
        HttpStatus.BAD_REQUEST,
      );
    }

    let externalEventId: string | undefined;
    let provider: CalendarProvider | undefined;
    let calendarSyncedAt: Date | undefined;

    // Sync to calendar if requested
    if (data.syncToCalendar && data.provider) {
      try {
        if (data.provider.toLowerCase() === 'google') {
          provider = CalendarProvider.GOOGLE;
          const result = await this.googleCalendarService.createEvent(userId, {
            summary: data.title,
            description: data.description,
            startTime,
            endTime,
            attendees: data.customerEmail ? [data.customerEmail] : undefined,
          });
          externalEventId = result.eventId;
          calendarSyncedAt = new Date();
        } else if (data.provider.toLowerCase() === 'outlook') {
          provider = CalendarProvider.OUTLOOK;
          const result = await this.outlookCalendarService.createEvent(userId, {
            summary: data.title,
            description: data.description,
            startTime,
            endTime,
            attendees: data.customerEmail ? [data.customerEmail] : undefined,
          });
          externalEventId = result.eventId;
          calendarSyncedAt = new Date();
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync appointment to calendar: ${error.message}`,
        );
        // Continue creating appointment even if calendar sync fails
      }
    }

    // Generate unique booking reference
    const bookingReference = await this.generateBookingReference();

    const appointment = await this.prisma.appointment.create({
      data: {
        bookingReference,
        userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        timezone: data.timezone || 'UTC',
        provider,
        externalEventId,
        calendarSyncedAt,
        vapiCallId: data.vapiCallId,
        notes: data.notes,
        status: AppointmentStatus.SCHEDULED,
      },
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

    this.logger.log(`Appointment created: ${appointment.id} for user ${userId}`);

    return appointment;
  }

  async updateAppointment(
    id: string,
    userId: string,
    userRole: UserRole,
    data: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      title?: string;
      description?: string;
      startTime?: string | Date;
      endTime?: string | Date;
      timezone?: string;
      status?: string;
      notes?: string;
      syncToCalendar?: boolean;
    },
  ) {
    const appointment = await this.getAppointment(id, userId, userRole);

    if (!appointment) {
      throw new HttpException('Appointment not found', HttpStatus.NOT_FOUND);
    }

    const updateData: Prisma.AppointmentUpdateInput = {};

    if (data.customerName) updateData.customerName = data.customerName;
    if (data.customerPhone) updateData.customerPhone = data.customerPhone;
    if (data.customerEmail) updateData.customerEmail = data.customerEmail;
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.notes) updateData.notes = data.notes;
    if (data.status) updateData.status = data.status as AppointmentStatus;

    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }

    // Sync updates to calendar if appointment is synced
    if (
      data.syncToCalendar &&
      appointment.externalEventId &&
      appointment.provider
    ) {
      try {
        const calendarData: any = {};
        if (data.title) calendarData.summary = data.title;
        if (data.description) calendarData.description = data.description;
        if (data.startTime) calendarData.startTime = new Date(data.startTime);
        if (data.endTime) calendarData.endTime = new Date(data.endTime);
        if (data.customerEmail)
          calendarData.attendees = [data.customerEmail];

        if (appointment.provider === CalendarProvider.GOOGLE) {
          await this.googleCalendarService.updateEvent(
            appointment.userId,
            appointment.externalEventId,
            calendarData,
          );
        } else if (appointment.provider === CalendarProvider.OUTLOOK) {
          await this.outlookCalendarService.updateEvent(
            appointment.userId,
            appointment.externalEventId,
            calendarData,
          );
        }

        updateData.calendarSyncedAt = new Date();
      } catch (error) {
        this.logger.warn(
          `Failed to sync appointment update to calendar: ${error.message}`,
        );
      }
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
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

    this.logger.log(`Appointment updated: ${id}`);

    return updatedAppointment;
  }

  async deleteAppointment(id: string, userId: string, userRole: UserRole) {
    const appointment = await this.getAppointment(id, userId, userRole);

    if (!appointment) {
      throw new HttpException('Appointment not found', HttpStatus.NOT_FOUND);
    }

    // Delete from calendar if synced
    if (appointment.externalEventId && appointment.provider) {
      try {
        if (appointment.provider === CalendarProvider.GOOGLE) {
          await this.googleCalendarService.deleteEvent(
            appointment.userId,
            appointment.externalEventId,
          );
        } else if (appointment.provider === CalendarProvider.OUTLOOK) {
          await this.outlookCalendarService.deleteEvent(
            appointment.userId,
            appointment.externalEventId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete calendar event: ${error.message}`,
        );
      }
    }

    await this.prisma.appointment.delete({
      where: { id },
    });

    this.logger.log(`Appointment deleted: ${id}`);
  }

  async cancelAppointment(
    id: string,
    userId: string,
    userRole: UserRole,
    reason?: string,
  ) {
    const appointment = await this.getAppointment(id, userId, userRole);

    if (!appointment) {
      throw new HttpException('Appointment not found', HttpStatus.NOT_FOUND);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new HttpException(
        'Appointment already cancelled',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Delete from calendar if synced
    if (appointment.externalEventId && appointment.provider) {
      try {
        if (appointment.provider === CalendarProvider.GOOGLE) {
          await this.googleCalendarService.deleteEvent(
            appointment.userId,
            appointment.externalEventId,
          );
        } else if (appointment.provider === CalendarProvider.OUTLOOK) {
          await this.outlookCalendarService.deleteEvent(
            appointment.userId,
            appointment.externalEventId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete calendar event: ${error.message}`,
        );
      }
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
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

    this.logger.log(`Appointment cancelled: ${id}`);

    return updatedAppointment;
  }

  async confirmAppointment(id: string, userId: string, userRole: UserRole) {
    const appointment = await this.getAppointment(id, userId, userRole);

    if (!appointment) {
      throw new HttpException('Appointment not found', HttpStatus.NOT_FOUND);
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
      },
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

    this.logger.log(`Appointment confirmed: ${id}`);

    return updatedAppointment;
  }

  async getAppointmentStats(userId: string, userRole: UserRole, daysFilter?: number) {
    const where: Prisma.AppointmentWhereInput = {};

    // Tenant isolation
    if (userRole === UserRole.CLIENT) {
      where.userId = userId;
    }

    // Date filtering - only count appointments in the PAST within the selected range
    if (daysFilter !== undefined && daysFilter !== 0) {
      const now = new Date();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const startDate = new Date();

      // For "today" (daysFilter = 1), set to start of today
      // For other filters, go back N days from today
      if (daysFilter === 1) {
        // Start of today to end of today
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Go back N days from start of today
        startDate.setDate(startDate.getDate() - daysFilter);
        startDate.setHours(0, 0, 0, 0);
      }

      console.log(`[Stats] Filtering appointments with daysFilter=${daysFilter}, startDate=${startDate.toISOString()}, endDate=${endOfToday.toISOString()}`);

      // Only count appointments between startDate and end of today (no future appointments)
      where.startTime = {
        gte: startDate,
        lte: endOfToday
      };
    } else {
      console.log(`[Stats] No date filter applied (daysFilter=${daysFilter})`);
    }

    // Exclude CANCELLED appointments from active total
    const activeWhere = {
      ...where,
      status: { not: AppointmentStatus.CANCELLED },
    };

    const [total, scheduled, confirmed, cancelled, completed] =
      await Promise.all([
        this.prisma.appointment.count({ where: activeWhere }),
        this.prisma.appointment.count({
          where: { ...where, status: AppointmentStatus.SCHEDULED },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: AppointmentStatus.CONFIRMED },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: AppointmentStatus.CANCELLED },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: AppointmentStatus.COMPLETED },
        }),
      ]);

    const upcomingCount = await this.prisma.appointment.count({
      where: {
        ...where,
        startTime: { gte: new Date() },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      },
    });

    console.log(`[Stats] Results - total: ${total}, scheduled: ${scheduled}, confirmed: ${confirmed}, cancelled: ${cancelled}, completed: ${completed}, upcoming: ${upcomingCount}`);

    return {
      total,
      scheduled,
      confirmed,
      cancelled,
      completed,
      upcoming: upcomingCount,
    };
  }

  async checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date,
    provider?: string,
  ): Promise<{ isAvailable: boolean; conflicts?: any[] }> {
    // Check database for conflicts
    const dbConflicts = await this.prisma.appointment.findMany({
      where: {
        userId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (dbConflicts.length > 0) {
      return {
        isAvailable: false,
        conflicts: dbConflicts,
      };
    }

    // Check calendar if provider specified
    if (provider) {
      try {
        if (provider.toLowerCase() === 'google') {
          const result = await this.googleCalendarService.checkAvailability(
            userId,
            startTime,
            endTime,
          );
          if (!result.isAvailable) {
            return result;
          }
        } else if (provider.toLowerCase() === 'outlook') {
          const result = await this.outlookCalendarService.checkAvailability(
            userId,
            startTime,
            endTime,
          );
          if (!result.isAvailable) {
            return result;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to check calendar availability: ${error.message}`,
        );
        // Continue with database-only check
      }
    }

    return { isAvailable: true };
  }
}
