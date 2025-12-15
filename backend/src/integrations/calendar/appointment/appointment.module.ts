import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { GoogleCalendarModule } from '../google/google-calendar.module';
import { OutlookCalendarModule } from '../outlook/outlook-calendar.module';

@Module({
  imports: [PrismaModule, GoogleCalendarModule, OutlookCalendarModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
