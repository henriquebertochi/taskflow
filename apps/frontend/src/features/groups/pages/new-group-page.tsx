import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { FormAlert } from "@/components/form-alert"
import { SubmitButton } from "@/components/submit-button"
import { TextareaField } from "@/components/textarea-field"
import { TextField } from "@/components/text-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { groupKeys, groupsApi } from "@/lib/api/groups"
import { applyApiError } from "@/lib/forms"
import { createGroupSchema, type CreateGroupValues } from "../schemas"

export function NewGroupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", description: "" },
    mode: "onTouched",
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { group } = await groupsApi.create(values)
      queryClient.setQueryData(groupKeys.detail(group.id), { group })
      await queryClient.invalidateQueries({ queryKey: groupKeys.all, exact: true })
      navigate(`/grupos/${group.id}`)
    } catch (error) {
      setFormError(applyApiError(form, error))
    }
  })

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle role="heading" aria-level={1}>
          Criar grupo
        </CardTitle>
        <CardDescription>Organize as tarefas, os responsáveis e os prazos de um projeto em um só lugar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <TextField label="Nome do grupo" autoComplete="off" error={errors.name} {...form.register("name")} />
            <TextareaField
              label="Descrição (opcional)"
              rows={3}
              error={errors.description}
              {...form.register("description")}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" asChild>
                <Link to="/">Cancelar</Link>
              </Button>
              <div className="sm:flex-1">
                <SubmitButton pending={isSubmitting}>Criar grupo</SubmitButton>
              </div>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
