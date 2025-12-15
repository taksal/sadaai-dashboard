import { Module } from '@nestjs/common';
import { CalendarConnectionController } from './calendar-connection.controller';
import { CalendarConnectionService } from './calendar-connection.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarConnectionController],
  providers: [CalendarConnectionService],
  exports: [CalendarConnectionService],
})
export class CalendarConnectionModule {}
