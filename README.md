# TaskFlow

Gestor de compromissos para trabalhos em grupo. Monorepo com npm workspaces:

```
apps/
  backend/   API em Express + PostgreSQL (TypeScript)
  frontend/  React + TypeScript + Vite + shadcn/ui
```

## Rodando

Requisitos: Node 22+ e Docker.

```bash
npm install
npm run db:up                       # Postgres (5432) + Mailpit (SMTP 1025, UI http://localhost:8025)
cp apps/backend/.env.example apps/backend/.env
npm run db:migrate
npm run dev:backend                 # http://localhost:3333
npm run dev:frontend                # http://localhost:5173 (proxy de /api para o backend)
npm test                            # usa o banco taskflow_test
```

Os e-mails de recuperação de senha enviados em desenvolvimento aparecem no Mailpit
(http://localhost:8025).

## Deploy (Render + Neon)

Um único serviço web no Render entrega a API e o frontend; o banco é PostgreSQL no Neon.

| Render | Valor |
|---|---|
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` (aplica as migrations pendentes e sobe a API) |
| Health check | `/api/health` |

Variáveis: `DATABASE_URL` (connection string do Neon, com `sslmode=require`), `SERVE_FRONTEND=true`,
`APP_URL` e `CORS_ORIGIN` (ambas com a URL pública do serviço) e, para a recuperação de senha,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`.

Com `SERVE_FRONTEND=true`, a API serve `apps/frontend/dist`: `/api/*` continua sendo a API e qualquer
outra rota devolve o `index.html` (rotas do React como `/grupos/1` e `/convite/:código`).

## API — Sprint 1 (autenticação)

Base: `/api`. A autenticação usa token de sessão no header
`Authorization: Bearer <token>`. O token fica salvo no banco (só o hash), então o
logout invalida de verdade a sessão.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | — | `{ name, email, password, passwordConfirmation }` → 201 |
| POST | `/auth/login` | — | `{ email, password }` → `{ token, expiresAt, user }` |
| POST | `/auth/logout` | ✓ | Encerra a sessão atual → 204 |
| GET | `/auth/me` | ✓ | Usuário logado |
| POST | `/auth/forgot-password` | — | `{ email }` → envia link (resposta igual se o e-mail não existir) |
| GET | `/auth/reset-password/:token` | — | Verifica se o link é válido (para o frontend) |
| POST | `/auth/reset-password` | — | `{ token, password, passwordConfirmation }` |

O link de redefinição aponta para `${APP_URL}/redefinir-senha?token=...`, expira em
60 minutos (`RESET_TOKEN_TTL_MINUTES`) e só pode ser usado uma vez. Redefinir a senha
encerra todas as sessões abertas do usuário.

### Formato de erro

Todas as rotas respondem erros no mesmo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os campos informados",
    "fields": { "email": "E-mail inválido", "password": "A senha deve ter no mínimo 8 caracteres" }
  }
}
```

| Status | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campo vazio ou inválido (`fields` diz qual) |
| 400 | `INVALID_RESET_TOKEN` | Link de redefinição inválido, expirado ou já usado |
| 401 | `INVALID_CREDENTIALS` | "E-mail ou senha inválidos" |
| 401 | `UNAUTHENTICATED` | Rota protegida sem token ou com sessão expirada |
| 409 | `EMAIL_TAKEN` | E-mail já cadastrado |
| 403 | `FORBIDDEN` | Ação permitida só a quem criou o grupo |
| 404 | `INVALID_INVITE` | "Convite inválido ou expirado" (código inexistente ou substituído) |
| 404 | `TASK_NOT_FOUND` | "Tarefa não encontrada" (inexistente ou de outro grupo) |
| 404 | `GROUP_NOT_FOUND` | "Grupo não encontrado": não existe ou o usuário não é integrante |
| 404 | `NOT_FOUND` | Rota inexistente |
| 500 | `INTERNAL_ERROR` | Erro inesperado |

Novas rotas internas devem usar o middleware `requireAuth`
(`apps/backend/src/middleware/auth.ts`).

## API — Sprint 2 (grupos e tarefas)

Todas as rotas exigem login. Toda rota `/groups/:id/...` passa pelo middleware
`requireGroupMember` (`apps/backend/src/middleware/group-access.ts`): quem não é integrante
recebe `404 GROUP_NOT_FOUND`, a mesma resposta de um grupo inexistente.

### Grupos (RF05)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/groups` | `{ name, description? }` (nome até 60 caracteres) → 201 `{ group }`; quem cria entra como `creator` |
| GET | `/groups` | `{ groups: [{ id, name, description, role, memberCount, createdAt }] }`, só os grupos do usuário |
| GET | `/groups/:id` | `{ group: { id, name, description, inviteCode, role, createdAt } }` |

