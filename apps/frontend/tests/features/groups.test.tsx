import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { API, apiError, storeSession } from "../fixtures"
import { renderApp } from "../render"
import { server } from "../server"

const group = {
  id: 7,
  name: "Trabalho de PDS II",
  description: "Entrega final",
  inviteCode: "abcDEF123456ghij",
  role: "creator",
  createdAt: "2026-11-01T00:00:00Z",
}

beforeEach(() => storeSession())

describe("Meus grupos (RF05)", () => {
  it("lista os grupos do usuário com link para a página de cada um", async () => {
    server.use(
      http.get(`${API}/groups`, () =>
        HttpResponse.json({ groups: [{ ...group, memberCount: 3 }, { ...group, id: 8, name: "TCC", role: "member", memberCount: 1 }] }),
      ),
    )
    renderApp("/")
    const link = await screen.findByRole("link", { name: /Trabalho de PDS II/ })
    expect(link).toHaveAttribute("href", "/grupos/7")
    expect(screen.getByText("3 integrantes")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /TCC/ })).toHaveAttribute("href", "/grupos/8")
  })

  it("usuário sem grupos vê mensagem com o botão 'Criar grupo'", async () => {
    renderApp("/")
    expect(await screen.findByText("Você ainda não participa de nenhum grupo")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Criar grupo" })).toHaveAttribute("href", "/grupos/novo")
  })
})

describe("criação de grupo (RF05)", () => {
  it("cria o grupo, leva à página dele e ele aparece em Meus grupos", async () => {
    let created = false
    server.use(
      http.post(`${API}/groups`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: "Trabalho de PDS II", description: "Entrega final" })
        created = true
        return HttpResponse.json({ group }, { status: 201 })
      }),
      http.get(`${API}/groups`, () => HttpResponse.json({ groups: created ? [{ ...group, memberCount: 1 }] : [] })),
      http.get(`${API}/groups/7`, () => HttpResponse.json({ group })),
    )
    const u = userEvent.setup()
    const router = renderApp("/grupos/novo")
    await u.type(screen.getByLabelText("Nome do grupo"), "Trabalho de PDS II")
    await u.type(screen.getByLabelText("Descrição (opcional)"), "Entrega final")
    await u.click(screen.getByRole("button", { name: "Criar grupo" }))

    expect(await screen.findByRole("heading", { name: "Trabalho de PDS II" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/grupos/7")

    await u.click(screen.getByRole("link", { name: "Meus grupos" }))
    expect(await screen.findByRole("link", { name: /Trabalho de PDS II/ })).toBeInTheDocument()
  })

  it("indica erro no campo com nome vazio ou longo demais", async () => {
    const u = userEvent.setup()
    renderApp("/grupos/novo")
    await u.click(screen.getByRole("button", { name: "Criar grupo" }))
    expect(await screen.findByText("Informe o nome do grupo")).toBeInTheDocument()
    expect(screen.getByLabelText("Nome do grupo")).toBeInvalid()

    await u.type(screen.getByLabelText("Nome do grupo"), "x".repeat(61))
    expect(await screen.findByText("O nome deve ter no máximo 60 caracteres")).toBeInTheDocument()
  })

  it("mostra no campo o erro devolvido pelo backend", async () => {
    server.use(
      http.post(`${API}/groups`, () =>
        apiError(400, "VALIDATION_ERROR", "Verifique os campos informados", { name: "Nome recusado" }),
      ),
    )
    const u = userEvent.setup()
    renderApp("/grupos/novo")
    await u.type(screen.getByLabelText("Nome do grupo"), "Grupo")
    await u.click(screen.getByRole("button", { name: "Criar grupo" }))
    expect(await screen.findByText("Nome recusado")).toBeInTheDocument()
  })
})

describe("página do grupo (RF05)", () => {
  it("mostra nome e descrição", async () => {
    server.use(http.get(`${API}/groups/7`, () => HttpResponse.json({ group })))
    renderApp("/grupos/7")
    expect(await screen.findByRole("heading", { name: "Trabalho de PDS II" })).toBeInTheDocument()
    expect(screen.getByText("Entrega final")).toBeInTheDocument()
  })

  it("quem não é integrante vê 'Grupo não encontrado'", async () => {
    let calls = 0
    server.use(
      http.get(`${API}/groups/99`, () => {
        calls++
        return apiError(404, "GROUP_NOT_FOUND", "Grupo não encontrado")
      }),
    )
    renderApp("/grupos/99")
    expect(await screen.findByText("Grupo não encontrado")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar para Meus grupos" })).toHaveAttribute("href", "/")
    await waitFor(() => expect(calls).toBe(1))
  })
})
