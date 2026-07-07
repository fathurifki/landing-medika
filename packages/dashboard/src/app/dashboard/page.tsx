import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getStats(accessToken?: string) {
  const apiUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://backend:3001/api";
  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;

  try {
    // limit=1 keeps the payload tiny — the real count comes from meta.total,
    // not from data.length (which would always be 0 or 1). Unread messages
    // use the same trick with a `read=false` filter instead of downloading
    // the entire inbox just to count it.
    const [blogs, catalog, partners, unreadContacts] = await Promise.all([
      fetch(`${apiUrl}/items/Blog?limit=1`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${apiUrl}/items/Catalog?limit=1`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${apiUrl}/items/partners?limit=1`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${apiUrl}/items/client_contact?read=false&limit=1`, {
        cache: "no-store",
        headers: authHeaders,
      }).then((r) => r.json()),
    ]);
    return {
      blogs: blogs?.meta?.total ?? 0,
      catalog: catalog?.meta?.total ?? 0,
      partners: partners?.meta?.total ?? 0,
      contacts: unreadContacts?.meta?.total ?? 0,
    };
  } catch {
    return { blogs: 0, catalog: 0, partners: 0, contacts: 0 };
  }
}

const statCards = [
  { label: "Blog Posts",       key: "blogs",    accent: "#0099ff" },
  { label: "Catalog Items",    key: "catalog",  accent: "#22c55e" },
  { label: "Partners",         key: "partners", accent: "#d44df0" },
  { label: "Unread Messages",  key: "contacts", accent: "#ff7a3d" },
] as const;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getStats((session as any)?.accessToken);

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}
        >
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          Here&apos;s what&apos;s happening with your site.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, key, accent }) => (
          <div
            key={key}
            className="rounded-xl p-5"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
            }}
          >
            <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
              {label}
            </p>
            <p
              className="text-4xl font-semibold mt-3"
              style={{ color: accent, letterSpacing: "-0.04em" }}
            >
              {stats[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
