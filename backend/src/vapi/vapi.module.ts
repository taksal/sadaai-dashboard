// src/vapi/vapi.module.ts
import { Module } from '@nestjs/common';
import { VapiService } from './vapi.service';
import { VapiController } from './vapi.controller';
import { VapiWebhookController } from './vapi-webhook.controller';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';
import { GoogleCalendarModule } from '../integrations/calendar/google/google-calendar.module';
import { OutlookCalendarModule } from '../integrations/calendar/outlook/outlook-calendar.module';
import { CalendarConnectionModule } from '../integrations/calendar/connection/calendar-connection.module';
import { AppointmentModule } from '../integrations/calendar/appointment/appointment.module';

@Module({
  imports: [
    HttpModule,
    UsersModule,
    GoogleCalendarModule,
    OutlookCalendarModule,
    CalendarConnectionModule,
    AppointmentModule,
  ],
  controllers: [VapiController, VapiWebhookController],
  providers: [VapiService],
  exports: [VapiService],
})
export class VapiModule {}
