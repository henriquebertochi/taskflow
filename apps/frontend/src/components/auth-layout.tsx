import { Link } from "react-router"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { brand } from "@/config/brand"

type AuthLayoutProps = {
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-4 sm:p-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <Link to="/" aria-label="Ir para o início" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <p className="text-sm text-muted-foreground">{brand.tagline}</p>
      </div>
      <Card className="w-full max-w-sm shadow-[0_8px_24px_rgb(0_0_0/0.06)]">
        <CardHeader>
          <CardTitle role="heading" aria-level={1} className="text-lg font-medium">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </main>
  )
}
