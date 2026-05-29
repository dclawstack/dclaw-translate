import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-6xl font-black text-brand-cyan">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-brand-cyan px-6 py-2 font-semibold text-white hover:opacity-90"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
