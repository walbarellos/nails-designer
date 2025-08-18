import { formatPt } from './time'
import { toE164OrDigits } from './phone'

export function buildWhatsAppLink(name: string, phone: string, when: Date, notes?: string) {
  const { d, t } = formatPt(when)
  const msg = `Olá, ${name}! 💅%0A`+
              `Agendamento:%0A`+
              `• Data: ${d}%0A`+
              `• Hora: ${t}%0A`+
              `Obs.: ${notes?.trim() || '-'}%0A`+
              `%0ASe precisar ajustar, me avise por aqui. ✨`
  const ph = toE164OrDigits(phone)
  return `https://wa.me/${encodeURIComponent(ph.replace('+',''))}?text=${msg}`
}
