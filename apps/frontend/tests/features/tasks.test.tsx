import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { todayISO } from "@/lib/dates"
import { API, apiError, storeSession } from "../fixtures"
import { renderApp } from "../render"
import { server } from "../server"

const group = { id: 7, name: "Trabalho de PDS II", description: null, inviteCode: "c", role: "member", createdAt: "" }
const members = [
  { id: 1, name: "Ana Souza", role: "creator", joinedAt: "" },
  { id: 2, name: "Bruno Lima", role: "member", joinedAt: "" },
]

function dayOffset(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayISO(d)
}
const br = (iso: string) => iso.split("-").reverse().join("/")

type ApiTask = {
  id: number
  title: string
  description: string | null
  status: string
  dueDate: string
  assignee: { id: number; name: string } | null
  overdue: boolean
}
const makeTask = (overrides: Partial<ApiTask> = {}): ApiTask => ({
  id: 1,
  title: "Escrever a introdução",
  description: null,
  status: "todo",
  dueDate: dayOffset(5),
  assignee: { id: 2, name: "Bruno Lima" },
  overdue: false,
  ...overrides,
})

// Servidor em memória: GET devolve o que está "salvo" em `tasks`.
function useTasksApi(initial: ApiTask[] = []) {
  const db = { tasks: [...initial], requests: [] as { method: string; body: unknown }[] }
  server.use(
    http.get(`${API}/groups/7`, () => HttpResponse.json({ group })),
    http.get(`${API}/groups/7/members`, () => HttpResponse.json({ members })),
    http.get(`${API}/groups/7/tasks`, () => HttpResponse.json({ tasks: db.tasks })),
  )
  return db
}

const setDate = (value: string) => fireEvent.change(screen.getByLabelText("Prazo"), { target: { value } })

beforeEach(() => storeSession())

