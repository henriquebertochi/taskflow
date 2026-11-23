import type { FieldError } from "react-hook-form"
import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type TextareaFieldProps = Omit<React.ComponentProps<typeof Textarea>, "id"> & {
  name: string
  label: string
  error?: FieldError
}

// Igual ao TextField, para textos longos (descrições).
export function TextareaField({ name, label, error, ...props }: TextareaFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea id={name} name={name} aria-invalid={!!error} {...props} />
      <FieldErrorMessage errors={[error]} />
    </Field>
  )
}
