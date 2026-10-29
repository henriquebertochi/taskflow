import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/lib/auth/auth-context"

// Rotas internas: exige sessão; guarda o destino para voltar após o login.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Telas de login/cadastro: quem já está logado vai direto para o início.
export function GuestRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}
