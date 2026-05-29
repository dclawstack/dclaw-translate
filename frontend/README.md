# DClaw Translate — Frontend

Next.js 14 App Router frontend for DClaw Translate. Provides the full UI for AI translation, document upload, glossary management, translation memory, QA checks, and review workflows.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| UI primitives | Radix UI (via shadcn-style components) |
| Testing | Vitest + Testing Library |
| Build output | Standalone (`output: 'standalone'`) |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — wraps everything with AppShell
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── globals.css             # CSS variables (light/dark), Tailwind base
│   │   ├── not-found.tsx           # 404 page
│   │   ├── (app)/
│   │   │   └── layout.tsx          # App route group layout (future use)
│   │   ├── dashboard/
│   │   │   └── page.tsx            # /dashboard — stats, recent items, seed/clear
│   │   ├── translations/
│   │   │   └── page.tsx            # /translations — AI translation workspace
│   │   ├── documents/
│   │   │   └── page.tsx            # /documents — upload, translate, download
│   │   ├── glossary/
│   │   │   └── page.tsx            # /glossary — terms + translation memory tabs
│   │   ├── qa/
│   │   │   └── page.tsx            # /qa — QA reports + review queue tabs
│   │   └── settings/
│   │       └── providers/
│   │           └── page.tsx        # /settings/providers — LLM provider config
│   ├── components/
│   │   ├── app-shell.tsx           # Client wrapper: sidebar for app pages, none for /
│   │   ├── sidebar.tsx             # Collapsible sidebar nav with theme toggle
│   │   ├── landing/
│   │   │   ├── navbar.tsx          # Sticky glassmorphism navbar
│   │   │   ├── hero-section.tsx    # Hero with floating cards, gradient headline
│   │   │   ├── feature-carousel.tsx # Auto-scrolling feature cards
│   │   │   ├── copilot-demo.tsx    # Static two-column demo section
│   │   │   ├── cta-strip.tsx       # Full-width gradient CTA
│   │   │   └── footer.tsx          # Simple footer
│   │   └── ui/                     # Shared UI primitives (shadcn-style)
│   └── lib/
│       └── api.ts                  # All API types + fetch functions
├── public/
│   └── dclaw-manifest.json         # DClaw app registry manifest
├── next.config.js                  # API proxy rewrites to backend
├── tailwind.config.ts              # Theme: brand-cyan, brand-emerald, CSS vars
├── tsconfig.json
├── vitest.config.ts
└── vitest.setup.ts
```

---

## Prerequisites

- Node.js 18+
- npm 9+
- Backend running at `http://localhost:8104` (see `backend/README.md`)

---

## First-Time Setup

```bash
cd frontend
npm install
```

---

## Running the App

### Development (with hot reload)

```bash
cd frontend
npm run dev
```

App runs at: `http://localhost:3018`

The dev server proxies all `/api/v1/*` requests to `http://localhost:8104` via `next.config.js` rewrites — the backend must be running for data to load.

### Production build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

### TypeScript check (no emit)

```bash
npx tsc --noEmit
```

---

## Environment Variables

Create a `.env.local` file if you need to override defaults:

```env
NEXT_PUBLIC_API_URL=http://localhost:8104
```

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8104` | Backend base URL used by `next.config.js` rewrites |

> All API calls in `src/lib/api.ts` use relative paths (`/api/v1/...`). The Next.js rewrite in `next.config.js` proxies them to the backend. You should **never** hardcode the backend URL in component code.

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, features, CTA — no sidebar |
| `/dashboard` | Dashboard | Stats cards, recent activity, seed/clear demo data |
| `/translations` | Translations | Side-by-side translation workspace + history |
| `/documents` | Documents | Drag-and-drop upload, translate, download pipeline |
| `/glossary` | Glossary | Term CRUD, bulk import, translation memory search |
| `/qa` | QA & Reviews | QA checks runner + review assignment/approval queue |
| `/settings/providers` | Providers | LLM provider config (Ollama, OpenRouter) |

---

## Theme System

The app supports **light and dark mode**, toggled via the sidebar footer button. The preference is persisted in `localStorage` under the key `"theme"` and applied as a `dark` class on `<html>`.

### CSS Variables

Defined in `src/app/globals.css`:

```css
:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 6%;
  --card: 0 0% 100%;
  --muted: 0 0% 94%;
  --muted-foreground: 220 9% 46%;
  --border: 220 13% 91%;
  --brand: #0891B2;         /* brand-cyan */
  --brand-secondary: #10B981; /* brand-emerald */
  /* ... */
}

.dark {
  --background: 0 0% 4%;
  --foreground: 0 0% 96%;
  /* ... */
}
```

### Tailwind tokens

| Token | Value | Usage |
|---|---|---|
| `bg-background` | `hsl(var(--background))` | Page backgrounds |
| `bg-card` | `hsl(var(--card))` | Card/panel surfaces |
| `bg-muted` | `hsl(var(--muted))` | Table headers, hover states |
| `text-foreground` | `hsl(var(--foreground))` | Primary text |
| `text-muted-foreground` | `hsl(var(--muted-foreground))` | Labels, secondary text |
| `border-border` | `hsl(var(--border))` | All borders |
| `text-brand-cyan` | `#0891B2` | Brand accent, active nav, CTAs |
| `text-brand-emerald` | `#10B981` | Secondary accent |

