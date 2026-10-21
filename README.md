# TaskFlow

Gestor de compromissos para trabalhos em grupo. Monorepo com npm workspaces:

```
apps/
  backend/   API em Express + PostgreSQL (TypeScript)
  frontend/  (próximo passo)
```

## Rodando

Requisitos: Node 22+ e Docker.

```bash
npm install
npm run db:up                       # Postgres (5432) + Mailpit (SMTP 1025, UI http://localhost:8025)
cp apps/backend/.env.example apps/backend/.env
npm run db:migrate
npm run dev:backend                 # http://localhost:3333
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
