import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { PrismaService } from '../../../prisma/prisma.service';
import { CalendarOAuthConfigService } from '../oauth-config/calendar-oauth-config.service';
import { CalendarProvider } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private oauthConfigService: CalendarOAuthConfigService,
  ) {
    const key =
      process.env.ENCRYPTION_KEY ||
      'your-32-character-secret-key!!';
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  }

  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async getAuthUrl(userId: string): Promise<string> {
    const config = await this.oauthConfigService.getConfigByProvider(
      CalendarProvider.OUTLOOK,
    );

    if (!config) {
      throw new HttpException(
        'Outlook Calendar OAuth not configured. Please configure in admin settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const scopes = config.scopes.split(',').map((s) => s.trim()).join(' ');

    // Microsoft OAuth 2.0 authorization endpoint
    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(config.clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${userId}` +
      `&prompt=consent`; // Force consent to get refresh token

    return authUrl;
  }

  async handleOAuthCallback(
    code: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.oauthConfigService.getConfigByProvider(
        CalendarProvider.OUTLOOK,
      );

      if (!config) {
        throw new Error('Outlook Calendar OAuth not configured');
      }

      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: config.clientId,
          scope: config.scopes.split(',').map((s) => s.trim()).join(' '),
          code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          client_secret: config.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const tokens = tokenResponse.data;

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Microsoft');
      }

      // Calculate token expiry
      const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

      // Get user's calendar info using the access token
      const userInfoResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        },
      );

      const userEmail = userInfoResponse.data.mail || userInfoResponse.data.userPrincipalName;

      // Save connection to database
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK,
          },
        },
        update: {
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiry: expiryDate,
          calendarId: 'primary',
          calendarName: 'Outlook Calendar',
          email: userEmail,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        create: {
          userId,
          provider: CalendarProvider.OUTLOOK,
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiry: expiryDate,
          calendarId: 'primary',
          calendarName: 'Outlook Calendar',
          email: userEmail,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Outlook Calendar connected for user ${userId}`);

      return {
        success: true,
        message: 'Outlook Calendar connected successfully',
      };
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      throw new HttpException(
        error.response?.data?.error_description || error.message || 'Failed to connect Outlook Calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAuthenticatedClient(userId: string): Promise<Client> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.OUTLOOK,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new HttpException(
        'Outlook Calendar not connected',
        HttpStatus.NOT_FOUND,
      );
    }

    // Decrypt tokens
    let accessToken = this.decrypt(connection.accessToken);
    const refreshToken = this.decrypt(connection.refreshToken);

    // Refresh token if expired
    if (new Date() >= connection.tokenExpiry) {
      try {
        const config = await this.oauthConfigService.getConfigByProvider(
          CalendarProvider.OUTLOOK,
        );

        const tokenResponse = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            client_id: config.clientId,
            scope: config.scopes.split(',').map((s) => s.trim()).join(' '),
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_secret: config.clientSecret,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        const tokens = tokenResponse.data;
        accessToken = tokens.access_token;

        // Update tokens in database
        await this.prisma.calendarConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: this.encrypt(tokens.access_token),
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            lastSyncedAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error('Token refresh error:', error);

        // Mark connection as inactive
        await this.prisma.calendarConnection.update({
          where: { id: connection.id },
          data: { isActive: false },
        });

        throw new HttpException(
          'Failed to refresh Outlook Calendar token. Please reconnect.',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    // Create Microsoft Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    return client;
  }

  async checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ isAvailable: boolean; conflictingEvents?: any[] }> {
    try {
      const client = await this.getAuthenticatedClient(userId);

      const response = await client
        .api('/me/calendarView')
        .query({
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        })
        .get();

      const events = response.value || [];

      return {
        isAvailable: events.length === 0,
        conflictingEvents: events.length > 0 ? events : undefined,
      };
    } catch (error) {
      this.logger.error('Check availability error:', error);
      throw new HttpException(
        'Failed to check calendar availability',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createEvent(
    userId: string,
    eventData: {
      summary: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      attendees?: string[];
      location?: string;
    },
  ): Promise<{ eventId: string; webLink: string }> {
    try {
      const client = await this.getAuthenticatedClient(userId);

      const event = {
        subject: eventData.summary,
        body: {
          contentType: 'HTML',
          content: eventData.description || '',
        },
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        },
        location: eventData.location
          ? {
              displayName: eventData.location,
            }
          : undefined,
        attendees: eventData.attendees?.map((email) => ({
          emailAddress: {
            address: email,
          },
          type: 'required',
        })),
        reminderMinutesBeforeStart: 30,
        isReminderOn: true,
      };

      const response = await client
        .api('/me/calendar/events')
        .post(event);

      return {
        eventId: response.id,
        webLink: response.webLink,
      };
    } catch (error) {
      this.logger.error('Create event error:', error);
      throw new HttpException(
        'Failed to create calendar event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateEvent(
    userId: string,
    eventId: string,
    eventData: {
      summary?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      attendees?: string[];
      location?: string;
    },
  ): Promise<{ success: boolean }> {
    try {
      const client = await this.getAuthenticatedClient(userId);

      const updateData: any = {};

      if (eventData.summary) updateData.subject = eventData.summary;
      if (eventData.description) {
        updateData.body = {
          contentType: 'HTML',
          content: eventData.description,
        };
      }
      if (eventData.location) {
        updateData.location = {
          displayName: eventData.location,
        };
      }
      if (eventData.startTime) {
        updateData.start = {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (eventData.endTime) {
        updateData.end = {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees.map((email) => ({
          emailAddress: {
            address: email,
          },
          type: 'required',
        }));
      }

      await client
        .api(`/me/calendar/events/${eventId}`)
        .patch(updateData);

      return { success: true };
    } catch (error) {
      this.logger.error('Update event error:', error);
      throw new HttpException(
        'Failed to update calendar event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<{ success: boolean }> {
    try {
      const client = await this.getAuthenticatedClient(userId);

      await client
        .api(`/me/calendar/events/${eventId}`)
        .delete();

      return { success: true };
    } catch (error) {
      this.logger.error('Delete event error:', error);
      throw new HttpException(
        'Failed to delete calendar event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listEvents(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    try {
      const client = await this.getAuthenticatedClient(userId);

      const response = await client
        .api('/me/calendarView')
        .query({
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        })
        .orderby('start/dateTime')
        .get();

      return response.value || [];
    } catch (error) {
      this.logger.error('List events error:', error);
      throw new HttpException(
        'Failed to list calendar events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
