// src/calls/calls.module.ts
import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { VapiModule } from '../vapi/vapi.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [VapiModule, UsersModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
