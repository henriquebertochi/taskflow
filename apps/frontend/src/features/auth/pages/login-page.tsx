import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { AuthLayout } from "@/components/auth-layout"
import { FormAlert } from "@/components/form-alert"
import { SubmitButton } from "@/components/submit-button"
import { TextField } from "@/components/text-field"
import { FieldGroup } from "@/components/ui/field"
import { useAuth } from "@/lib/auth/auth-context"
import { applyApiError } from "@/lib/forms"
import { loginSchema, type LoginValues } from "../schemas"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await login(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true })
    } catch (error) {
      setFormError(applyApiError(form, error))
    }
  })

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta com e-mail e senha"
      footer={
        <span>
          Não tem conta?&nbsp;
          <Link to="/cadastro" className="text-foreground underline underline-offset-4">
            Cadastre-se
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormAlert message={formError} />
          <TextField label="E-mail" type="email" autoComplete="email" error={errors.email} {...form.register("email")} />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password}
            {...form.register("password")}
          />
          <Link to="/esqueci-senha" className="text-sm text-muted-foreground underline underline-offset-4">
            Esqueci minha senha
          </Link>
          <SubmitButton pending={isSubmitting}>Entrar</SubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
