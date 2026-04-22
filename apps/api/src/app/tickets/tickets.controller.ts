// apps/api/src/app/tickets/tickets.controller.ts
import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ServiceTicket, ServiceTicketSchema } from '@a3-service/shared-schema';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('tickets')
export class TicketsController {
  @Post()
  @UsePipes(new ZodValidationPipe(ServiceTicketSchema))
  createTicket(@Body() ticket: ServiceTicket) {
    // Process the validated ticket (e.g., save to DB, trigger scheduling)
    return { status: 'success', id: ticket.id };
  }
}
