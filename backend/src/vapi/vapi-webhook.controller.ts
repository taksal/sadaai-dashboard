// src/vapi/vapi-webhook.controller.ts
import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { GoogleCalendarService } from '../integrations/calendar/google/google-calendar.service';
import { OutlookCalendarService } from '../integrations/calendar/outlook/outlook-calendar.service';
import { CalendarConnectionService } from '../integrations/calendar/connection/calendar-connection.service';
import { AppointmentService } from '../integrations/calendar/appointment/appointment.service';
import { CalendarProvider } from '@prisma/client';

// DTO for Vapi function call parameters
class CheckAvailabilityParams {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  dateTime?: string;

  @IsOptional()
  duration?: number;
}

class CreateEventParams {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

class ReadEventsParams {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

class UpdateEventParams {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  eventId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

class DeleteEventParams {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  eventId: string;
}

// Vapi webhook payload structure
class VapiToolCall {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  function?: {
    name: string;
    arguments: string; // JSON string
  };
}

class VapiFunctionCall {
  @IsString()
  name: string;

  @IsObject()
  parameters: any;
}

class VapiMessage {
  @IsString()
  type: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VapiFunctionCall)
  functionCall?: VapiFunctionCall;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VapiToolCall)
  toolCalls?: VapiToolCall[];

  @IsOptional()
  @IsArray()
  toolCallList?: any[];
}

class VapiCallContext {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  assistantId?: string;

  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

class VapiWebhookDto {
  @ValidateNested()
  @Type(() => VapiMessage)
  message: VapiMessage;

  @IsOptional()
  @ValidateNested()
  @Type(() => VapiCallContext)
  call?: VapiCallContext;
}

@Controller('vapi/webhooks/calendar')
export class VapiWebhookController {
  private readonly logger = new Logger(VapiWebhookController.name);

  constructor(
    private googleCalendarService: GoogleCalendarService,
    private outlookCalendarService: OutlookCalendarService,
    private calendarConnectionService: CalendarConnectionService,
    private appointmentService: AppointmentService,
  ) {}

