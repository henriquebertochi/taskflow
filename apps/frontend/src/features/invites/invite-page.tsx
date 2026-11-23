import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { Link, Navigate, useParams } from "react-router"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api/client"
import { groupKeys, invitesApi } from "@/lib/api/groups"
import { useAuth } from "@/lib/auth/auth-context"

// /convite/:code (RF06). Logado: entra direto no grupo. Sem login: mostra o grupo e leva ao
// login/cadastro, que voltam para cá depois.
export function InvitePage() {
  const { code = "" } = useParams()
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <JoinInvite code={code} /> : <GuestInvite code={code} />
}

function InvalidInvite() {
  return (
    <AuthLayout
      title="Convite inválido ou expirado"
      description="Solicite um novo link de convite a um integrante do grupo."
    >
      <Button className="w-full" asChild>
        <Link to="/">Ir para o início</Link>
      </Button>
    </AuthLayout>
  )
}

function NetworkFailure({ onRetry }: { onRetry: () => void }) {
  return (
    <AuthLayout title="Não foi possível abrir o convite" description="Verifique sua conexão e tente novamente.">
      <Button className="w-full" onClick={onRetry}>
        Tentar novamente
      </Button>
    </AuthLayout>
  )
}

function Loading() {
  return (
    <AuthLayout title="Abrindo convite…">
      <div className="flex justify-center" aria-busy="true">
        <Spinner />
      </div>
    </AuthLayout>
  )
}

const isInvalidInvite = (error: unknown) => error instanceof ApiError && error.code === "INVALID_INVITE"

function GuestInvite({ code }: { code: string }) {
  const query = useQuery({ queryKey: ["invite", code], queryFn: () => invitesApi.get(code) })
  const from = `/convite/${code}`

  if (query.isPending) return <Loading />
  if (query.isError) {
    return isInvalidInvite(query.error) ? <InvalidInvite /> : <NetworkFailure onRetry={() => void query.refetch()} />
  }

  return (
    <AuthLayout
      title={`Convite para ${query.data.group.name}`}
      description="Entre na sua conta ou cadastre-se para participar do grupo."
    >
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link to="/login" state={{ from }}>
            Entrar
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cadastro" state={{ from }}>
            Criar conta
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}

function JoinInvite({ code }: { code: string }) {
  const queryClient = useQueryClient()
  const join = useMutation({
    mutationFn: () => invitesApi.join(code),
    onSuccess: ({ group, joined }) => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all })
      if (joined) toast.success(`Você entrou no grupo ${group.name}`)
      else toast.info("Você já participa deste grupo")
    },
  })

  // Entra uma única vez (o StrictMode monta o efeito duas vezes em dev).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    join.mutate()
  }, [join])

  if (join.isSuccess) return <Navigate to={`/grupos/${join.data.group.id}`} replace />
  if (join.isError) {
    return isInvalidInvite(join.error) ? <InvalidInvite /> : <NetworkFailure onRetry={() => join.mutate()} />
  }
  return <Loading />
}
