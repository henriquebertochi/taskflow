import { useQuery } from "@tanstack/react-query"
import { PlusIcon, UsersIcon } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { groupKeys, groupsApi } from "@/lib/api/groups"

// "Meus grupos" (RF05): tela inicial da área logada.
export function GroupsPage() {
  const query = useQuery({ queryKey: groupKeys.all, queryFn: groupsApi.list })
  const groups = query.data?.groups

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium sm:text-3xl">Meus grupos</h1>
        {groups && groups.length > 0 && (
          <Button asChild>
            <Link to="/grupos/novo">
              <PlusIcon data-icon="inline-start" />
              Criar grupo
            </Link>
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : groups!.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="Você ainda não participa de nenhum grupo"
          description="Crie um grupo ou solicite um link de convite a um integrante."
          action={
            <Button asChild>
              <Link to="/grupos/novo">
                <PlusIcon data-icon="inline-start" />
                Criar grupo
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups!.map((group) => (
            <li key={group.id}>
              <Link
                to={`/grupos/${group.id}`}
                className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="h-full transition-[box-shadow,background-color] duration-150 hover:ring-foreground/20 hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="break-words">{group.name}</span>
                      {group.role === "creator" && <Badge variant="secondary">Criador</Badge>}
                    </CardTitle>
                    {group.description && <CardDescription className="line-clamp-2">{group.description}</CardDescription>}
                    <CardDescription className="flex items-center gap-1.5">
                      <UsersIcon className="size-4" />
                      {group.memberCount} {group.memberCount === 1 ? "integrante" : "integrantes"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
