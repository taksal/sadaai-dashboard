import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { AppointmentService } from './appointment.service';
import { GoogleCalendarService } from '../google/google-calendar.service';
import { UserRole } from '@prisma/client';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Get()
  async getAppointments(@Request() req, @Query() query: any) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const { status, startDate, endDate, page, limit } = query;

      const appointments = await this.appointmentService.getAppointments(
        userId,
        userRole,
        {
          status,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
        },
      );

      return {
        success: true,
        ...appointments,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get appointments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getAppointment(@Request() req, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const appointment = await this.appointmentService.getAppointment(
        id,
        userId,
        userRole,
      );

      if (!appointment) {
        throw new HttpException('Appointment not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        appointment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get appointment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createAppointment(@Request() req, @Body() data: any) {
    try {
      const userId = req.user.userId;

      const appointment = await this.appointmentService.createAppointment(
        userId,
        data,
      );

      return {
        success: true,
        message: 'Appointment created successfully',
        appointment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create appointment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateAppointment(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const appointment = await this.appointmentService.updateAppointment(
        id,
        userId,
        userRole,
        data,
      );

      return {
        success: true,
        message: 'Appointment updated successfully',
        appointment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update appointment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteAppointment(@Request() req, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      await this.appointmentService.deleteAppointment(id, userId, userRole);

      return {
        success: true,
        message: 'Appointment deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete appointment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/cancel')
  async cancelAppointment(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { reason?: string },
  ) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const appointment = await this.appointmentService.cancelAppointment(
        id,
        userId,
        userRole,
        data.reason,
      );

      return {
        success: true,
        message: 'Appointment cancelled successfully',
        appointment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel appointment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/confirm')
  async confirmAppointment(@Request() req, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      const appointment = await this.appointmentService.confirmAppointment(
        id,
        userId,
        userRole,
      );

      return {
        success: true,
        message: 'Appointment confirmed successfully',
        appointment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to confirm appointment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/overview')
  async getAppointmentStats(@Request() req, @Query('days') days?: string) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const daysFilter = days ? parseInt(days, 10) : undefined;

      const stats = await this.appointmentService.getAppointmentStats(
        userId,
        userRole,
        daysFilter,
      );

      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get appointment stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync')
  async syncCalendar(@Request() req) {
    try {
      const userId = req.user.userId;
      console.log(`[Sync] Starting calendar sync for user ${userId}`);

      const result = await this.googleCalendarService.syncCalendarToAppointments(userId);

      console.log(`[Sync] Completed: imported ${result.imported}, synced ${result.synced}, cancelled ${result.cancelled}`);
      return {
        success: true,
        message: `Imported ${result.imported} new events, cancelled ${result.cancelled} deleted events`,
        ...result,
      };
    } catch (error) {
      console.error('[Sync] Error:', error.message);
      throw new HttpException(
        error.message || 'Failed to sync calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
