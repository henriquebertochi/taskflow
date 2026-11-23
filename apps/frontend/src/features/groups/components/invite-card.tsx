import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CopyIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError } from "@/lib/api/client"
import { type Group, groupKeys, groupsApi, inviteUrl } from "@/lib/api/groups"

// Link de convite do grupo (RF06): qualquer integrante copia; só o criador gera outro.
export function InviteCard({ group }: { group: Group }) {
  const queryClient = useQueryClient()

  const regenerate = useMutation({
    mutationFn: () => groupsApi.regenerateInvite(group.id),
    onSuccess: ({ inviteCode }) => {
      queryClient.setQueryData<{ group: Group }>(groupKeys.detail(group.id), (old) =>
        old ? { group: { ...old.group, inviteCode } } : old,
      )
      toast.success("Novo link gerado. O link anterior não funciona mais.")
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar um novo link."),
  })

  async function copy() {
    const url = inviteUrl(group.inviteCode)
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link de convite copiado. Agora é só colar no grupo da turma.")
    } catch {
      toast.info(`Copie o link: ${url}`, { duration: 15000 })
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Convidar colegas
        </CardTitle>
        <CardDescription>Envie o link (por exemplo, no WhatsApp) para quem vai participar do trabalho.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={() => void copy()}>
          <CopyIcon data-icon="inline-start" />
          Copiar convite
        </Button>
        {group.role === "creator" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={regenerate.isPending}>
                <RefreshCwIcon data-icon="inline-start" />
                Gerar novo link
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerar novo link de convite?</AlertDialogTitle>
                <AlertDialogDescription>
                  O link atual deixará de funcionar. Quem já entrou no grupo continua nele.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => regenerate.mutate()}>Gerar novo link</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
