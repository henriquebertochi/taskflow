import { createBrowserRouter, Navigate, type RouteObject } from "react-router"
import { GuestRoute, ProtectedRoute } from "@/components/route-guards"
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password-page"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page"
import { HomePage } from "@/features/home/home-page"

// Exportado separado para os testes montarem com createMemoryRouter.
export const routes: RouteObject[] = [
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/cadastro", element: <RegisterPage /> },
    ],
  },
  // Acessíveis logado ou não (o link do e-mail pode ser aberto em qualquer sessão).
  { path: "/esqueci-senha", element: <ForgotPasswordPage /> },
  // Caminho fixo: o backend monta o link como ${APP_URL}/redefinir-senha?token=...
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },
  { element: <ProtectedRoute />, children: [{ path: "/", element: <HomePage /> }] },
  { path: "*", element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
