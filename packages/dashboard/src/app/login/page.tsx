"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { dashboardAppRoutes, toDashboardPublicPath } from "@/lib/routes";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        ...form,
        redirect: false,
        callbackUrl: toDashboardPublicPath(dashboardAppRoutes.home),
      });

      if (res?.error) {
        toast.error("Invalid email or password");
        return;
      }

      // Use a full navigation after NextAuth sets the session cookie so the
      // protected dashboard request always sees the fresh session on first load.
      window.location.assign(
        res?.url ?? toDashboardPublicPath(dashboardAppRoutes.home)
      );
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--canvas)" }}
    >
      <div className="w-full max-w-sm px-8">
        <div className="mb-10 text-center">
          <h1
            className="font-semibold text-2xl"
            style={{ color: "var(--ink)", letterSpacing: "-0.05em" }}
          >
            APM Medical
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--ink-muted)" }}>
            Sign in to your dashboard
          </p>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>
                Email
              </label>
              <input
                id="email" type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-blue)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                placeholder="admin@domain.co.id"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>
                Password
              </label>
              <input
                id="password" type="password" required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-blue)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium rounded-full transition-opacity disabled:opacity-50"
              style={{ background: "var(--ink)", color: "var(--canvas)", letterSpacing: "-0.01em" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
