import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleCalendarModule } from './google/google-calendar.module';
import { OutlookCalendarModule } from './outlook/outlook-calendar.module';
import { CalendarOAuthConfigModule } from './oauth-config/calendar-oauth-config.module';
import { CalendarConnectionModule } from './connection/calendar-connection.module';
import { AppointmentModule } from './appointment/appointment.module';

@Module({
  imports: [
    PrismaModule,
    CalendarOAuthConfigModule,
    GoogleCalendarModule,
    OutlookCalendarModule,
    CalendarConnectionModule,
    AppointmentModule,
  ],
  exports: [
    CalendarOAuthConfigModule,
    GoogleCalendarModule,
    OutlookCalendarModule,
    CalendarConnectionModule,
    AppointmentModule,
  ],
})
export class CalendarModule {}
