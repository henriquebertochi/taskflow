import { brand } from "@/config/brand"

// Placeholder textual; trocar por SVG/imagem quando a logo existir (apenas aqui).
export function Logo({ className }: { className?: string }) {
  return <span className={className ?? "text-xl font-semibold tracking-tight"}>{brand.name}</span>
}
