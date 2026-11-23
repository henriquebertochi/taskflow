import type { FieldError } from "react-hook-form"
import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"

type SelectFieldProps = Omit<React.ComponentProps<typeof NativeSelect>, "id"> & {
  name: string
  label: string
  error?: FieldError
}

// Select nativo (bom no celular e acessível) no mesmo padrão do TextField.
export function SelectField({ name, label, error, children, ...props }: SelectFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <NativeSelect id={name} name={name} aria-invalid={!!error} className="w-full" {...props}>
        {children}
      </NativeSelect>
      <FieldErrorMessage errors={[error]} />
    </Field>
  )
}
