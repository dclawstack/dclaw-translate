"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Languages,
  FileText,
  BookOpen,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/translations", label: "Translations", icon: Languages },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/glossary", label: "Glossary", icon: BookOpen },
  { href: "/qa", label: "QA & Reviews", icon: ShieldCheck },
  { href: "/settings/providers", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const dark = stored === "dark" || (!stored && document.documentElement.classList.contains("dark"))
    setIsDark(dark)
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <div
      className={`flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 overflow-hidden">
          {!collapsed && (
            <span className="whitespace-nowrap text-base font-bold">
              <span className="text-foreground">DClaw</span>{" "}
              <span className="text-brand-cyan">Translate</span>
            </span>
          )}
          {collapsed && (
            <span className="font-bold text-foreground text-base">DC</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg py-2 transition-colors text-sm ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                isActive
                  ? "bg-brand-cyan/10 text-brand-cyan font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-border flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {!collapsed && (
          <span className="text-xs text-muted-foreground">DClaw Stack</span>
        )}
      </div>
    </div>
  )
}
