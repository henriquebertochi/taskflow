import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { summarize } from "@/features/tasks/board"
import type { Task } from "@/lib/api/tasks"
import { todayISO } from "@/lib/dates"
import { API, apiError, storeSession } from "../fixtures"
import { renderApp } from "../render"
import { server } from "../server"

const group = { id: 7, name: "Trabalho de PDS II", description: null, inviteCode: "c", role: "member", createdAt: "" }

function dayOffset(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayISO(d)
}

const makeTask = (id: number, title: string, overrides: Partial<Task> = {}): Task => ({
  id,
  groupId: 7,
  title,
  description: null,
  status: "todo",
  dueDate: dayOffset(5),
  assignee: { id: 2, name: "Bruno Lima" },
  overdue: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
})

function useBoardApi(initial: Task[]) {
  const db = { tasks: initial.map((t) => ({ ...t })) }
  server.use(
    http.get(`${API}/groups/7`, () => HttpResponse.json({ group })),
    http.get(`${API}/groups/7/tasks`, () => HttpResponse.json({ tasks: db.tasks, summary: summarize(db.tasks) })),
  )
  return db
}

const column = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) })

beforeEach(() => storeSession())

describe("quadro de tarefas (RF08)", () => {
  it("mostra as três colunas com título, responsável e prazo nos cartões", async () => {
    useBoardApi([
      makeTask(1, "Introdução"),
      makeTask(2, "Metodologia", { status: "in_progress", assignee: null }),
      makeTask(3, "Capa", { status: "done" }),
    ])
    renderApp("/grupos/7")
    await screen.findByRole("article", { name: "Introdução" })

    expect(within(column("A fazer")).getByRole("article", { name: "Introdução" })).toBeInTheDocument()
    const doing = within(column("Em andamento")).getByRole("article", { name: "Metodologia" })
    expect(within(doing).getByText("Sem responsável")).toBeInTheDocument()
    const done = within(column("Concluído")).getByRole("article", { name: "Capa" })
    expect(within(done).getByText("Bruno Lima")).toBeInTheDocument()
    expect(within(done).getByText(dayOffset(5).split("-").reverse().join("/"))).toBeInTheDocument()
  })

  it("destaca como 'Atrasada' só a tarefa vencida e não concluída", async () => {
    useBoardApi([
      makeTask(1, "Vencida", { dueDate: dayOffset(-1) }),
      makeTask(2, "Vencida e concluída", { dueDate: dayOffset(-1), status: "done" }),
      makeTask(3, "Vence hoje", { dueDate: dayOffset(0) }),
    ])
    renderApp("/grupos/7")
    const late = await screen.findByRole("article", { name: "Vencida" })
    expect(within(late).getByText("Atrasada")).toBeInTheDocument()
    expect(within(screen.getByRole("article", { name: "Vencida e concluída" })).queryByText("Atrasada")).toBeNull()
    expect(within(screen.getByRole("article", { name: "Vence hoje" })).queryByText("Atrasada")).toBeNull()
  })

  it("mostra no topo a % concluída e quantas estão atrasadas", async () => {
    useBoardApi([
      makeTask(1, "A", { status: "done" }),
      makeTask(2, "B", { dueDate: dayOffset(-3) }),
      makeTask(3, "C"),
      makeTask(4, "D", { status: "done" }),
    ])
    renderApp("/grupos/7")
    expect(await screen.findByText("50%")).toBeInTheDocument()
    expect(screen.getByText("2 de 4 tarefas concluídas")).toBeInTheDocument()
    expect(screen.getByText("1 tarefa atrasada")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Progresso do grupo" })).toHaveAttribute("aria-valuenow", "50")
  })

  it("ao mudar o status, o cartão muda de coluna, o progresso atualiza na hora e a mudança persiste", async () => {
    const db = useBoardApi([makeTask(1, "Introdução", { dueDate: dayOffset(-1) }), makeTask(2, "Capa")])
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.patch(`${API}/groups/7/tasks/1/status`, async ({ request }) => {
        expect(await request.json()).toEqual({ status: "done" })
        await gate
        db.tasks[0].status = "done"
        return HttpResponse.json({ task: db.tasks[0] })
      }),
    )
    const u = userEvent.setup()
    renderApp("/grupos/7")
    expect(await screen.findByText("1 tarefa atrasada")).toBeInTheDocument()

    await u.selectOptions(screen.getByRole("combobox", { name: "Status de Introdução" }), "Concluído")

    // Antes da resposta do servidor: já mudou de coluna e o resumo já atualizou.
    expect(within(column("Concluído")).getByRole("article", { name: "Introdução" })).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByText("Nenhuma tarefa atrasada")).toBeInTheDocument()
    expect(within(screen.getByRole("article", { name: "Introdução" })).queryByText("Atrasada")).toBeNull()

    release()
    await waitFor(() => expect(db.tasks[0].status).toBe("done"))
  })

  it("mudança salva continua lá depois de recarregar", async () => {
    useBoardApi([makeTask(1, "Introdução", { status: "in_progress" })])
    renderApp("/grupos/7")
    expect(within(await screen.findByRole("region", { name: /^Em andamento/ })).getByRole("article")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Status de Introdução" })).toHaveValue("in_progress")
  })

  it("se a mudança falhar, o cartão volta para a coluna anterior e aparece um erro", async () => {
    useBoardApi([makeTask(1, "Introdução")])
    server.use(http.patch(`${API}/groups/7/tasks/1/status`, () => apiError(500, "INTERNAL_ERROR", "Erro interno")))
    const u = userEvent.setup()
    renderApp("/grupos/7")
    await u.selectOptions(await screen.findByRole("combobox", { name: "Status de Introdução" }), "Em andamento")

    expect(await screen.findByText(/Não foi possível mudar o status/)).toBeInTheDocument()
    await waitFor(() =>
      expect(within(column("A fazer")).getByRole("article", { name: "Introdução" })).toBeInTheDocument(),
    )
    expect(screen.getByRole("combobox", { name: "Status de Introdução" })).toHaveValue("todo")
    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("quadro sem tarefas mostra o botão 'Nova tarefa'", async () => {
    useBoardApi([])
    renderApp("/grupos/7")
    expect(await screen.findByText("Nenhuma tarefa ainda")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nova tarefa" })).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })
})

describe("summarize", () => {
  it("arredonda a porcentagem e ignora concluídas vencidas", () => {
    const tasks = [
      makeTask(1, "A", { status: "done", dueDate: "2020-01-01" }),
      makeTask(2, "B", { dueDate: "2020-01-01" }),
      makeTask(3, "C", { dueDate: "2999-01-01" }),
    ]
    expect(summarize(tasks, "2026-11-23")).toEqual({ total: 3, done: 1, overdue: 1, percentDone: 33 })
    expect(summarize([], "2026-11-23")).toEqual({ total: 0, done: 0, overdue: 0, percentDone: 0 })
  })
})