  /**
   * Resolve userId from the webhook payload
   * Priority: 1) parameters.userId, 2) call.metadata.businessOwnerId, 3) assistantId lookup, 4) error
   */
  private async resolveUserId(payload: any, params: any): Promise<string> {
    // Option 1: userId provided directly in parameters (for testing/direct calls)
    if (params.userId) {
      this.logger.log(`Using userId from parameters: ${params.userId}`);
      return params.userId;
    }

    // Option 2: Extract from Vapi call metadata (Approach 2 from guide)
    const metadataUserId = payload.call?.metadata?.businessOwnerId;
    if (metadataUserId) {
      this.logger.log(`Using userId from call metadata: ${metadataUserId}`);
      return metadataUserId;
    }

    // Option 3: Look up userId by assistantId from call context
    const assistantId = payload.call?.assistantId;
    if (assistantId) {
      this.logger.log(`Looking up userId for assistantId: ${assistantId}`);
      // TODO: Implement assistant ID to user ID mapping (Approach 3 from guide)
      // For now, throw error to guide setup
      throw new HttpException(
        `Assistant ID mapping not configured. Please set up assistant-to-user mapping in admin panel for assistant: ${assistantId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // No way to identify user
    throw new HttpException(
      'Cannot identify user: no userId in parameters and no assistantId in call context',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Main webhook endpoint for Vapi calendar function calls
   * Route: POST /api/vapi/webhooks/calendar/function-call
   */
  @Post('function-call')
  async handleFunctionCall(@Body() payload: any) {
    let toolCallId: string | undefined;

    try {
      // Log the entire raw payload for debugging
      this.logger.log('[Vapi Webhook] RAW PAYLOAD:', JSON.stringify(payload, null, 2));

      let functionName: string | undefined;
      let parameters: any;

      // Handle different Vapi webhook formats
      if (payload.message?.type === 'tool-calls' && payload.message?.toolCallList) {
        // New Vapi format with toolCallList
        const toolCall = payload.message.toolCallList[0];
        if (toolCall?.function) {
          toolCallId = toolCall.id;
          functionName = toolCall.function.name;
          parameters = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        }
      } else if (payload.message?.type === 'tool-calls' && payload.message?.toolCalls) {
        // Alternative tool-calls format
        const toolCall = payload.message.toolCalls[0];
        if (toolCall?.function) {
          toolCallId = toolCall.id;
          functionName = toolCall.function.name;
          parameters = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        }
      } else if (payload.message?.functionCall) {
        // Original format with functionCall
        toolCallId = payload.message.functionCall.id || 'default';
        functionName = payload.message.functionCall.name;
        parameters = payload.message.functionCall.parameters;
      }

      this.logger.log(`[Vapi Webhook] Extracted - ToolCallId: ${toolCallId}, Function: ${functionName}, Params:`, JSON.stringify(parameters));

      if (!functionName || !parameters) {
        this.logger.error('[Vapi Webhook] Could not extract function name or parameters from payload');
        throw new HttpException(
          'Invalid webhook payload: missing function name or parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Route to appropriate handler based on function name
      let handlerResult: string;
      switch (functionName) {
        case 'check_availability':
          handlerResult = await this.handleCheckAvailability(parameters, payload);
          break;

        case 'create_event':
          handlerResult = await this.handleCreateEvent(parameters, payload);
          break;

        case 'read_events':
          handlerResult = await this.handleReadEvents(parameters, payload);
          break;

        case 'update_event':
          handlerResult = await this.handleUpdateEvent(parameters, payload);
          break;

        case 'delete_event':
          handlerResult = await this.handleDeleteEvent(parameters, payload);
          break;

        case 'reschedule_appointment':
          handlerResult = await this.handleRescheduleAppointment(parameters, payload);
          break;

        case 'cancel_appointment':
          handlerResult = await this.handleCancelAppointment(parameters, payload);
          break;

        default:
          throw new HttpException(
            `Unknown function: ${functionName}`,
            HttpStatus.BAD_REQUEST,
          );
      }

      // Return in Vapi's expected format
      return {
        results: [
          {
            toolCallId: toolCallId || 'default',
            result: handlerResult,
          },
        ],
      };
    } catch (error) {
      this.logger.error('[Vapi Webhook] Error:', error);

      // Return error response in Vapi format
      return {
        results: [
          {
            toolCallId: toolCallId || 'default',
            error: error.message || 'Internal server error',
          },
        ],
      };
    }
  }

  /**
   * Parse and fix dateTime string from Vapi
   * Handles missing timezone and past year corrections
   */
  private parseDateTimeWithFixes(dateTimeStr: string, functionName: string, treatAsSydneyTime: boolean = false): Date {
    let date: Date;

    // Check for ISO format with or without Z suffix
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z)?$/;

    if (treatAsSydneyTime && isoDatePattern.test(dateTimeStr)) {
      // Parse as Sydney local time and convert to UTC
      // Vapi sends time in user's local timezone (Sydney in this case)
      // Strip Z suffix if present since we need to treat this as Sydney local time
      const cleanDateTimeStr = dateTimeStr.replace(/Z$/, '');
      this.logger.log(`[${functionName}] Parsing as Sydney local time: ${cleanDateTimeStr}`);

      // Use a proper library approach - create date as if it's UTC, then adjust
      // This ensures proper timezone handling
      const dateString = `${cleanDateTimeStr}+11:00`; // Explicitly set Sydney timezone offset (AEDT)
      date = new Date(dateString);

      // If the date is invalid or we need more control, fall back to manual calculation
      if (isNaN(date.getTime())) {
        const [datePart, timePart] = cleanDateTimeStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        // Determine if DST applies (AEDT = UTC+11, AEST = UTC+10)
        // Create a test date to check DST
        const testDate = new Date(year, month - 1, day);
        const isDST = testDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney', timeZoneName: 'short' }).includes('EDT');
        const offsetHours = isDST ? 11 : 10;

        this.logger.log(`[${functionName}] Month: ${month}, DST: ${isDST}, Offset: UTC+${offsetHours}`);

        // Create UTC date by subtracting Sydney offset from local time
        date = new Date(Date.UTC(
          year,
          month - 1,
          day,
          hours - offsetHours,
          minutes,
          seconds || 0
        ));
      }

      this.logger.log(`[${functionName}] Sydney time ${cleanDateTimeStr} -> UTC time ${date.toISOString()}`);
    } else {
      // Add Z if missing timezone (treat as UTC)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
        dateTimeStr = dateTimeStr + 'Z';
        this.logger.log(`[${functionName}] Added Z suffix: ${dateTimeStr}`);
      }

      date = new Date(dateTimeStr);
    }

    // Fix year if in the past (e.g., Vapi sends 2023 instead of 2025)
    const now = new Date();
    if (date < now) {
      this.logger.log(`[${functionName}] Date ${date.toISOString()} is in the past, adjusting to future`);
      const yearDiff = now.getFullYear() - date.getFullYear();
      if (yearDiff > 0) {
        date.setFullYear(now.getFullYear());
        if (date < now) {
          date.setFullYear(now.getFullYear() + 1);
        }
        this.logger.log(`[${functionName}] Adjusted to: ${date.toISOString()}`);
      }
    }

    return date;
  }

  /**
   * Format a Date to Sydney local time - Full format
   * Example: "Wednesday 10 December 2025 at 2:00 pm"
   */
  private formatSydneyDateTime(date: Date): string {
    return date.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Format a Date to Sydney local time - Short format
   * Example: "10 December at 2:00 pm"
   */
  private formatSydneyDateTimeShort(date: Date): string {
    return date.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Format a Date to Sydney local time - Basic format
   * Example: "10/12/2025, 2:00:00 pm"
   */
  private formatSydneyDateTimeBasic(date: Date): string {
    return date.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney'
    });
  }

  /**
   * Get the user's preferred calendar provider
   */
  private async getUserCalendarProvider(userId: string): Promise<CalendarProvider | null> {
    const connections = await this.calendarConnectionService.getUserConnections(userId);

    if (!connections || connections.length === 0) {
      return null;
    }

    // Prefer Google Calendar if connected, otherwise use Outlook
    const googleConnection = connections.find(c => c.provider === CalendarProvider.GOOGLE && c.isActive);
    if (googleConnection) {
      return CalendarProvider.GOOGLE;
    }

    const outlookConnection = connections.find(c => c.provider === CalendarProvider.OUTLOOK && c.isActive);
    if (outlookConnection) {
      return CalendarProvider.OUTLOOK;
    }

    return null;
  }

  /**
   * Handler: check_availability
   */
  private async handleCheckAvailability(params: CheckAvailabilityParams, payload: VapiWebhookDto): Promise<string> {
    const userId = await this.resolveUserId(payload, params);

    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let startTime: Date;
    let endTime: Date;

    // Handle Vapi format: dateTime + duration
    if (params.dateTime && params.duration !== undefined) {
      // Parse as Sydney local time (Vapi sends time in user's timezone)
      startTime = this.parseDateTimeWithFixes(params.dateTime, 'handleCheckAvailability', true);
      // Calculate endTime based on duration (in minutes)
      endTime = new Date(startTime.getTime() + params.duration * 60000);
    }
    // Handle standard format: startDate + endDate
    else if (params.startDate && params.endDate) {
      startTime = this.parseDateTimeWithFixes(params.startDate, 'handleCheckAvailability');
      endTime = this.parseDateTimeWithFixes(params.endDate, 'handleCheckAvailability');
    }
    else {
      throw new HttpException(
        'Invalid parameters: provide either (dateTime + duration) or (startDate + endDate)',
        HttpStatus.BAD_REQUEST,
      );
    }

    let availability: any;
    if (provider === CalendarProvider.GOOGLE) {
      availability = await this.googleCalendarService.checkAvailability(userId, startTime, endTime);
    } else {
      availability = await this.outlookCalendarService.checkAvailability(userId, startTime, endTime);
    }

    // Format times for display
    const startStr = this.formatSydneyDateTimeBasic(startTime);
    const endStr = this.formatSydneyDateTimeBasic(endTime);

    if (availability.isAvailable) {
      return `Yes, the calendar is available from ${startStr} to ${endStr}.`;
    } else {
      const conflictCount = availability.conflictingEvents?.length || 0;
      return `No, there are ${conflictCount} conflicting appointment${conflictCount !== 1 ? 's' : ''} during that time.`;
    }
  }

  /**
   * Handler: create_event
   */
  private async handleCreateEvent(params: any, payload: any): Promise<string> {
    // Resolve userId - will use params.userId if provided, otherwise lookup by assistantId
    const userId = await this.resolveUserId(payload, params);

    // Handle different parameter formats
    let startTime: string;
    let endTime: string;
    let title: string;
    let timezone = params.timezone || 'Australia/Sydney'; // Default to Sydney timezone

    // Check if using dateTime + duration format (Vapi format)
    if (params.dateTime && params.duration) {
      // Log the incoming datetime for debugging
      this.logger.log(`[handleCreateEvent] Received dateTime: ${params.dateTime}, duration: ${params.duration}`);

      // Parse as Sydney local time (Vapi sends time in user's timezone)
      const parsedDate = this.parseDateTimeWithFixes(params.dateTime, 'handleCreateEvent', true);

      // Use the parsed date as start time
      const startDate = parsedDate;
      const endDate = new Date(startDate.getTime() + params.duration * 60000); // duration in minutes

      startTime = startDate.toISOString();
      endTime = endDate.toISOString();

      this.logger.log(`[handleCreateEvent] Converted - Start UTC: ${startTime}, End UTC: ${endTime}`);

      title = params.title || `Appointment with ${params.customerName}`;
    } else if (params.startTime && params.endTime) {
      // Standard format
      startTime = params.startTime;
      endTime = params.endTime;
      title = params.title || `Appointment with ${params.customerName}`;
    } else {
      throw new HttpException(
        'Invalid time parameters: provide either (dateTime + duration) or (startTime + endTime)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { description, customerName, customerPhone, customerEmail, location } = params;

    if (!customerName || !customerPhone) {
      throw new HttpException(
        'Missing required fields: customerName and customerPhone are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[Vapi Webhook] Creating appointment - Start: ${startTime}, End: ${endTime}, Timezone: ${timezone}`);

    // Use AppointmentService to create appointment (which syncs to calendar automatically)
    const appointment = await this.appointmentService.createAppointment(userId, {
      customerName,
      customerPhone,
      customerEmail,
      title,
      description: description || `Appointment with ${customerName}\nPhone: ${customerPhone}${customerEmail ? `\nEmail: ${customerEmail}` : ''}`,
      startTime,
      endTime,
      timezone,
      provider: provider === CalendarProvider.GOOGLE ? 'google' : 'outlook',
      syncToCalendar: true,
      notes: 'Booked via Vapi AI assistant',
    });

    // Format the appointment time for display
    const appointmentTime = this.formatSydneyDateTime(new Date(startTime));

    // Return booking details including the booking reference
    return `Appointment successfully booked for ${customerName} on ${appointmentTime}. Your booking reference is ${appointment.bookingReference}. Please save this reference number to reschedule or cancel your appointment.`;
  }

  /**
   * Handler: read_events
   */
  private async handleReadEvents(params: ReadEventsParams, payload: VapiWebhookDto): Promise<string> {
    const userId = await this.resolveUserId(payload, params);
    const { startDate, endDate } = params;

    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse dates with fixes (add Z if missing, fix year if in past)
    const startTime = this.parseDateTimeWithFixes(startDate, 'handleReadEvents');
    const endTime = this.parseDateTimeWithFixes(endDate, 'handleReadEvents');

    let events: any;
    if (provider === CalendarProvider.GOOGLE) {
      events = await this.googleCalendarService.listEvents(userId, startTime, endTime);
    } else {
      events = await this.outlookCalendarService.listEvents(userId, startTime, endTime);
    }

    const count = events?.length || 0;
    const startStr = startTime.toLocaleDateString('en-AU');
    const endStr = endTime.toLocaleDateString('en-AU');

    if (count === 0) {
      return `No appointments found between ${startStr} and ${endStr}.`;
    } else if (count === 1) {
      return `Found 1 appointment between ${startStr} and ${endStr}: ${events[0].summary || 'Untitled'}.`;
    } else {
      const eventList = events.slice(0, 3).map((e: any) => e.summary || 'Untitled').join(', ');
      return `Found ${count} appointments between ${startStr} and ${endStr}. First few: ${eventList}${count > 3 ? ', and more' : ''}.`;
    }
  }

  /**
   * Handler: update_event
   */
  private async handleUpdateEvent(params: UpdateEventParams, payload: VapiWebhookDto): Promise<string> {
    const userId = await this.resolveUserId(payload, params);
    const { eventId, title, description, startTime, endTime, location } = params;

    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const eventData: any = {};
    if (title) eventData.summary = title;
    if (description) eventData.description = description;
    // Parse dates with fixes (add Z if missing, fix year if in past)
    if (startTime) eventData.startTime = this.parseDateTimeWithFixes(startTime, 'handleUpdateEvent');
    if (endTime) eventData.endTime = this.parseDateTimeWithFixes(endTime, 'handleUpdateEvent');
    if (location) eventData.location = location;

    if (provider === CalendarProvider.GOOGLE) {
      await this.googleCalendarService.updateEvent(userId, eventId, eventData);
    } else {
      await this.outlookCalendarService.updateEvent(userId, eventId, eventData);
    }

    return 'Appointment successfully updated in your calendar.';
  }

  /**
   * Handler: delete_event
   */
  private async handleDeleteEvent(params: DeleteEventParams, payload: VapiWebhookDto): Promise<string> {
    const userId = await this.resolveUserId(payload, params);
    const { eventId } = params;

    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (provider === CalendarProvider.GOOGLE) {
      await this.googleCalendarService.deleteEvent(userId, eventId);
    } else {
      await this.outlookCalendarService.deleteEvent(userId, eventId);
    }

    return 'Appointment successfully cancelled and removed from your calendar.';
  }

  /**
   * Handler: reschedule_appointment
   * Reschedule an appointment using booking reference
   */
  private async handleRescheduleAppointment(params: any, payload: any): Promise<string> {
    const userId = await this.resolveUserId(payload, params);
    const { bookingReference, dateTime, duration } = params;

    if (!bookingReference) {
      throw new HttpException(
        'Booking reference is required to reschedule an appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!dateTime || !duration) {
      throw new HttpException(
        'New date/time and duration are required to reschedule',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[handleRescheduleAppointment] Booking ref: ${bookingReference}, New time: ${dateTime}`);

    // Find the appointment by booking reference
    const appointment = await this.appointmentService.findByBookingReference(bookingReference, userId);

    if (appointment.status === 'CANCELLED') {
      return `Sorry, appointment ${bookingReference} has been cancelled and cannot be rescheduled. Please book a new appointment instead.`;
    }

    // Parse new date/time as Sydney local time
    const newStartTime = this.parseDateTimeWithFixes(dateTime, 'handleRescheduleAppointment', true);
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

    // Check availability at new time
    const provider = await this.getUserCalendarProvider(userId);
    if (!provider) {
      throw new HttpException(
        'No calendar connected. Please connect Google Calendar or Outlook first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let availability: any;
    if (provider === CalendarProvider.GOOGLE) {
      availability = await this.googleCalendarService.checkAvailability(userId, newStartTime, newEndTime);
    } else {
      availability = await this.outlookCalendarService.checkAvailability(userId, newStartTime, newEndTime);
    }

    if (!availability.isAvailable) {
      const newTimeStr = this.formatSydneyDateTimeShort(newStartTime);
      return `Sorry, ${newTimeStr} is not available. Please choose a different time.`;
    }

    // Update the appointment
    const updatedAppointment = await this.appointmentService.updateAppointment(
      appointment.id,
      userId,
      'CLIENT' as any,
      {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        syncToCalendar: true,
      },
    );

    // Format the new time for display
    const appointmentTime = this.formatSydneyDateTime(newStartTime);

    return `Appointment ${bookingReference} has been successfully rescheduled to ${appointmentTime}. Your booking reference remains the same.`;
  }

  /**
   * Handler: cancel_appointment
   * Cancel an appointment using booking reference
   */
  private async handleCancelAppointment(params: any, payload: any): Promise<string> {
    const userId = await this.resolveUserId(payload, params);
    const { bookingReference, reason } = params;

    if (!bookingReference) {
      throw new HttpException(
        'Booking reference is required to cancel an appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[handleCancelAppointment] Cancelling booking: ${bookingReference}`);

    // Find the appointment by booking reference
    const appointment = await this.appointmentService.findByBookingReference(bookingReference, userId);

    if (appointment.status === 'CANCELLED') {
      return `Appointment ${bookingReference} has already been cancelled.`;
    }

    // Cancel the appointment
    await this.appointmentService.cancelAppointment(
      appointment.id,
      userId,
      'CLIENT' as any,
      reason,
    );

    // Format the appointment details for confirmation
    const appointmentTime = this.formatSydneyDateTime(new Date(appointment.startTime));

    return `Appointment ${bookingReference} scheduled for ${appointmentTime} has been successfully cancelled.`;
  }
}