### Convites e integrantes (RF06)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/groups/:id/members` | ✓ | `{ members: [{ id, name, role, joinedAt }] }`, criador primeiro |
| POST | `/groups/:id/invite` | ✓ (criador) | Gera um novo código → `{ inviteCode }`; o anterior deixa de funcionar |
| GET | `/invites/:code` | — | `{ group: { id, name, memberCount } }` para a tela de convite, mesmo sem login |
| POST | `/invites/:code/join` | ✓ | Entra no grupo → `{ group: { id, name }, joined }` (`joined: false` se já era integrante) |

### Tarefas (RF07)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/groups/:id/tasks` | `{ tasks, summary: { total, done, overdue, percentDone } }`, tarefas por prazo |
| POST | `/groups/:id/tasks` | `{ title, description?, assigneeId?, dueDate }` → 201 `{ task }`, sempre com status `todo` |
| PUT | `/groups/:id/tasks/:taskId` | Mesmo corpo do POST → `{ task }` |
| DELETE | `/groups/:id/tasks/:taskId` | → 204 |

Tarefa: `{ id, groupId, title, description, status, dueDate, assignee: { id, name } | null, overdue, createdAt, updatedAt }`.
`dueDate` é `AAAA-MM-DD`. Regras: título (até 120) e prazo obrigatórios; `assigneeId: null` = "Sem
responsável"; responsável fora do grupo → `400` em `fields.assigneeId`; prazo passado → `400` em
`fields.dueDate` (na edição, o prazo atual pode ser mantido mesmo vencido). "Hoje" segue o fuso
`APP_TIMEZONE` (padrão `America/Sao_Paulo`).

### Quadro e progresso (RF08)

| Método | Rota | Descrição |
|---|---|---|
| PATCH | `/groups/:id/tasks/:taskId/status` | `{ status: "todo" \| "in_progress" \| "done" }` → `{ task }` |

`overdue` (atrasada) = prazo antes de hoje e status diferente de `done`. `percentDone` é a % de
tarefas concluídas, arredondada. No frontend o quadro aplica a mudança de status na hora e, se a
API recusar, devolve o cartão à coluna anterior com uma mensagem de erro; o destaque "Atrasada" e o
resumo do topo são recalculados no navegador com a mesma regra, para atualizarem na hora.

O link de convite é `${APP_URL}/convite/<inviteCode>`. Sem login, a tela mostra o grupo e leva ao
login ou cadastro, que voltam ao convite em seguida.

## Frontend (`apps/frontend`)

React 19 + TypeScript + Vite, Tailwind v4 e shadcn/ui (componentes copiados para
`src/components/ui`, então o código é nosso). Formulários com react-hook-form + zod; testes com
Vitest, Testing Library e MSW (`npm test -w @taskflow/frontend`).

Rotas: `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha?token=…` (caminho fixo, é o link
do e-mail) `/convite/:código` e as protegidas `/` (Meus grupos), `/grupos/novo` e `/grupos/:id`.

**Design system centralizado** — ainda sem specs de design, então tudo é neutro e mora em dois lugares:

- `src/styles/theme.css`: tokens (cores, raio, fonte; claro e escuro). Trocar a identidade visual = editar só este arquivo.
- `src/config/brand.ts` + `src/components/logo.tsx`: nome, slogan e logo.

Os componentes usam apenas tokens semânticos (`bg-primary`, `text-muted-foreground`…); não
usar cores cruas. Novos componentes: `npx shadcn@latest add <nome>` dentro de `apps/frontend`.

**Sessão:** o backend usa Bearer token, então o token fica em `localStorage`
(`taskflow:session`), legível por qualquer script da página (risco de XSS). Um 401 em rota
protegida encerra a sessão local. Em produção, defina `VITE_API_URL` se a API não for servida em `/api`.
