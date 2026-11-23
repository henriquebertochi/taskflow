import { ChevronDownIcon, LogOutIcon } from "lucide-react"
import { Link, Outlet, useNavigate } from "react-router"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth/auth-context"

// Moldura da área logada: cabeçalho com logo, tema e menu do usuário.
export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Ir para Meus grupos">
          <Logo />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-0">
                <span className="truncate">{user?.name}</span>
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOutIcon />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
