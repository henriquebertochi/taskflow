import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { FormAlert } from "@/components/form-alert"
import { SubmitButton } from "@/components/submit-button"
import { TextField } from "@/components/text-field"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { authApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { applyApiError } from "@/lib/forms"
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas"

export function ResetPasswordPage() {
  const token = useSearchParams()[0].get("token") ?? ""
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  })
  const { errors, isSubmitting } = form.formState

  // Verifica o link antes de mostrar o formulário (inválido, expirado ou já usado).
  const check = useQuery({
    queryKey: ["reset-token", token],
    queryFn: () => authApi.validateResetToken(token),
    enabled: token !== "",
    retry: false,
    staleTime: Infinity,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authApi.resetPassword({ token, ...values })
      toast.success("Senha redefinida com sucesso. Faça login com a nova senha.")
      navigate("/login", { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_RESET_TOKEN") {
        void check.refetch()
        return
      }
      setFormError(applyApiError(form, error))
    }
  })

  const invalidLink = token === "" || check.isError
  const networkFailure = check.error instanceof ApiError && check.error.code === "NETWORK_ERROR"

  if (invalidLink) {
    return (
      <AuthLayout
        title={networkFailure ? "Não foi possível verificar o link" : "Link inválido"}
        description={
          networkFailure
            ? "Verifique sua conexão e tente novamente."
            : "Este link de redefinição é inválido, expirou ou já foi utilizado."
        }
      >
        {networkFailure ? (
          <Button className="w-full" onClick={() => void check.refetch()}>
            Tentar novamente
          </Button>
        ) : (
          <Button className="w-full" asChild>
            <Link to="/esqueci-senha">Solicitar novo link</Link>
          </Button>
        )}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nova senha" description="Defina uma nova senha para sua conta">
      {check.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <TextField
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              error={errors.password}
              {...form.register("password")}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              error={errors.passwordConfirmation}
              {...form.register("passwordConfirmation")}
            />
            <SubmitButton pending={isSubmitting}>Redefinir senha</SubmitButton>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  )
}
