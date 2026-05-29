import Link from "next/link"

const checks = [
  "Glossary enforcement on every segment",
  "Fuzzy-matched translation memory suggestions",
  "Confidence scoring for each translation",
  "One-click QA report generation",
]

export default function CopilotDemo() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        {/* Left column */}
        <div>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            See the AI Copilot in action
          </h2>
          <p className="mt-4 text-muted-foreground">
            Paste any text and the copilot translates segment by segment, applying your glossary
            and surfacing fuzzy matches from translation memory in real time.
          </p>

          {/* Source box */}
          <div className="mt-8 rounded-xl bg-muted p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Source — English
            </p>
            <p className="text-sm text-foreground">
              The contract shall be governed by the laws of the jurisdiction in which the
              registered office of the Company is located.
            </p>
          </div>

          {/* Arrow */}
          <div className="my-3 flex items-center justify-center gap-2 text-brand-cyan">
            <div className="h-px flex-1 bg-brand-cyan/20" />
            <span className="text-xs font-medium">AI Translation</span>
            <div className="h-px flex-1 bg-brand-cyan/20" />
          </div>

          {/* Translation box */}
          <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
              Translation — Spanish
            </p>
            <p className="text-sm text-foreground">
              El contrato se regirá por las leyes de la jurisdicción en la que se encuentre el
              domicilio social de la Empresa.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div>
          <ul className="space-y-4">
            {checks.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg font-bold text-brand-cyan">✓</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/translations"
            className="mt-10 inline-block rounded-xl bg-brand-cyan px-8 py-3 font-semibold text-white shadow-lg shadow-brand-cyan/30 transition-opacity hover:opacity-90"
          >
            Try it now
          </Link>
        </div>
      </div>
    </section>
  )
}
