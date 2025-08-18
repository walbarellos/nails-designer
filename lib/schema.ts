import { z } from 'zod'

export const StatusEnum = z.enum(['scheduled','confirmed','done','canceled'])

export const AppointmentSchema = z.object({
    id: z.string(),
                                          name: z.string().min(1, 'Informe o nome'),
                                          phone: z.string().min(8, 'Telefone inválido'),
                                          startsAt: z.string().refine((v)=>!Number.isNaN(Date.parse(v)), 'Data/Hora inválidas'),
                                          notes: z.string().optional(),
                                          status: StatusEnum,
                                          createdAt: z.string(),
                                          version: z.literal(1)
})
export type Appointment = z.infer<typeof AppointmentSchema>

export const NewAppointmentSchema = z.object({
    name: z.string().min(1, 'Informe o nome'),
                                             phone: z.string().min(8, 'Telefone inválido'),
                                             date: z.string().min(1, 'Informe a data'),
                                             time: z.string().min(1, 'Informe a hora'),
                                             notes: z.string().optional(),
})
export type NewAppointment = z.infer<typeof NewAppointmentSchema>
