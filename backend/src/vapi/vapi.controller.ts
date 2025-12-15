// src/vapi/vapi.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { VapiService } from './vapi.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class ListAssistantsDto {
  @IsString()
  apiKey: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

@Controller('vapi')
@UseGuards(JwtAuthGuard)
export class VapiController {
  constructor(
    private vapiService: VapiService,
    private usersService: UsersService,
  ) {}

  @Get('assistants')
  async getAssistants() {
    return this.vapiService.getAssistants();
  }

  @Get('assistants/:id')
  async getAssistant(@Param('id') id: string) {
    return this.vapiService.getAssistant(id);
  }

  @Post('list-assistants')
  async listAssistantsWithCredentials(@Body() dto: ListAssistantsDto) {
    return this.vapiService.listAssistantsWithCredentials(dto.apiKey, dto.organizationId);
  }

  @Get('active-calls')
  async getActiveCalls(@Query('assistantIds') assistantIds: string, @Query('userId') userId: string) {
    const ids = assistantIds ? assistantIds.split(',') : [];
    
    // Get user's VAPI credentials - MULTI-TENANT
    let userApiKey: string | undefined;
    let userOrgId: string | undefined;
    
    if (userId) {
      const user = await this.usersService.findOne(userId);
      userApiKey = user.vapiApiKey;
      userOrgId = user.vapiOrgId;
      
      console.log(`[Live Calls] User ${userId} - API Key configured: ${!!userApiKey}, Org ID: ${userOrgId || 'none'}, Assistants: ${ids.join(',')}`);
    }
    
    const count = await this.vapiService.getActiveCalls(ids, userApiKey, userOrgId);
    return { activeCalls: count };
  }
}
