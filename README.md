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
| 404 | `NOT_FOUND` | Rota inexistente |
| 500 | `INTERNAL_ERROR` | Erro inesperado |

Novas rotas internas devem usar o middleware `requireAuth`
(`apps/backend/src/middleware/auth.ts`).

## Frontend (`apps/frontend`)

React 19 + TypeScript + Vite, Tailwind v4 e shadcn/ui (componentes copiados para
`src/components/ui`, então o código é nosso). Formulários com react-hook-form + zod; testes com
Vitest, Testing Library e MSW (`npm test -w @taskflow/frontend`).

Rotas: `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha?token=…` (caminho fixo, é o link
do e-mail) e `/` (protegida).

**Design system centralizado** — ainda sem specs de design, então tudo é neutro e mora em dois lugares:

- `src/styles/theme.css`: tokens (cores, raio, fonte; claro e escuro). Trocar a identidade visual = editar só este arquivo.
- `src/config/brand.ts` + `src/components/logo.tsx`: nome, slogan e logo.

Os componentes usam apenas tokens semânticos (`bg-primary`, `text-muted-foreground`…); não
usar cores cruas. Novos componentes: `npx shadcn@latest add <nome>` dentro de `apps/frontend`.

**Sessão:** o backend usa Bearer token, então o token fica em `localStorage`
(`taskflow:session`), legível por qualquer script da página (risco de XSS). Um 401 em rota
protegida encerra a sessão local. Em produção, defina `VITE_API_URL` se a API não for servida em `/api`.