**Rule:** Never use hardcoded `gray-*`, `white`, or `black` for structural colors. Always use semantic tokens so dark mode works automatically. For status badges (green/yellow/red/blue), always add `dark:` variants.

---

## API Client (`src/lib/api.ts`)

All backend communication goes through `src/lib/api.ts`. It exports typed interfaces and async functions for every endpoint group.

### Base pattern

```ts
async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

### Example usage

```ts
import { createTranslation, getTranslations, type Translation } from "@/lib/api"

const result = await createTranslation({
  source_text: "Hello world",
  source_lang: "en",
  target_lang: "es",
})
```

### Available function groups

- **Providers**: `getProviders`, `createProvider`, `updateProvider`, `deleteProvider`, `setDefaultProvider`, `testProviderConnection`
- **Translations**: `createTranslation`, `getTranslations`, `getTranslation`, `deleteTranslation`, `retryTranslation`
- **Documents**: `uploadDocument`, `getDocuments`, `translateDocument`, `downloadDocument`, `deleteDocument`
- **Glossary**: `getGlossaryTerms`, `createGlossaryTerm`, `updateGlossaryTerm`, `deleteGlossaryTerm`, `bulkCreateGlossaryTerms`, `getGlossaryDomains`
- **Translation Memory**: `searchTranslationMemory`, `getTMEntries`, `deleteTMEntry`, `getTMStats`
- **QA**: `runQAChecks`, `getQAReport`, `resolveQACheck`, `createReview`, `getReviews`, `getReviewQueue`, `updateReview`
- **Dashboard**: `getDashboardStats`, `seedDemoData`, `clearDemoData`

---

## Running Tests

### Run all tests (once)

```bash
npm test
```

### Run in watch mode

```bash
npm run test:watch
```

Tests use `jsdom` as the environment (configured in `vitest.config.ts`). They do not require the backend to be running.

---

## Sidebar Navigation

The sidebar (`src/components/sidebar.tsx`) is rendered on all routes except `/` via the `AppShell` component in `src/components/app-shell.tsx`. It is:

- **Collapsible** — click the chevron button to collapse to icon-only mode
- **Active-aware** — highlights the current route using `usePathname()`
- **Theme toggle** — Sun/Moon button in the footer persists preference to `localStorage`

---

## Troubleshooting

### `npm run dev` fails with `Cannot find module`

```bash
rm -rf node_modules .next
npm install
npm run dev
```

### API requests return `502` or `ECONNREFUSED`

The backend is not running. Start it first:

```bash
cd ../backend && source .venv/bin/activate && uvicorn app.api.main:app --port 8104 --reload
```

Then in a separate terminal:

```bash
cd frontend && npm run dev
```

### API requests return `404` on `/api/v1/...` routes

Check that `next.config.js` has the rewrite rules and `NEXT_PUBLIC_API_URL` is set correctly:

```js
// next.config.js
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8104";
async rewrites() {
  return [{ source: "/api/v1/:path*", destination: `${API_BASE}/api/v1/:path*` }]
}
```

### Pages appear white / CSS variables not working

CSS variable values in `globals.css` must be raw HSL channels (not hex, not wrapped in `hsl()`):

```css
/* Correct */
--background: 0 0% 98%;

/* Wrong */
--background: #fafafa;
--background: hsl(0, 0%, 98%);
```

Tailwind wraps them with `hsl()` automatically via `tailwind.config.ts`:

```ts
background: "hsl(var(--background))"
```

### Dark mode toggle doesn't persist on refresh

The sidebar's `useEffect` reads `localStorage.getItem("theme")` on mount. If the theme isn't being applied, check that `src/app/layout.tsx` runs a theme-init script **before** React hydration, or check that `AppShell` is being rendered.

### TypeScript errors after editing a page

Run the type checker:

```bash
npx tsc --noEmit 2>&1 | head -40
```

Common causes:
- Missing `"use client"` on a component that uses `useState` / `useEffect`
- A prop type mismatch in a dialog or badge component
- An `api.ts` function returning `unknown` — add a type parameter

### `next build` fails with `Dynamic server usage`

A page is using `useSearchParams()` or `usePathname()` without being a client component. Add `"use client"` at the top of the file.

### `next build` fails with `localStorage is not defined`

A component reads `localStorage` at module level (outside `useEffect`). Wrap it:

```ts
useEffect(() => {
  const theme = localStorage.getItem("theme")
  // ...
}, [])
```

### Landing page floating cards not animating

The `animate-float` class must be defined in `globals.css`:

```css
@keyframes dclaw-float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-12px) rotate(1deg); opacity: 1; }
}
.animate-float { animation: dclaw-float 4s ease-in-out infinite; }
```

---

## Docker

Build and run the frontend container:

```bash
docker build -t dclaw-translate-frontend .
docker run -p 3018:3018 \
  -e NEXT_PUBLIC_API_URL=http://backend:8104 \
  dclaw-translate-frontend
```
