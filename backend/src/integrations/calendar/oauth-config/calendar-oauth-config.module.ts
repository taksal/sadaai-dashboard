import { Module } from '@nestjs/common';
import { CalendarOAuthConfigController } from './calendar-oauth-config.controller';
import { CalendarOAuthConfigService } from './calendar-oauth-config.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarOAuthConfigController],
  providers: [CalendarOAuthConfigService],
  exports: [CalendarOAuthConfigService],
})
export class CalendarOAuthConfigModule {}
