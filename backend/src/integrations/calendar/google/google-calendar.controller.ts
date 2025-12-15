import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('integrations/calendar/google')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  async initiateOAuth(@Request() req) {
    try {
      const userId = req.user.userId;
      const authUrl = await this.googleCalendarService.getAuthUrl(userId);

      return {
        authUrl,
        message: 'Please complete the OAuth flow by visiting the auth URL',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to initiate OAuth',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('callback')
  @Redirect()
  async handleCallback(@Query('code') code: string, @Query('state') userId: string) {
    try {
      if (!code || !userId) {
        return {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/integrations?error=missing_parameters`,
        };
      }

      const result = await this.googleCalendarService.handleOAuthCallback(
        code,
        userId,
      );

      if (result.success) {
        return {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/integrations?success=google_connected`,
        };
      } else {
        return {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/integrations?error=connection_failed`,
        };
      }
    } catch (error) {
      return {
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/integrations?error=${encodeURIComponent(error.message)}`,
      };
    }
  }
}
