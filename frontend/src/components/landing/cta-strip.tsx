import Link from "next/link"

const decorativeCircles = [
  { size: "w-64 h-64", pos: "-top-16 -left-16" },
  { size: "w-32 h-32", pos: "top-8 left-48" },
  { size: "w-48 h-48", pos: "-bottom-12 left-1/4" },
  { size: "w-20 h-20", pos: "top-4 left-1/3" },
  { size: "w-56 h-56", pos: "-top-20 right-24" },
  { size: "w-40 h-40", pos: "bottom-0 right-16" },
  { size: "w-24 h-24", pos: "top-1/2 right-1/3" },
  { size: "w-16 h-16", pos: "bottom-8 left-8" },
]

export default function CTAStrip() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand-cyan to-brand-emerald py-24">
      {/* Decorative circles */}
      {decorativeCircles.map((c, i) => (
        <div
          key={i}
          aria-hidden
          className={`pointer-events-none absolute rounded-full bg-white/10 ${c.size} ${c.pos}`}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-4xl font-black text-white">Ready to translate?</h2>
        <p className="mt-3 text-lg text-white/80">Start with demo data in seconds.</p>
        <Link
          href="/dashboard"
          className="mt-8 rounded-2xl bg-white px-10 py-4 font-bold text-brand-cyan transition-transform hover:scale-105"
        >
          Get Started
        </Link>
      </div>
    </section>
  )
}
