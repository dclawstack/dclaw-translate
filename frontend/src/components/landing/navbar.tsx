"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Moon, Sun } from "lucide-react"

export default function Navbar() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-1">
          <span className="text-lg font-black text-foreground">DClaw</span>
          <span className="text-sm font-medium italic text-brand-cyan">Translate</span>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it Works
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-cyan/30 transition-opacity hover:opacity-90"
          >
            Open App
          </Link>
        </div>
      </div>
    </nav>
  )
}
