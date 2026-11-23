import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { API } from "./fixtures"

// Respostas padrão; cada teste sobrescreve com server.use(...).
export const server = setupServer(
  http.get(`${API}/groups`, () => HttpResponse.json({ groups: [] })),
  http.get(`${API}/groups/:id/members`, () => HttpResponse.json({ members: [] })),
  http.get(`${API}/groups/:id/tasks`, () => HttpResponse.json({ tasks: [] })),
)
