import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { server } from "../server"
import { renderApp } from "../render"

const API = "http://localhost/api"
const user = { id: "1", name: "Ana Souza", email: "ana@example.com", createdAt: "2026-10-29T00:00:00Z" }
const apiError = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json({ error: { code, message, fields } }, { status })

function storeSession() {
  localStorage.setItem(
    "taskflow:session",
    JSON.stringify({ token: "tok", expiresAt: new Date(Date.now() + 3600_000).toISOString(), user }),
  )
}

describe("rotas protegidas", () => {
  it("redireciona visitante para o login", async () => {
    const router = renderApp("/")
    await screen.findByRole("heading", { name: "Entrar" })
    expect(router.state.location.pathname).toBe("/login")
  })

  it("redireciona usuário logado que abre o login", async () => {
    storeSession()
    renderApp("/login")
    expect(await screen.findByText("Olá, Ana Souza")).toBeInTheDocument()
  })

  it("ignora sessão expirada guardada", async () => {
    localStorage.setItem(
      "taskflow:session",
      JSON.stringify({ token: "tok", expiresAt: new Date(Date.now() - 1000).toISOString(), user }),
    )
    renderApp("/")
    await screen.findByRole("heading", { name: "Entrar" })
  })
})

describe("login", () => {
  it("entra e grava a sessão", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ token: "tok", expiresAt: new Date(Date.now() + 3600_000).toISOString(), user }),
      ),
    )
    const u = userEvent.setup()
    renderApp("/login")
    await u.type(screen.getByLabelText("E-mail"), "ana@example.com")
    await u.type(screen.getByLabelText("Senha"), "12345678")
    await u.click(screen.getByRole("button", { name: "Entrar" }))
    expect(await screen.findByText("Olá, Ana Souza")).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem("taskflow:session")!).token).toBe("tok")
  })

  it("mostra credenciais inválidas como alerta do formulário", async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos")))
    const u = userEvent.setup()
    renderApp("/login")
    await u.type(screen.getByLabelText("E-mail"), "ana@example.com")
    await u.type(screen.getByLabelText("Senha"), "errada123")
    await u.click(screen.getByRole("button", { name: "Entrar" }))
    expect(await screen.findByText("E-mail ou senha inválidos")).toBeInTheDocument()
  })

  it("valida campos vazios sem chamar a API", async () => {
    const u = userEvent.setup()
    renderApp("/login")
    await u.click(screen.getByRole("button", { name: "Entrar" }))
    expect(await screen.findByText("Informe o e-mail")).toBeInTheDocument()
    expect(screen.getByText("Informe a senha")).toBeInTheDocument()
  })
})

describe("cadastro", () => {
  async function fill(u: ReturnType<typeof userEvent.setup>, confirmation = "12345678") {
    await u.type(screen.getByLabelText("Nome completo"), "Ana Souza")
    await u.type(screen.getByLabelText("E-mail"), "ana@example.com")
    await u.type(screen.getByLabelText("Senha"), "12345678")
    await u.type(screen.getByLabelText("Confirmar senha"), confirmation)
    await u.click(screen.getByRole("button", { name: "Criar conta" }))
  }

  it("cria a conta e leva ao login", async () => {
    server.use(http.post(`${API}/auth/register`, () => HttpResponse.json({ message: "ok", user }, { status: 201 })))
    const u = userEvent.setup()
    renderApp("/cadastro")
    await fill(u)
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
  })

  it("mostra erro de confirmação de senha", async () => {
    const u = userEvent.setup()
    renderApp("/cadastro")
    await fill(u, "outra-senha")
    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument()
  })

  it("mostra e-mail já cadastrado no campo", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        apiError(409, "EMAIL_TAKEN", "Este e-mail já está cadastrado", { email: "Este e-mail já está cadastrado" }),
      ),
    )
    const u = userEvent.setup()
    renderApp("/cadastro")
    await fill(u)
    expect(await screen.findByText("Este e-mail já está cadastrado")).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInvalid()
  })
})

describe("logout", () => {
  it("encerra a sessão e volta ao login, mesmo se a API falhar", async () => {
    storeSession()
    server.use(http.post(`${API}/auth/logout`, () => apiError(500, "INTERNAL_ERROR", "Erro")))
    const u = userEvent.setup()
    renderApp("/")
    await u.click(await screen.findByRole("button", { name: /Ana Souza/ }))
    await u.click(await screen.findByRole("menuitem", { name: "Sair" }))
    await screen.findByRole("heading", { name: "Entrar" })
    expect(localStorage.getItem("taskflow:session")).toBeNull()
  })

  it("401 em rota protegida limpa a sessão", async () => {
    storeSession()
    server.use(http.post(`${API}/auth/logout`, () => apiError(401, "UNAUTHENTICATED", "Sessão expirada")))
    const u = userEvent.setup()
    renderApp("/")
    await u.click(await screen.findByRole("button", { name: /Ana Souza/ }))
    await u.click(await screen.findByRole("menuitem", { name: "Sair" }))
    await waitFor(() => expect(localStorage.getItem("taskflow:session")).toBeNull())
  })
})

describe("recuperação de senha", () => {
  it("mostra a mensagem neutra após solicitar o link", async () => {
    server.use(
      http.post(`${API}/auth/forgot-password`, () =>
        HttpResponse.json({ message: "Se o e-mail estiver cadastrado, você receberá um link" }),
      ),
    )
    const u = userEvent.setup()
    renderApp("/esqueci-senha")
    await u.type(screen.getByLabelText("E-mail"), "ana@example.com")
    await u.click(screen.getByRole("button", { name: "Enviar link" }))
    expect(await screen.findByText(/você receberá um link/)).toBeInTheDocument()
  })

  it("redefine a senha com link válido", async () => {
    server.use(
      http.get(`${API}/auth/reset-password/abc`, () => HttpResponse.json({ valid: true })),
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        expect(await request.json()).toEqual({ token: "abc", password: "novasenha1", passwordConfirmation: "novasenha1" })
        return HttpResponse.json({ message: "ok" })
      }),
    )
    const u = userEvent.setup()
    renderApp("/redefinir-senha?token=abc")
    await u.type(await screen.findByLabelText("Nova senha"), "novasenha1")
    await u.type(screen.getByLabelText("Confirmar nova senha"), "novasenha1")
    await u.click(screen.getByRole("button", { name: "Redefinir senha" }))
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
  })

  it("mostra estado inválido para link expirado ou já usado", async () => {
    server.use(
      http.get(`${API}/auth/reset-password/velho`, () =>
        apiError(400, "INVALID_RESET_TOKEN", "Link de redefinição inválido, expirado ou já utilizado"),
      ),
    )
    renderApp("/redefinir-senha?token=velho")
    expect(await screen.findByRole("heading", { name: "Link inválido" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Solicitar novo link" })).toHaveAttribute("href", "/esqueci-senha")
  })

  it("sem token na URL já mostra link inválido", async () => {
    renderApp("/redefinir-senha")
    expect(await screen.findByRole("heading", { name: "Link inválido" })).toBeInTheDocument()
  })
})
