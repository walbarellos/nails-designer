// Sanitiza telefone para um formato aceitável pelo wa.me
// Preferência: E.164. Se não conseguir, remove não dígitos e tenta com BR (+55).
export function toE164OrDigits(input: string): string {
    const raw = (input || '').trim()
    if (!raw) return ''
        // já E.164
        if (/^\+?[1-9]\d{7,14}$/.test(raw)) {
            return raw.startsWith('+') ? raw : ('+'+raw)
        }
        // remove não dígitos
        const digits = raw.replace(/\D+/g, '')
        if (digits.length >= 10 && digits.length <= 13) {
            // heurística: se não vier com +, assume BR
            return '+55' + digits.replace(/^0+/, '')
        }
        return digits // fallback
}

// Máscara visual simples para BR: (DD) 9XXXX-XXXX
export function maskBR(phone: string): string {
    const d = (phone || '').replace(/\D+/g, '').slice(0, 11)
    const p1 = d.slice(0,2)
    const p2 = d.slice(2,7)
    const p3 = d.slice(7,11)
    if (d.length <= 2) return d
        if (d.length <= 7) return `(${p1}) ${p2}`
            return `(${p1}) ${p2}-${p3}`
}
