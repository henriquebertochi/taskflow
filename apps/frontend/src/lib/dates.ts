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
