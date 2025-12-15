// src/users/billing-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  // Run daily at 1:00 AM to check for billing period resets
  @Cron('0 1 * * *')
  async handleDailyBillingCheck() {
    this.logger.log('Running daily billing period check...');

    try {
      // Get all active CLIENT users
      const users = await this.prisma.user.findMany({
        where: {
          role: 'CLIENT',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          billingResetDay: true,
        },
      });

      const today = new Date();
      const currentDay = today.getDate();

      let savedCount = 0;

      // Check each user to see if their billing period reset today
      for (const user of users) {
        const resetDay = user.billingResetDay || 1;

        // If today is the reset day, save yesterday's billing period
        if (currentDay === resetDay) {
          try {
            // Get the billing month that just ended (previous month)
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const billingMonth = yesterday.toISOString().substring(0, 7);

            // Check if we already saved this month
            const existing = await this.prisma.billingHistory.findUnique({
              where: {
                userId_billingMonth: {
                  userId: user.id,
                  billingMonth,
                },
              },
            });

            if (!existing) {
              // Save the billing history for the period that just ended
              await this.usersService.saveBillingHistory(user.id);
              savedCount++;
              this.logger.log(
                `Saved billing history for user ${user.name} (${user.email}) - Period: ${billingMonth}`,
              );
            } else {
              this.logger.debug(
                `Billing history already exists for user ${user.name} - Period: ${billingMonth}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to save billing history for user ${user.id}:`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `Daily billing check complete. Saved ${savedCount} billing records.`,
      );
    } catch (error) {
      this.logger.error('Error in daily billing check:', error);
    }
  }

  // Optional: Run at the start of each month as a backup
  @Cron('0 2 1 * *') // 2:00 AM on the 1st of each month
  async handleMonthlyBillingBackup() {
    this.logger.log('Running monthly billing backup...');

    try {
      // Get all active CLIENT users with billing reset day of 1
      const users = await this.prisma.user.findMany({
        where: {
          role: 'CLIENT',
          isActive: true,
          billingResetDay: 1,
        },
      });

      let savedCount = 0;

      for (const user of users) {
        try {
          const yesterday = new Date();
          yesterday.setDate(0); // Last day of previous month
          const billingMonth = yesterday.toISOString().substring(0, 7);

          const existing = await this.prisma.billingHistory.findUnique({
            where: {
              userId_billingMonth: {
                userId: user.id,
                billingMonth,
              },
            },
          });

          if (!existing) {
            await this.usersService.saveBillingHistory(user.id);
            savedCount++;
            this.logger.log(
              `Monthly backup: Saved billing history for user ${user.id} - Period: ${billingMonth}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Monthly backup: Failed to save billing history for user ${user.id}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Monthly billing backup complete. Saved ${savedCount} billing records.`,
      );
    } catch (error) {
      this.logger.error('Error in monthly billing backup:', error);
    }
  }
}
