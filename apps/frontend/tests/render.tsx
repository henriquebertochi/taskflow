import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { Providers } from "@/providers"
import { routes } from "@/router"

export function renderApp(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}
