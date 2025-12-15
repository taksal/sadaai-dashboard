import {
  Controller,
  Get,
  Delete,
  UseGuards,
  Request,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CalendarConnectionService } from './calendar-connection.service';

@Controller('integrations/calendar/connections')
@UseGuards(JwtAuthGuard)
export class CalendarConnectionController {
  constructor(
    private readonly calendarConnectionService: CalendarConnectionService,
  ) {}

  @Get()
  async getUserConnections(@Request() req) {
    try {
      const userId = req.user.userId;
      const connections =
        await this.calendarConnectionService.getUserConnections(userId);

      return {
        success: true,
        connections,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get calendar connections',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':provider')
  async getConnection(@Request() req, @Param('provider') provider: string) {
    try {
      const userId = req.user.userId;
      const connection =
        await this.calendarConnectionService.getConnection(userId, provider);

      if (!connection) {
        return {
          success: false,
          message: 'Connection not found',
          connected: false,
        };
      }

      return {
        success: true,
        connected: true,
        connection,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get calendar connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':provider')
  async disconnectCalendar(@Request() req, @Param('provider') provider: string) {
    try {
      const userId = req.user.userId;
      await this.calendarConnectionService.disconnectCalendar(userId, provider);

      return {
        success: true,
        message: `${provider} calendar disconnected successfully`,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to disconnect calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/all')
  async getConnectionStatus(@Request() req) {
    try {
      const userId = req.user.userId;
      const status =
        await this.calendarConnectionService.getConnectionStatus(userId);

      return {
        success: true,
        ...status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get connection status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
