// src/users/users.controller.ts
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

import { IsEmail, IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, IsNotEmpty, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  pricePerMinute?: number;

  @IsNumber()
  @IsOptional()
  monthlyCharge?: number;

  @IsArray()
  @IsOptional()
  appAccess?: string[];

  @IsBoolean()
  @IsOptional()
  mustChangePassword?: boolean;
}

class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  pricePerMinute?: number;

  @IsNumber()
  @IsOptional()
  monthlyCharge?: number;

  @IsString()
  @IsOptional()
  billingCycle?: string;

  @IsString()
  @IsOptional()
  vapiAssistantId?: string;

  @IsOptional()
  vapiAssistants?: any;

  @IsNumber()
  @IsOptional()
  includedMinutes?: number;

  @IsNumber()
  @IsOptional()
  overageRate?: number;

  @IsNumber()
  @IsOptional()
  billingResetDay?: number;

  @IsString()
  @IsOptional()
  vapiApiKey?: string;

  @IsString()
  @IsOptional()
  vapiOrgId?: string;

  @IsArray()
  @IsOptional()
  appAccess?: string[];
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user.role);
  }

  @Get('stats/:id')
  async getUserStats(@Param('id') id: string, @Request() req, @Query('days') days?: string, @Query('assistantId') assistantId?: string) {
    // Clients can only view their own stats
    if (req.user.role === 'CLIENT' && req.user.userId !== id) {
      throw new Error('Unauthorized');
    }
    const daysNum = days ? parseInt(days) : undefined;
    return this.usersService.getUserStats(id, daysNum, assistantId);
  }

  @Get('monthly-bill/:id')
  async getMonthlyBill(@Param('id') id: string, @Request() req) {
    // Clients can only view their own billing
    if (req.user.role === 'CLIENT' && req.user.userId !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.getMonthlyBill(id);
  }

  @Post(':id/save-billing')
  @Roles(UserRole.ADMIN)
  async saveBillingHistory(@Param('id') id: string) {
    return this.usersService.saveBillingHistory(id);
  }

  @Get('billing-history/:id')
  async getBillingHistory(@Param('id') id: string, @Request() req) {
    // Clients can only view their own billing history
    if (req.user.role === 'CLIENT' && req.user.userId !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.getBillingHistory(id);
  }

  @Patch('billing-history/:billingId/status')
  @Roles(UserRole.ADMIN)
  async updateBillingStatus(
    @Param('billingId') billingId: string,
    @Body() body: { status: string }
  ) {
    return this.usersService.updateBillingStatus(billingId, body.status);
  }

  @Delete('billing-history/:billingId')
  @Roles(UserRole.ADMIN)
  async deleteBillingHistory(@Param('billingId') billingId: string) {
    return this.usersService.deleteBillingHistory(billingId);
  }

  @Get('assistant-ids/:id')
  async getUserAssistantIds(@Param('id') id: string, @Request() req) {
    // Clients can only view their own assistant IDs
    if (req.user.role === 'CLIENT' && req.user.userId !== id) {
      throw new Error('Unauthorized');
    }
    const user = await this.usersService.findOne(id);
    const assistantIds = user.vapiAssistants && Array.isArray(user.vapiAssistants)
      ? user.vapiAssistants.map((a: any) => a.id)
      : [];
    return { assistantIds };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    // Clients can only view their own profile
    if (req.user.role === 'CLIENT' && req.user.userId !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async patch(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Put(':id/password')
  @Roles(UserRole.ADMIN)
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(id, changePasswordDto.newPassword);
  }

  @Post(':id/force-logout')
  @Roles(UserRole.ADMIN)
  async forceLogout(@Param('id') id: string) {
    return this.usersService.forceLogout(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
