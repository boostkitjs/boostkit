interface Crumb {
  label: string
  href?: string
}

interface Props {
  crumbs: Crumb[]
}

export function Breadcrumbs({ crumbs }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span>/</span>}
          {crumb.href
            ? <a href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</a>
            : <span className="text-foreground font-medium">{crumb.label}</span>
          }
        </span>
      ))}
    </nav>
  )
}
