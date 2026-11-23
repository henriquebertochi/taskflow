import { CalendarDaysIcon } from "lucide-react"
import { useState } from "react"
import type { FieldError } from "react-hook-form"
import { ptBR } from "react-day-picker/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { todayISO } from "@/lib/dates"

type DatePickerFieldProps = Omit<React.ComponentProps<typeof Input>, "id" | "type" | "value" | "min"> & {
  name: string
  label: string
  error?: FieldError
  /** Valor atual (AAAA-MM-DD), para marcar o dia no calendário. */
  value: string
  /** Menor data selecionável (AAAA-MM-DD). */
  min?: string | number
  onPick: (iso: string) => void
}

const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Data digitável (input nativo, bom no celular) + calendário do shadcn num popover.
export function DatePickerField({ name, label, error, value, min, onPick, ...inputProps }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? toDate(value) : undefined
  const minISO = min === undefined ? undefined : String(min)
  const minDate = minISO ? toDate(minISO) : undefined

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          type="date"
          min={minISO}
          aria-invalid={!!error}
          className="flex-1 [&::-webkit-calendar-picker-indicator]:hidden"
          {...inputProps}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Escolher no calendário">
              <CalendarDaysIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selected}
              defaultMonth={selected ?? minDate}
              disabled={minDate ? { before: minDate } : undefined}
              onSelect={(date) => {
                if (!date) return
                onPick(todayISO(date))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <FieldErrorMessage errors={[error]} />
    </Field>
  )
}
