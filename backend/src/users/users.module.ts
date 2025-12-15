// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { BillingSchedulerService } from './billing-scheduler.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, BillingSchedulerService],
  exports: [UsersService],
})
export class UsersModule {}
