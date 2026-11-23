import { useQuery } from "@tanstack/react-query"
import { Avatar } from "@/components/avatar"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { groupKeys, groupsApi } from "@/lib/api/groups"

// Integrantes do grupo pelo nome (RF06).
export function MembersCard({ groupId }: { groupId: number }) {
  const query = useQuery({ queryKey: groupKeys.members(groupId), queryFn: () => groupsApi.members(groupId) })
  const members = query.data?.members

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Integrantes{members ? ` (${members.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <ul aria-label="Integrantes" className="flex flex-col gap-3">
            {members!.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={member.name} className="size-6 text-[0.625rem]" />
                  <span className="truncate">{member.name}</span>
                </span>
                {member.role === "creator" && <Badge variant="secondary">Criador</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
