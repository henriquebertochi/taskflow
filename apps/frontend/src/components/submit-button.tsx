import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type SubmitButtonProps = { pending: boolean; children: React.ReactNode }

export function SubmitButton({ pending, children }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
