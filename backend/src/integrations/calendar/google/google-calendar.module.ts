import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CalendarOAuthConfigModule } from '../oauth-config/calendar-oauth-config.module';

@Module({
  imports: [PrismaModule, CalendarOAuthConfigModule],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
