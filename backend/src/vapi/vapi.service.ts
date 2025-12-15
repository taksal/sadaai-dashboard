// src/vapi/vapi.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class VapiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('VAPI_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('VAPI_BASE_URL') || 'https://api.vapi.ai';
  }

  async getAssistants() {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/assistant`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching VAPI assistants:', error.message);
      return [];
    }
  }

  async getAssistant(assistantId: string) {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/assistant/${assistantId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching VAPI assistant:', error.message);
      return null;
    }
  }

  async listAssistantsWithCredentials(apiKey: string, organizationId?: string) {
    try {
      const headers: any = {
        Authorization: `Bearer ${apiKey}`,
      };

      if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/assistant`, {
          headers,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching VAPI assistants with credentials:', error.message);
      throw new Error('Failed to fetch assistants. Please check your API credentials.');
    }
  }

  async getCallsWithCredentials(apiKey: string, assistantId?: string, organizationId?: string) {
    try {
      const headers: any = {
        Authorization: `Bearer ${apiKey}`,
      };

      if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
      }

      // Build query parameters
      const params: any = {};
      if (assistantId) {
        params.assistantId = assistantId;
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/call`, {
          headers,
          params,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching VAPI calls with credentials:', error.message);
      throw new Error('Failed to fetch calls from VAPI. Please check your API credentials.');
    }
  }

  async getCalls() {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/call`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching VAPI calls:', error.message);
      return [];
    }
  }

  async getActiveCalls(assistantIds: string[], userApiKey?: string, userOrgId?: string) {
    try {
      // IMPORTANT: Multi-tenant - MUST use user's API key, not global
      if (!userApiKey) {
        console.error('No VAPI API key provided for user. Multi-tenant requires user credentials.');
        return 0;
      }

      const headers: any = {
        Authorization: `Bearer ${userApiKey}`,
      };

      if (userOrgId) {
        headers['X-Organization-Id'] = userOrgId;
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/call`, {
          headers,
        }),
      );
      
      const allCalls = response.data;
      
      // Filter for active calls (status: 'in-progress') for the specified assistants
      const activeCalls = allCalls.filter((call: any) => {
        const isActive = call.status === 'in-progress' || call.status === 'queued' || call.status === 'ringing';
        const isForAssistant = assistantIds.includes(call.assistantId);
        return isActive && isForAssistant;
      });
      
      return activeCalls.length;
    } catch (error) {
      console.error('Error fetching active VAPI calls:', error.message);
      return 0;
    }
  }
}
