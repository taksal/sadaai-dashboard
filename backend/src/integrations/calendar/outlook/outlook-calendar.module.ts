import { Module } from '@nestjs/common';
import { OutlookCalendarController } from './outlook-calendar.controller';
import { OutlookCalendarService } from './outlook-calendar.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CalendarOAuthConfigModule } from '../oauth-config/calendar-oauth-config.module';

@Module({
  imports: [PrismaModule, CalendarOAuthConfigModule],
  controllers: [OutlookCalendarController],
  providers: [OutlookCalendarService],
  exports: [OutlookCalendarService],
})
export class OutlookCalendarModule {}
