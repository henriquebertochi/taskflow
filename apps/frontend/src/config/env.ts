// Em dev o Vite faz proxy de /api para o backend; em produção defina VITE_API_URL.
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "/api",
}
