import { useQuery } from "@tanstack/react-query"
import { ArrowLeftIcon, SearchXIcon } from "lucide-react"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/client"
import { groupKeys, groupsApi } from "@/lib/api/groups"

// Página do grupo (RF05). Integrantes (RF06) e quadro de tarefas (RF08) entram aqui.
export function GroupPage() {
  const { groupId = "" } = useParams()
  const query = useQuery({ queryKey: groupKeys.detail(groupId), queryFn: () => groupsApi.get(groupId) })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          icon={<SearchXIcon />}
          title="Grupo não encontrado"
          description="O grupo não existe ou você não faz parte dele."
          action={
            <Button asChild>
              <Link to="/">Voltar para Meus grupos</Link>
            </Button>
          }
        />
      )
    }
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />
  }

  const { group } = query.data
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Meus grupos
        </Link>
        <h1 className="text-2xl font-semibold break-words">{group.name}</h1>
        {group.description && <p className="whitespace-pre-line text-muted-foreground">{group.description}</p>}
      </div>
    </div>
  )
}
