import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { summarize } from "@/features/tasks/board"
import { droppedStatus } from "@/features/tasks/dnd"
import type { Task } from "@/lib/api/tasks"
import { API, apiError, storeSession } from "../fixtures"
import { renderApp } from "../render"
import { server } from "../server"

const group = { id: 7, name: "Trabalho de PDS II", description: null, inviteCode: "c", role: "member", createdAt: "" }
const makeTask = (id: number, title: string, overrides: Partial<Task> = {}): Task => ({
  id,
  groupId: 7,
  title,
  description: null,
  status: "todo",
  dueDate: "2999-01-01",
  assignee: null,
  overdue: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
})

// jsdom não tem layout: posiciona as colunas lado a lado (300px cada) e os cartões dentro delas.
const COLUMN_X = { todo: 0, in_progress: 300, done: 600 } as const
const realRect = Element.prototype.getBoundingClientRect
function fakeLayout() {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const rect = (x: number, y: number, w: number, h: number) =>
      ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect
    const status = this.getAttribute("data-status") as keyof typeof COLUMN_X | null
    if (status) return rect(COLUMN_X[status], 0, 280, 800)
    if (this.hasAttribute("data-task-id")) {
      const col = this.closest("[data-status]")?.getAttribute("data-status") as keyof typeof COLUMN_X
      return rect(COLUMN_X[col] + 10, 50, 260, 120)
    }
    // Cartão "fantasma" que acompanha o mouse: começa onde o cartão arrastado estava (coluna A fazer).
    if (this.hasAttribute("data-drag-overlay")) return rect(COLUMN_X.todo + 10, 50, 260, 120)
    return realRect.call(this)
  }
}

// Passo a passo, dando tempo ao dnd-kit de medir as colunas entre um evento e outro.
const tick = () => act(() => new Promise((r) => setTimeout(r, 20)))
async function drag(card: Element, dx: number) {
  const handle = card.closest("[data-task-id]")!
  fireEvent.mouseDown(handle, { button: 0, clientX: 100, clientY: 100 })
  await tick()
  fireEvent.mouseMove(document, { clientX: 110, clientY: 100 })
  await tick()
  fireEvent.mouseMove(document, { clientX: 100 + dx, clientY: 100 })
  await tick()
  fireEvent.mouseUp(document, { clientX: 100 + dx, clientY: 100 })
  await tick()
}

const column = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) })

function useBoardApi(initial: Task[]) {
  const db = { tasks: initial.map((t) => ({ ...t })), patches: [] as unknown[] }
  server.use(
    http.get(`${API}/groups/7`, () => HttpResponse.json({ group })),
    http.get(`${API}/groups/7/tasks`, () => HttpResponse.json({ tasks: db.tasks, summary: summarize(db.tasks) })),
    http.patch(`${API}/groups/7/tasks/:taskId/status`, async ({ request, params }) => {
      const body = (await request.json()) as { status: Task["status"] }
      db.patches.push(body)
      const task = db.tasks.find((t) => t.id === Number(params.taskId))!
      task.status = body.status
      return HttpResponse.json({ task })
    }),
  )
  return db
}

beforeEach(() => {
  storeSession()
  fakeLayout()
})
afterEach(() => {
  Element.prototype.getBoundingClientRect = realRect
})

describe("arrastar cartões no quadro", () => {
  it("arrastar para outra coluna muda o status e salva", async () => {
    const db = useBoardApi([makeTask(1, "Introdução"), makeTask(2, "Capa")])
    renderApp("/grupos/7")
    const card = await screen.findByRole("article", { name: "Introdução" })

    await drag(card, 600) // A fazer → Concluído

    await waitFor(() =>
      expect(within(column("Concluído")).getByRole("article", { name: "Introdução" })).toBeInTheDocument(),
    )
    expect(screen.getByText("50%")).toBeInTheDocument()
    await waitFor(() => expect(db.patches).toEqual([{ status: "done" }]))
  })

  it("soltar na mesma coluna não chama a API", async () => {
    const db = useBoardApi([makeTask(1, "Introdução")])
    renderApp("/grupos/7")
    await drag(await screen.findByRole("article", { name: "Introdução" }), 20)
    await new Promise((r) => setTimeout(r, 50))
    expect(db.patches).toEqual([])
    expect(within(column("A fazer")).getByRole("article", { name: "Introdução" })).toBeInTheDocument()
  })

  it("se falhar, o cartão volta para a coluna anterior", async () => {
    useBoardApi([makeTask(1, "Introdução")])
    server.use(http.patch(`${API}/groups/7/tasks/1/status`, () => apiError(500, "INTERNAL_ERROR", "Erro")))
    renderApp("/grupos/7")
    await drag(await screen.findByRole("article", { name: "Introdução" }), 300)

    expect(await screen.findByText(/Não foi possível mudar o status/)).toBeInTheDocument()
    await waitFor(() =>
      expect(within(column("A fazer")).getByRole("article", { name: "Introdução" })).toBeInTheDocument(),
    )
  })

  it("clicar nos botões e no seletor do cartão não inicia arrasto", async () => {
    const db = useBoardApi([makeTask(1, "Introdução")])
    renderApp("/grupos/7")
    const select = await screen.findByRole("combobox", { name: "Status de Introdução" })
    fireEvent.mouseDown(select, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(document, { clientX: 700, clientY: 100 })
    fireEvent.mouseUp(document, { clientX: 700, clientY: 100 })
    await new Promise((r) => setTimeout(r, 50))
    expect(db.patches).toEqual([])
  })
})

describe("droppedStatus", () => {
  const active = (task: Task) => ({ id: task.id, data: { current: { task } }, rect: { current: { initial: null, translated: null } } })
  const over = (id: string) => ({ id, rect: {} as never, disabled: false, data: { current: undefined } })

  it("devolve a coluna nova, ou null se soltou fora ou na mesma coluna", () => {
    const task = makeTask(1, "A")
    expect(droppedStatus({ active: active(task), over: over("done") })).toBe("done")
    expect(droppedStatus({ active: active(task), over: over("todo") })).toBeNull()
    expect(droppedStatus({ active: active(task), over: null })).toBeNull()
  })
})
