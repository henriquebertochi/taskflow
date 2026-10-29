import type { FieldError } from "react-hook-form"
import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  name: string
  label: string
  error?: FieldError
}

// Campo de formulário padrão: label + input + mensagem de erro, com estado inválido acessível.
export function TextField({ name, label, error, ...inputProps }: TextFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} aria-invalid={!!error} {...inputProps} />
      <FieldErrorMessage errors={[error]} />
    </Field>
  )
}
