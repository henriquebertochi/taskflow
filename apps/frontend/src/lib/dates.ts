// Datas "puras" (prazo) circulam como AAAA-MM-DD, sem fuso.

export function todayISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// "2026-12-05" → "05/12/2026"
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

// Dias entre hoje e o prazo (negativo = já passou), contando datas puras.
export function daysUntil(iso: string, today = todayISO()) {
  const toUTC = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUTC(iso) - toUTC(today)) / 86_400_000)
}

// "hoje", "amanhã", "em 3 dias", "ontem", "há 2 dias": complementa a data absoluta do prazo.
export function relativeDue(iso: string, today = todayISO()) {
  const days = daysUntil(iso, today)
  if (days === 0) return "hoje"
  if (days === 1) return "amanhã"
  if (days === -1) return "ontem"
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`
}
