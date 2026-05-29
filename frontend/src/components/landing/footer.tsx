import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
        <div>
          <span className="font-black text-foreground">DClaw Translate</span>
          <span className="ml-3 text-sm text-muted-foreground">
            © {new Date().getFullYear()} DClaw. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>Built with DClaw Stack</span>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  )
}
