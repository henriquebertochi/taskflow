import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { API, apiError, storeSession, user } from "../fixtures"
import { renderApp } from "../render"
import { server } from "../server"

const group = {
  id: 7,
  name: "Trabalho de PDS II",
  description: null,
  inviteCode: "codigo-atual-123",
  role: "creator",
  createdAt: "2026-11-01T00:00:00Z",
}
const members = [
  { id: 1, name: "Ana Souza", role: "creator", joinedAt: "2026-11-01T00:00:00Z" },
  { id: 2, name: "Bruno Lima", role: "member", joinedAt: "2026-11-02T00:00:00Z" },
]

function groupHandlers(overrides: Partial<typeof group> = {}) {
  return [
    http.get(`${API}/groups/7`, () => HttpResponse.json({ group: { ...group, ...overrides } })),
    http.get(`${API}/groups/7/members`, () => HttpResponse.json({ members })),
  ]
}

describe("integrantes e convite na página do grupo (RF06)", () => {
  beforeEach(() => storeSession())

  it("mostra todos os integrantes pelo nome", async () => {
    server.use(...groupHandlers())
    renderApp("/grupos/7")
    const list = await screen.findByRole("list", { name: "Integrantes" })
    expect(within(list).getByText("Ana Souza")).toBeInTheDocument()
    expect(within(list).getByText("Bruno Lima")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Integrantes (2)" })).toBeInTheDocument()
  })

  it("copia o link de convite", async () => {
    server.use(...groupHandlers({ role: "member" }))
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Copiar convite" }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/convite/codigo-atual-123`)
    expect(await screen.findByText(/Link de convite copiado/)).toBeInTheDocument()
    // Só o criador gera um novo link.
    expect(screen.queryByRole("button", { name: "Gerar novo link" })).not.toBeInTheDocument()
  })

  it("o criador gera um novo link, depois de confirmar", async () => {
    server.use(
      ...groupHandlers(),
      http.post(`${API}/groups/7/invite`, () => HttpResponse.json({ inviteCode: "codigo-novo-456" })),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Gerar novo link" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/O link atual deixará de funcionar/)).toBeInTheDocument()
    await u.click(within(dialog).getByRole("button", { name: "Gerar novo link" }))
    expect(await screen.findByText(/Novo link gerado/)).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: "Copiar convite" }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/convite/codigo-novo-456`)
  })
})

describe("página /convite/:código (RF06)", () => {
  it("logado: entra direto no grupo", async () => {
    storeSession()
    let joins = 0
    server.use(
      ...groupHandlers({ role: "member" }),
      http.post(`${API}/invites/abc/join`, () => {
        joins++
        return HttpResponse.json({ group: { id: 7, name: group.name }, joined: true })
      }),
    )
    const router = renderApp("/convite/abc")
    expect(await screen.findByRole("heading", { name: "Trabalho de PDS II" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/grupos/7")
    expect(await screen.findByText("Você entrou no grupo Trabalho de PDS II")).toBeInTheDocument()
    expect(joins).toBe(1)
  })

  it("link inválido ou substituído mostra 'Convite inválido ou expirado'", async () => {
    storeSession()
    server.use(
      http.post(`${API}/invites/velho/join`, () => apiError(404, "INVALID_INVITE", "Convite inválido ou expirado")),
    )
    renderApp("/convite/velho")
    expect(await screen.findByRole("heading", { name: "Convite inválido ou expirado" })).toBeInTheDocument()
  })

  it("sem login, link inválido também avisa", async () => {
    server.use(http.get(`${API}/invites/velho`, () => apiError(404, "INVALID_INVITE", "Convite inválido ou expirado")))
    renderApp("/convite/velho")
    expect(await screen.findByRole("heading", { name: "Convite inválido ou expirado" })).toBeInTheDocument()
  })

  it("sem login: faz login e volta ao convite, entrando no grupo", async () => {
    server.use(
      ...groupHandlers({ role: "member" }),
      http.get(`${API}/invites/abc`, () => HttpResponse.json({ group: { id: 7, name: group.name, memberCount: 2 } })),
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ token: "tok", expiresAt: new Date(Date.now() + 3600_000).toISOString(), user }),
      ),
      http.post(`${API}/invites/abc/join`, () =>
        HttpResponse.json({ group: { id: 7, name: group.name }, joined: true }),
      ),
    )
    const u = userEvent.setup()
    const router = renderApp("/convite/abc")
    expect(await screen.findByRole("heading", { name: "Convite para Trabalho de PDS II" })).toBeInTheDocument()
    await u.click(screen.getByRole("link", { name: "Entrar" }))

    await u.type(await screen.findByLabelText("E-mail"), "ana@example.com")
    await u.type(screen.getByLabelText("Senha"), "12345678")
    await u.click(screen.getByRole("button", { name: "Entrar" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/grupos/7"))
    expect(await screen.findByRole("heading", { name: "Trabalho de PDS II" })).toBeInTheDocument()
  })

  it("sem conta: o cadastro leva ao login mantendo a volta ao convite", async () => {
    server.use(
      http.get(`${API}/invites/abc`, () => HttpResponse.json({ group: { id: 7, name: group.name, memberCount: 2 } })),
      http.post(`${API}/auth/register`, () => HttpResponse.json({ message: "ok", user }, { status: 201 })),
    )
    const u = userEvent.setup()
    const router = renderApp("/convite/abc")
    await u.click(await screen.findByRole("link", { name: "Criar conta" }))
    await u.type(await screen.findByLabelText("Nome completo"), "Ana Souza")
    await u.type(screen.getByLabelText("E-mail"), "ana@example.com")
    await u.type(screen.getByLabelText("Senha"), "12345678")
    await u.type(screen.getByLabelText("Confirmar senha"), "12345678")
    await u.click(screen.getByRole("button", { name: "Criar conta" }))

    await screen.findByRole("heading", { name: "Entrar" })
    expect(router.state.location.state).toEqual({ from: "/convite/abc" })
  })
})
