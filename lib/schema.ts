import { z } from 'zod'

export const StatusEnum = z.enum(['scheduled','confirmed','done','canceled'])
export type Status = z.infer<typeof StatusEnum>

// ISO 8601 com offset (Z). Ex.: 2025-08-24T18:00:00.000Z
const IsoDateTimeString = z.string().datetime({ offset: true })

export const AppointmentSchema = z.object({
    id: z.string().min(1),
                                          name: z.string().min(1, 'Informe o nome'),
                                          phone: z.string().min(8, 'Telefone inválido'),
                                          startsAt: IsoDateTimeString,                    // ISO válido
                                          notes: z.string().trim().optional(),
                                          status: StatusEnum,
                                          createdAt: IsoDateTimeString,                   // ISO válido
                                          version: z.literal(1)
}).strict()

export type Appointment = z.infer<typeof AppointmentSchema>

export const NewAppointmentSchema = z.object({
    name: z.string().min(1, 'Informe o nome'),
                                             phone: z.string().min(8, 'Telefone inválido'),
                                             date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
                                             time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM)'),
                                             notes: z.string().trim().optional(),
}).strict()

export type NewAppointment = z.infer<typeof NewAppointmentSchema>

// Helpers (opcionais) para padronizar criação/parse:
export const parseAppointment = (data: unknown) => AppointmentSchema.parse(data)
export const parseAppointments = (data: unknown) => z.array(AppointmentSchema).parse(data)
export const createAppointment = (input: Omit<Appointment, 'id' | 'createdAt' | 'version'> & { id?: string }) => {
    const now = new Date().toISOString()
    const id = input.id ?? crypto.randomUUID()
    return AppointmentSchema.parse({
        ...input,
        id,
        createdAt: now,
        version: 1
    })
}
