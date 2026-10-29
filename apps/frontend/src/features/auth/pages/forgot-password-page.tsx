import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheckIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { AuthLayout } from "@/components/auth-layout"
import { FormAlert } from "@/components/form-alert"
import { SubmitButton } from "@/components/submit-button"
import { TextField } from "@/components/text-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FieldGroup } from "@/components/ui/field"
import { authApi } from "@/lib/api/auth"
import { applyApiError } from "@/lib/forms"
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas"

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null)
  // Mensagem neutra do backend: igual exista ou não o e-mail (não revela contas).
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { message } = await authApi.forgotPassword(values)
      setSentMessage(message)
    } catch (error) {
      setFormError(applyApiError(form, error))
    }
  })

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Enviaremos um link para você redefinir a senha"
      footer={
        <Link to="/login" className="text-foreground underline underline-offset-4">
          Voltar ao login
        </Link>
      }
    >
      {sentMessage ? (
        <Alert>
          <MailCheckIcon />
          <AlertDescription>{sentMessage}</AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <TextField label="E-mail" type="email" autoComplete="email" error={errors.email} {...form.register("email")} />
            <SubmitButton pending={isSubmitting}>Enviar link</SubmitButton>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  )
}
