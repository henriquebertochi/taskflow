import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { FormAlert } from "@/components/form-alert"
import { SubmitButton } from "@/components/submit-button"
import { TextField } from "@/components/text-field"
import { FieldGroup } from "@/components/ui/field"
import { authApi } from "@/lib/api/auth"
import { applyApiError } from "@/lib/forms"
import { registerSchema, type RegisterValues } from "../schemas"

export function RegisterPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", passwordConfirmation: "" },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authApi.register(values)
      toast.success("Conta criada com sucesso. Faça login para continuar.")
      navigate("/login", { replace: true })
    } catch (error) {
      setFormError(applyApiError(form, error))
    }
  })

  return (
    <AuthLayout
      title="Criar conta"
      description="Informe seus dados para começar"
      footer={
        <span>
          Já tem conta?&nbsp;
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormAlert message={formError} />
          <TextField label="Nome completo" autoComplete="name" error={errors.name} {...form.register("name")} />
          <TextField label="E-mail" type="email" autoComplete="email" error={errors.email} {...form.register("email")} />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            error={errors.password}
            {...form.register("password")}
          />
          <TextField
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            error={errors.passwordConfirmation}
            {...form.register("passwordConfirmation")}
          />
          <SubmitButton pending={isSubmitting}>Criar conta</SubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
