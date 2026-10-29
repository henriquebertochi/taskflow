import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import { ApiError } from "@/lib/api/client"

/**
 * Aplica o erro da API no formulário: `fields` vão para cada campo; o restante vira mensagem geral
 * (retornada para o chamador exibir num <FormAlert>).
 */
export function applyApiError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  if (!(error instanceof ApiError)) return "Algo deu errado. Tente novamente."
  const entries = Object.entries(error.fields).filter(([name]) => name in form.getValues())
  entries.forEach(([name, message]) => form.setError(name as Path<T>, { message }))
  return entries.length > 0 ? null : error.message
}
