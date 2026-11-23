import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { ApiError } from "@/lib/api/client"
import { AuthProvider } from "@/lib/auth/auth-context"
import { ThemeProvider } from "@/lib/theme/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Erros 4xx (ex.: grupo não encontrado) não melhoram tentando de novo.
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
          },
        },
      }),
  )
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster richColors />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