describe("cadastro de tarefas (RF07)", () => {
  it("cria a tarefa com responsável e prazo e ela aparece no grupo", async () => {
    const db = useTasksApi()
    const due = dayOffset(3)
    server.use(
      http.post(`${API}/groups/7/tasks`, async ({ request }) => {
        const body = await request.json()
        expect(body).toEqual({ title: "Escrever a introdução", description: "", assigneeId: 2, dueDate: due })
        const task = makeTask({ dueDate: due })
        db.tasks.push(task)
        return HttpResponse.json({ task }, { status: 201 })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Nova tarefa" }))
    const dialog = await screen.findByRole("dialog", { name: "Nova tarefa" })
    await u.type(within(dialog).getByLabelText("Título"), "Escrever a introdução")
    await u.selectOptions(within(dialog).getByLabelText("Responsável"), "Bruno Lima")
    setDate(due)
    await u.click(within(dialog).getByRole("button", { name: "Criar tarefa" }))

    const card = await screen.findByRole("article", { name: "Escrever a introdução" })
    expect(within(card).getByText("Bruno Lima")).toBeInTheDocument()
    expect(within(card).getByText(br(due))).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("permite deixar 'Sem responsável'", async () => {
    const db = useTasksApi()
    server.use(
      http.post(`${API}/groups/7/tasks`, async ({ request }) => {
        const body = (await request.json()) as { assigneeId: unknown }
        expect(body.assigneeId).toBeNull()
        const task = makeTask({ assignee: null })
        db.tasks.push(task)
        return HttpResponse.json({ task }, { status: 201 })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Nova tarefa" }))
    await u.type(screen.getByLabelText("Título"), "Escrever a introdução")
    setDate(dayOffset(1))
    await u.click(screen.getByRole("button", { name: "Criar tarefa" }))
    const card = await screen.findByRole("article", { name: "Escrever a introdução" })
    expect(within(card).getByText("Sem responsável")).toBeInTheDocument()
  })

  it("indica qual campo corrigir: obrigatórios vazios e prazo passado", async () => {
    useTasksApi()
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Nova tarefa" }))
    await u.click(screen.getByRole("button", { name: "Criar tarefa" }))
    expect(await screen.findByText("Informe o título")).toBeInTheDocument()
    expect(screen.getByText("Informe o prazo")).toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toBeInvalid()

    setDate(dayOffset(-1))
    await u.click(screen.getByRole("button", { name: "Criar tarefa" }))
    expect(await screen.findByText("O prazo não pode ser uma data passada")).toBeInTheDocument()
    expect(screen.getByLabelText("Prazo")).toBeInvalid()
  })

  it("mostra no campo a recusa do backend para responsável fora do grupo", async () => {
    useTasksApi()
    server.use(
      http.post(`${API}/groups/7/tasks`, () =>
        apiError(400, "VALIDATION_ERROR", "Verifique os campos informados", {
          assigneeId: "O responsável deve ser integrante do grupo",
        }),
      ),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Nova tarefa" }))
    await u.type(screen.getByLabelText("Título"), "Tarefa")
    await u.selectOptions(screen.getByLabelText("Responsável"), "Ana Souza")
    setDate(dayOffset(1))
    await u.click(screen.getByRole("button", { name: "Criar tarefa" }))
    expect(await screen.findByText("O responsável deve ser integrante do grupo")).toBeInTheDocument()
  })

  it("edita a tarefa com os dados atuais já preenchidos", async () => {
    const db = useTasksApi([makeTask()])
    server.use(
      http.put(`${API}/groups/7/tasks/1`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toMatchObject({ title: "Introdução e objetivos", assigneeId: 1, dueDate: db.tasks[0].dueDate })
        db.tasks[0] = { ...db.tasks[0], title: "Introdução e objetivos", assignee: { id: 1, name: "Ana Souza" } }
        return HttpResponse.json({ task: db.tasks[0] })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Editar tarefa Escrever a introdução" }))
    const dialog = await screen.findByRole("dialog", { name: "Editar tarefa" })
    expect(within(dialog).getByLabelText("Título")).toHaveValue("Escrever a introdução")
    expect(within(dialog).getByLabelText("Responsável")).toHaveValue("2")

    await u.clear(within(dialog).getByLabelText("Título"))
    await u.type(within(dialog).getByLabelText("Título"), "Introdução e objetivos")
    await u.selectOptions(within(dialog).getByLabelText("Responsável"), "Ana Souza")
    await u.click(within(dialog).getByRole("button", { name: "Salvar" }))

    const card = await screen.findByRole("article", { name: "Introdução e objetivos" })
    expect(within(card).getByText("Ana Souza")).toBeInTheDocument()
  })

  it("na edição, mantém um prazo que já venceu", async () => {
    const past = dayOffset(-2)
    const db = useTasksApi([makeTask({ dueDate: past, overdue: true })])
    let saved = false
    server.use(
      http.put(`${API}/groups/7/tasks/1`, () => {
        saved = true
        return HttpResponse.json({ task: db.tasks[0] })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.click(await screen.findByRole("button", { name: "Editar tarefa Escrever a introdução" }))
    await u.click(await screen.findByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(saved).toBe(true))
  })

  it("exclui só depois de confirmar, e a tarefa some", async () => {
    const db = useTasksApi([makeTask()])
    let deletes = 0
    server.use(
      http.delete(`${API}/groups/7/tasks/1`, () => {
        deletes++
        db.tasks = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")

    await u.click(await screen.findByRole("button", { name: "Excluir tarefa Escrever a introdução" }))
    await u.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }))
    expect(deletes).toBe(0)
    expect(screen.getByRole("article", { name: "Escrever a introdução" })).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: "Excluir tarefa Escrever a introdução" }))
    const confirm = await screen.findByRole("alertdialog")
    expect(within(confirm).getByText(/será excluída para todos/)).toBeInTheDocument()
    await u.click(within(confirm).getByRole("button", { name: "Excluir" }))

    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument())
    expect(deletes).toBe(1)
    expect(await screen.findByText("Nenhuma tarefa ainda")).toBeInTheDocument()
  })
})
