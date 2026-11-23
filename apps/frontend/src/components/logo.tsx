import { brand } from "@/config/brand"

// Marca: wordmark com um pequeno visto no azul de caneta. Trocar por SVG/imagem quando a logo existir (apenas aqui).
export function Logo({ className }: { className?: string }) {
  return (
    <span className={className ?? "inline-flex items-center gap-2 text-lg font-semibold"}>
      <svg viewBox="0 0 20 20" className="size-5 text-primary" aria-hidden="true">
        <rect x="1" y="1" width="18" height="18" rx="5" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {brand.name}
    </span>
  )
}
