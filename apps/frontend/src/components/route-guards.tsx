import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/lib/auth/auth-context"

// Rotas internas: exige sessão; guarda o destino para voltar após o login.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Telas de login/cadastro: quem já está logado vai para o destino guardado (ex.: convite) ou o início.
export function GuestRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? "/"} replace />
  }
  return <Outlet />
}
