import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/client"

// Falha ao carregar dados: mostra a mensagem da API e permite tentar de novo.
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Algo deu errado. Tente novamente."
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        {message}
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}
