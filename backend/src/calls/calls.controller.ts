// src/calls/calls.controller.ts
import { Controller, Get, Post, Param, Query, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CallsService } from './calls.service';
import { VapiService } from '../vapi/vapi.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallStatus } from '@prisma/client';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private callsService: CallsService,
    private vapiService: VapiService,
    private usersService: UsersService,
  ) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: CallStatus,
    @Query('assistantId') assistantId?: string,
  ) {
    // Check if user has assistants configured
    if (req.user.role === 'CLIENT') {
      const user = await this.usersService.findOne(req.user.userId);
      const vapiAssistants = (user as any).vapiAssistants;

      if (!vapiAssistants || (Array.isArray(vapiAssistants) && vapiAssistants.length === 0)) {
        return [];
      }
    }

    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;
    if (assistantId) filters.assistantId = assistantId;

    return this.callsService.findAll(req.user.userId, req.user.role, filters);
  }

  @Get('recent')
  async getRecentCalls(@Request() req, @Query('limit') limit?: string) {
    // Check if user has assistants configured
    const user = await this.usersService.findOne(req.user.userId);
    const vapiAssistants = (user as any).vapiAssistants;

    if (!vapiAssistants || (Array.isArray(vapiAssistants) && vapiAssistants.length === 0)) {
      return [];
    }

    const limitNum = limit ? parseInt(limit) : 10;
    return this.callsService.getRecentCalls(req.user.userId, limitNum);
  }

  @Get('analytics')
  async getAnalytics(@Request() req, @Query('days') days?: string, @Query('assistantId') assistantId?: string) {
    // Check if user has assistants configured
    const user = await this.usersService.findOne(req.user.userId);
    const vapiAssistants = (user as any).vapiAssistants;

    if (!vapiAssistants || (Array.isArray(vapiAssistants) && vapiAssistants.length === 0)) {
      return {
        trendData: [],
        statusBreakdown: {
          completed: 0,
          transferred: 0,
          failed: 0,
        },
        totalCalls: 0,
      };
    }

    const daysNum = days ? parseInt(days) : 30;
    return this.callsService.getCallAnalytics(req.user.userId, daysNum, assistantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.callsService.findOne(id, req.user.userId, req.user.role);
  }

  @Post('sync')
  async syncFromVapi(@Request() req) {
    // Get user data with VAPI credentials and assigned assistants
    const user = await this.usersService.findOne(req.user.userId);

    // Check if user has VAPI API key configured by admin
    const vapiApiKey = (user as any).vapiApiKey;
    if (!vapiApiKey) {
      throw new BadRequestException('VAPI API credentials not configured. Please contact your administrator.');
    }

    // Check if user has assigned assistants
    const vapiAssistants = (user as any).vapiAssistants;
    if (!vapiAssistants || (Array.isArray(vapiAssistants) && vapiAssistants.length === 0)) {
      throw new BadRequestException('No VAPI assistants assigned. Please contact your administrator.');
    }

    // Extract assistant IDs from the user's assigned assistants
    const assistantIds = Array.isArray(vapiAssistants)
      ? vapiAssistants.map((a: any) => a.id)
      : [];

    // Fetch calls from VAPI using user's credentials
    const vapiOrgId = (user as any).vapiOrgId;
    const vapiCalls = await this.vapiService.getCallsWithCredentials(
      vapiApiKey,
      undefined,
      vapiOrgId || undefined,
    );

    // Filter calls to only include those from assigned assistants
    const filteredCalls = vapiCalls.filter((call: any) =>
      assistantIds.includes(call.assistantId)
    );

    // Sync the filtered calls to our database
    return this.callsService.syncFromVapi(req.user.userId, filteredCalls);
  }
}
