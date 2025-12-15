import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../../prisma/prisma.service';
import { CalendarOAuthConfigService } from '../oauth-config/calendar-oauth-config.service';
import { CalendarProvider } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
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

  async getOAuth2Client(): Promise<OAuth2Client> {
    const config = await this.oauthConfigService.getConfigByProvider(
      CalendarProvider.GOOGLE,
    );

    if (!config) {
      throw new HttpException(
        'Google Calendar OAuth not configured. Please configure in admin settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    );

    return oauth2Client;
  }

  async getAuthUrl(userId: string): Promise<string> {
    const oauth2Client = await this.getOAuth2Client();
    const config = await this.oauthConfigService.getConfigByProvider(
      CalendarProvider.GOOGLE,
    );

    const scopes = config.scopes.split(',').map((s) => s.trim());

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: userId, // Pass userId to identify user in callback
    });

    return authUrl;
  }

  async handleOAuthCallback(
    code: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const oauth2Client = await this.getOAuth2Client();

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Google');
      }

      oauth2Client.setCredentials(tokens);

      // Get user's primary calendar info
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      const primaryCalendar = calendarList.data.items?.find(
        (cal) => cal.primary === true,
      );

      if (!primaryCalendar) {
        throw new Error('No primary calendar found');
      }

      // Calculate token expiry
      const expiryDate = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Save connection to database
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
        update: {
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiry: expiryDate,
          calendarId: primaryCalendar.id,
          calendarName: primaryCalendar.summary,
          email: primaryCalendar.id,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        create: {
          userId,
          provider: CalendarProvider.GOOGLE,
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiry: expiryDate,
          calendarId: primaryCalendar.id,
          calendarName: primaryCalendar.summary,
          email: primaryCalendar.id,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Google Calendar connected for user ${userId}`);

      return {
        success: true,
        message: 'Google Calendar connected successfully',
      };
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      throw new HttpException(
        error.message || 'Failed to connect Google Calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.GOOGLE,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new HttpException(
        'Google Calendar not connected',
        HttpStatus.NOT_FOUND,
      );
    }

    const oauth2Client = await this.getOAuth2Client();

    // Decrypt tokens
    const accessToken = this.decrypt(connection.accessToken);
    const refreshToken = this.decrypt(connection.refreshToken);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.tokenExpiry.getTime(),
    });

    // Refresh token if expired
    if (new Date() >= connection.tokenExpiry) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update tokens in database
        await this.prisma.calendarConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: this.encrypt(credentials.access_token),
            tokenExpiry: new Date(credentials.expiry_date),
            lastSyncedAt: new Date(),
          },
        });

        oauth2Client.setCredentials(credentials);
      } catch (error) {
        this.logger.error('Token refresh error:', error);

        // Mark connection as inactive
        await this.prisma.calendarConnection.update({
          where: { id: connection.id },
          data: { isActive: false },
        });

        throw new HttpException(
          'Failed to refresh Google Calendar token. Please reconnect.',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    return oauth2Client;
  }

  async checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ isAvailable: boolean; conflictingEvents?: any[] }> {
    try {
      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      const response = await calendar.events.list({
        calendarId: connection.calendarId || 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

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
  ): Promise<{ eventId: string; htmlLink: string }> {
    try {
      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      const event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: eventData.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: connection.calendarId || 'primary',
        requestBody: event,
        sendUpdates: 'all', // Send notifications to attendees
      });

      return {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
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
      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      const updateData: any = {};

      if (eventData.summary) updateData.summary = eventData.summary;
      if (eventData.description) updateData.description = eventData.description;
      if (eventData.location) updateData.location = eventData.location;
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
        updateData.attendees = eventData.attendees.map((email) => ({ email }));
      }

      await calendar.events.patch({
        calendarId: connection.calendarId || 'primary',
        eventId,
        requestBody: updateData,
        sendUpdates: 'all',
      });

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
      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      await calendar.events.delete({
        calendarId: connection.calendarId || 'primary',
        eventId,
        sendUpdates: 'all',
      });

      return { success: true };
    } catch (error) {
      // If event already deleted, consider it a success
      if (error.message?.includes('Resource has been deleted') || error.message?.includes('Not Found')) {
        this.logger.log(`Event ${eventId} was already deleted from Google Calendar`);
        return { success: true };
      }

      this.logger.error('Delete event error:');
      this.logger.error(error.message);
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
      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      const response = await calendar.events.list({
        calendarId: connection.calendarId || 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error('List events error:', error);
      throw new HttpException(
        'Failed to list calendar events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * FULL Bidirectional sync between Google Calendar and database
   * 1. Imports new events FROM Google Calendar INTO database
   * 2. Marks deleted events as CANCELLED in database
   */
  async syncCalendarToAppointments(userId: string): Promise<{ synced: number; cancelled: number; imported: number }> {
    try {
      this.logger.log(`Starting FULL bidirectional calendar sync for user ${userId}`);

      const oauth2Client = await this.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
      });

      if (!connection) {
        this.logger.warn('No calendar connection found');
        return { synced: 0, cancelled: 0, imported: 0 };
      }

      // PART 1: Import new events FROM Google Calendar
      this.logger.log('Step 1: Importing new events from Google Calendar...');
      const now = new Date();

      // Fetch events from 3 months in the past to 3 months in the future
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      const response = await calendar.events.list({
        calendarId: connection.calendarId || 'primary',
        timeMin: threeMonthsAgo.toISOString(),
        timeMax: threeMonthsLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const calendarEvents = response.data.items || [];
      this.logger.log(`Found ${calendarEvents.length} events in Google Calendar`);

      // Get existing appointments with externalEventIds
      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          userId,
          provider: CalendarProvider.GOOGLE,
        },
        select: {
          externalEventId: true,
        },
      });

      const existingEventIds = new Set(
        existingAppointments.map(apt => apt.externalEventId).filter(Boolean)
      );

      let importedCount = 0;

      // Import events that don't exist in database
      for (const event of calendarEvents) {
        if (!event.id || existingEventIds.has(event.id)) {
          continue; // Skip if already in database
        }

        // Extract event details
        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;

        if (!startTime || !endTime) {
          continue; // Skip events without valid times
        }

        // Create appointment from calendar event
        try {
          const bookingReference = await this.generateBookingReference();

          await this.prisma.appointment.create({
            data: {
              bookingReference,
              userId,
              customerName: event.summary || 'Google Calendar Event',
              customerPhone: event.description?.match(/Phone:\s*(.+)/)?.[1] || 'N/A',
              customerEmail: event.attendees?.[0]?.email || null,
              title: event.summary || 'Imported Event',
              description: event.description || null,
              startTime: new Date(startTime),
              endTime: new Date(endTime),
              timezone: 'UTC',
              status: 'CONFIRMED',
              provider: CalendarProvider.GOOGLE,
              externalEventId: event.id,
              calendarSyncedAt: new Date(),
            },
          });

          importedCount++;
          this.logger.log(`Imported event: ${event.summary} (${event.id})`);
        } catch (error) {
          this.logger.warn(`Failed to import event ${event.id}:`, error.message);
        }
      }

      // PART 2: Check for deleted events in Google Calendar
      // Instead of checking each event individually, we compare the list of calendar events
      // with our database appointments - much more reliable!
      this.logger.log('Step 2: Checking for deleted events...');

      const appointments = await this.prisma.appointment.findMany({
        where: {
          userId,
          provider: CalendarProvider.GOOGLE,
          externalEventId: { not: null },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      });

      this.logger.log(`Found ${appointments.length} active appointments to check`);

      // Create a Set of all current event IDs in Google Calendar
      const currentCalendarEventIds = new Set(
        calendarEvents.map(event => event.id).filter(Boolean)
      );

      this.logger.log(`Current calendar has ${currentCalendarEventIds.size} event IDs`);

      let cancelledCount = 0;

      // Check each appointment - if its event ID is NOT in the calendar, it was deleted
      for (const appointment of appointments) {
        const eventId = appointment.externalEventId;

        if (currentCalendarEventIds.has(eventId)) {
          this.logger.log(`✓ Event ${eventId} (${appointment.title}) still exists in calendar`);
        } else {
          this.logger.log(`✗ Event ${eventId} (${appointment.title}) NOT FOUND in calendar - marking as cancelled`);

          await this.prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'Deleted from Google Calendar',
              cancelledAt: new Date(),
            },
          });

          cancelledCount++;
        }
      }

      this.logger.log(`Sync completed: imported ${importedCount}, checked ${appointments.length}, cancelled ${cancelledCount}`);
      return { synced: appointments.length, cancelled: cancelledCount, imported: importedCount };
    } catch (error) {
      this.logger.error('Calendar sync error:', error);
      throw new HttpException(
        'Failed to sync calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
