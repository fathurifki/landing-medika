"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, Package, Handshake,
  Stethoscope, Tag, CalendarDays, MessageSquare,
  Images, LogOut, Building2, Sun, Moon, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardAppRoutes,
  stripDashboardBasePath,
  toDashboardPublicPath,
} from "@/lib/routes";

const navItems = [
  { href: dashboardAppRoutes.home,             label: "Overview",          icon: LayoutDashboard },
  { href: dashboardAppRoutes.company,          label: "Company",           icon: Building2 },
  { href: dashboardAppRoutes.blog,             label: "Blog",              icon: FileText },
  { href: dashboardAppRoutes.catalog,          label: "Catalog",           icon: Package },
  { href: dashboardAppRoutes.partners,         label: "Partners",          icon: Handshake },
  { href: dashboardAppRoutes.medicalSpecialty, label: "Medical Specialty", icon: Stethoscope },
  { href: dashboardAppRoutes.categories,       label: "Taxonomy",          icon: Tag },
  { href: dashboardAppRoutes.events,           label: "Events",            icon: CalendarDays },
  { href: dashboardAppRoutes.contacts,         label: "Contacts",          icon: MessageSquare },
  { href: dashboardAppRoutes.media,            label: "Media",             icon: Images },
  { href: dashboardAppRoutes.apiReference,     label: "API Reference",     icon: Code2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const normalizedPathname = stripDashboardBasePath(pathname);
  const [dark, setDark] = useState(true);

  // Initialise from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("apm-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("apm-theme", next ? "dark" : "light");
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        background: "var(--surface-1)",
        borderRight: "1px solid var(--hairline)",
      }}
    >
      {/* Brand */}
      <div
        className="px-5 py-5 shrink-0 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--hairline-soft)" }}
      >
        <div>
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--ink)", letterSpacing: "-0.03em" }}
          >
            APM Medical
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            CMS Dashboard
          </p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ color: "var(--ink-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)";
          }}
        >
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            normalizedPathname === href ||
            (href !== dashboardAppRoutes.home && normalizedPathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: isActive ? "var(--surface-2)" : "transparent",
                color: isActive ? "var(--ink)" : "var(--ink-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)";
                }
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent-blue)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div
        className="px-2 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--hairline-soft)" }}
      >
        <button
          onClick={() =>
            signOut({
              callbackUrl: toDashboardPublicPath(dashboardAppRoutes.login),
            })
          }
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs font-medium transition-colors"
          style={{ color: "var(--ink-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)";
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
