import { Brain, FileText, BookOpen, ShieldCheck } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI Translation Copilot",
    description:
      "Segment-by-segment translation with glossary enforcement and confidence scoring",
  },
  {
    icon: FileText,
    title: "Document Translation",
    description:
      "Upload PDF, DOCX, PPTX and get format-preserving translations in seconds",
  },
  {
    icon: BookOpen,
    title: "Translation Memory",
    description:
      "Fuzzy-match past translations to ensure consistency and reduce costs",
  },
  {
    icon: ShieldCheck,
    title: "QA & Review",
    description:
      "Automated quality checks and human review workflow with approval tracking",
  },
]

// Duplicate for seamless loop
const allCards = [...features, ...features]

export default function FeatureCarousel() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-black tracking-tight md:text-4xl">
          Everything you need to translate at scale
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          One platform for the full translation lifecycle — from first draft to final approval.
        </p>
      </div>

      {/* Carousel */}
      <div className="mt-12 overflow-hidden">
        <div className="animate-scroll flex gap-6 w-max">
          {allCards.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="w-72 min-w-[288px] rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 inline-flex rounded-xl bg-brand-cyan/10 p-3">
                  <Icon size={20} className="text-brand-cyan" />
                </div>
                <h3 className="font-bold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
