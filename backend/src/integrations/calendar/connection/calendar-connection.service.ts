import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CalendarProvider } from '@prisma/client';

@Injectable()
export class CalendarConnectionService {
  private readonly logger = new Logger(CalendarConnectionService.name);

  constructor(private prisma: PrismaService) {}

  async getUserConnections(userId: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        email: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    });

    return connections;
  }

  async getConnection(userId: string, provider: string) {
    const providerEnum =
      provider.toUpperCase() as keyof typeof CalendarProvider;

    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider[providerEnum],
        },
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        email: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
        tokenExpiry: true,
      },
    });

    return connection;
  }

  async disconnectCalendar(userId: string, provider: string) {
    const providerEnum =
      provider.toUpperCase() as keyof typeof CalendarProvider;

    await this.prisma.calendarConnection.delete({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider[providerEnum],
        },
      },
    });

    this.logger.log(
      `Calendar connection removed for user ${userId}, provider ${provider}`,
    );
  }

  async getConnectionStatus(userId: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId },
    });

    const googleConnection = connections.find(
      (c) => c.provider === CalendarProvider.GOOGLE && c.isActive,
    );
    const outlookConnection = connections.find(
      (c) => c.provider === CalendarProvider.OUTLOOK && c.isActive,
    );

    const googleConnected = !!googleConnection;
    const outlookConnected = !!outlookConnection;

    return {
      googleConnected,
      googleEmail: googleConnection?.email || null,
      outlookConnected,
      outlookEmail: outlookConnection?.email || null,
      hasAnyConnection: googleConnected || outlookConnected,
    };
  }

  async isUserConnected(userId: string, provider: CalendarProvider): Promise<boolean> {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    return connection?.isActive ?? false;
  }
}
