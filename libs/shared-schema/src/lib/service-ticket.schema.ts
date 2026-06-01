import { z } from 'zod';

/**
 * ServiceTicketSchema provides a unified validation contract for HVAC jobs.
 * This schema is utilized by both the NestJS API and the Expo Mobile client.
 */
export const ServiceTicketSchema = z.object({
  id: z.uuid("Invalid Ticket ID"),
  technicianId: z.string().min(1, "Technician ID is required"),
  customerName: z.string().min(2, "Customer name must be provided"),
  location: z.object({
    address: z.string(),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  }),
  equipment: z.object({
    type: z.enum(['AC', 'FURNACE', 'HEAT_PUMP']),
    serialNumber: z.string().min(5, "Serial number is vital for warranty"),
    brand: z.string(),
  }),
  workDescription: z.string().max(2000),
  laborHours: z.number().min(0.25, "Minimum labor is 15 minutes"),
  timestamp: z.iso.datetime(),
});

export type ServiceTicket = z.infer<typeof ServiceTicketSchema>;
