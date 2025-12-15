import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CalendarOAuthConfigService } from './calendar-oauth-config.service';

@Controller('integrations/calendar/oauth/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarOAuthConfigController {
  constructor(
    private readonly calendarOAuthConfigService: CalendarOAuthConfigService,
  ) {}

  @Get(':provider')
  @Roles(UserRole.ADMIN)
  async getConfig(@Param('provider') provider: string) {
    try {
      const config =
        await this.calendarOAuthConfigService.getConfig(provider);

      if (!config) {
        return {
          provider,
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          scopes: '',
          isEnabled: true,
        };
      }

      // Don't send the full client secret to frontend for security
      return {
        ...config,
        clientSecret: config.clientSecret ? '••••••••' : '',
        hasSecret: !!config.clientSecret,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get OAuth config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':provider')
  @Roles(UserRole.ADMIN)
  async saveConfig(
    @Param('provider') provider: string,
    @Body()
    data: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes?: string;
      isEnabled?: boolean;
    },
  ) {
    try {
      // Validate provider
      const validProviders = ['google', 'outlook'];
      if (!validProviders.includes(provider.toLowerCase())) {
        throw new HttpException(
          'Invalid provider. Must be google or outlook',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Set default scopes if not provided
      let scopes = data.scopes;
      if (!scopes) {
        if (provider.toLowerCase() === 'google') {
          scopes =
            'https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/calendar.events';
        } else if (provider.toLowerCase() === 'outlook') {
          scopes = 'Calendars.ReadWrite,offline_access';
        }
      }

      const config = await this.calendarOAuthConfigService.saveConfig(
        provider,
        {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          redirectUri: data.redirectUri,
          scopes,
          isEnabled: data.isEnabled ?? true,
        },
      );

      return {
        success: true,
        message: 'OAuth configuration saved successfully',
        config: {
          ...config,
          clientSecret: '••••••••',
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to save OAuth config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllConfigs() {
    try {
      const configs = await this.calendarOAuthConfigService.getAllConfigs();

      return configs.map((config) => ({
        ...config,
        clientSecret: config.clientSecret ? '••••••••' : '',
        hasSecret: !!config.clientSecret,
      }));
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get OAuth configs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
