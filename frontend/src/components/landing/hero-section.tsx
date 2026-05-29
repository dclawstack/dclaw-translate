import Link from "next/link"

const floatingCards = [
  { label: "English → Spanish", left: "8%", top: "20%", delay: "0s" },
  { label: "PDF Translation", left: "75%", top: "15%", delay: "1.2s" },
  { label: "Glossary", left: "85%", top: "55%", delay: "0.6s" },
  { label: "QA Check ✓", left: "5%", top: "65%", delay: "1.8s" },
  { label: "Translation Memory", left: "70%", top: "75%", delay: "0.3s" },
  { label: "AI Copilot", left: "15%", top: "80%", delay: "2.1s" },
]

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-14">
      {/* Background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-brand-emerald/10 blur-2xl"
      />

      {/* Floating preview cards */}
      {floatingCards.map((card) => (
        <div
          key={card.label}
          aria-hidden
          className="animate-float pointer-events-none absolute rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm"
          style={{ left: card.left, top: card.top, animationDelay: card.delay }}
        >
          {card.label}
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-1.5 text-xs text-brand-cyan">
          <span className="animate-pulse">✦</span> AI-Powered Translation Platform
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
          Translate at the{" "}
          <span className="bg-gradient-to-r from-brand-cyan to-brand-emerald bg-clip-text text-transparent">
            speed
          </span>{" "}
          of thought
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          AI-powered translation with glossary enforcement, translation memory, and QA checks —
          all in one platform.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand-cyan px-8 py-3 font-semibold text-white shadow-lg shadow-brand-cyan/30 transition-opacity hover:opacity-90"
          >
            Start Translating
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-border px-8 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            See Features
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-brand-cyan">30+</div>
            <div className="text-sm text-muted-foreground">Languages</div>
          </div>
          <div>
            <div className="text-3xl font-black text-brand-cyan">5s</div>
            <div className="text-sm text-muted-foreground">Per Page</div>
          </div>
          <div>
            <div className="text-3xl font-black text-brand-cyan">95%+</div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
        </div>
      </div>
    </section>
  )
}
