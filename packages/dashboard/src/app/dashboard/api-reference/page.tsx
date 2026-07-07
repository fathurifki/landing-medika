"use client";

import { useState } from "react";
import { Copy, Check, Lock, Globe } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  body?: Record<string, string>;
  params?: string[];
  query?: string[];
}

interface Group {
  label: string;
  color: string;
  endpoints: Endpoint[];
}

const API_GROUPS: Group[] = [
  {
    label: "Auth",
    color: "#0099ff",
    endpoints: [
      { method: "POST", path: "/api/auth/login",   description: "Login with email + password. Returns accessToken + refreshToken.", auth: false, body: { email: "string", password: "string" } },
      { method: "POST", path: "/api/auth/refresh",  description: "Exchange refreshToken for a new accessToken.", auth: false, body: { refreshToken: "string" } },
      { method: "GET",  path: "/api/auth/me",       description: "Get current authenticated user profile.", auth: true },
    ],
  },
  {
    label: "Files",
    color: "#d44df0",
    endpoints: [
      { method: "GET",    path: "/files/:id",      description: "Serve a file by its UUID. Public.", auth: false, params: ["id: file UUID"] },
      { method: "GET",    path: "/files",           description: "List all uploaded files.", auth: true },
      { method: "POST",   path: "/files/upload",   description: "Upload a file (multipart/form-data). Returns file record with UUID.", auth: true, body: { file: "File (multipart)" } },
      { method: "DELETE", path: "/files/:id",      description: "Delete a file from storage and database.", auth: true, params: ["id: file UUID"] },
    ],
  },
  {
    label: "Blog",
    color: "#22c55e",
    endpoints: [
      { method: "GET",    path: "/api/items/Blog",      description: "List blog posts. Optional ?page= for pagination.", auth: false, query: ["page (int)", "limit (int)", "status (published|draft)"] },
      { method: "GET",    path: "/api/items/Blog/:id",  description: "Get single blog post by ID.", auth: false, params: ["id: integer"] },
      { method: "POST",   path: "/api/items/Blog",      description: "Create a new blog post.", auth: true, body: { title: "string", content: "string (HTML)", banner: "uuid (file)", status: "published|draft", slugs: "string", tags: "string[]" } },
      { method: "PUT",    path: "/api/items/Blog/:id",  description: "Update a blog post.", auth: true, params: ["id: integer"] },
      { method: "DELETE", path: "/api/items/Blog/:id",  description: "Delete a blog post.", auth: true, params: ["id: integer"] },
    ],
  },
  {
    label: "Catalog",
    color: "#ff7a3d",
    endpoints: [
      { method: "GET",    path: "/api/items/Catalog",        description: "List catalog items. Supports Directus-compatible ?filter= JSON.", auth: false, query: ["filter (JSON)", "page (int)", "limit (int)"] },
      { method: "GET",    path: "/api/items/Catalog/:uuid",  description: "Get single catalog item by UUID.", auth: false, params: ["uuid: UUID"] },
      { method: "POST",   path: "/api/items/Catalog",        description: "Create catalog item.", auth: true, body: { name: "string", description: "string (HTML)", status: "published|draft", productImage: "uuid", additionalImage: "uuid", productVideo: "uuid", product: "int (category FK)", subProduct: "int (sub-category FK)", brandId: "int", tags: "string[]" } },
      { method: "PUT",    path: "/api/items/Catalog/:uuid",  description: "Update catalog item.", auth: true, params: ["uuid: UUID"] },
      { method: "DELETE", path: "/api/items/Catalog/:uuid",  description: "Delete catalog item.", auth: true, params: ["uuid: UUID"] },
    ],
  },
  {
    label: "Partners",
    color: "#6a4cf5",
    endpoints: [
      { method: "GET",    path: "/api/items/partners",      description: "List all partners.", auth: false },
      { method: "GET",    path: "/api/items/partners/:id",  description: "Get partner by ID.", auth: false, params: ["id: integer"] },
      { method: "POST",   path: "/api/items/partners",      description: "Create partner.", auth: true, body: { name: "string", logos: "uuid (file)", partnershipTypes: "1=international | 2=local" } },
      { method: "PUT",    path: "/api/items/partners/:id",  description: "Update partner.", auth: true, params: ["id: integer"] },
      { method: "DELETE", path: "/api/items/partners/:id",  description: "Delete partner.", auth: true, params: ["id: integer"] },
    ],
  },
  {
    label: "Medical Specialty",
    color: "#ff5577",
    endpoints: [
      { method: "GET",    path: "/api/items/medical_specialty",      description: "List all medical specialties.", auth: false },
      { method: "GET",    path: "/api/items/medical_specialty/:id",  description: "Get specialty by ID.", auth: false, params: ["id: integer"] },
      { method: "POST",   path: "/api/items/medical_specialty",      description: "Create specialty.", auth: true, body: { title: "string", description: "string (HTML)", image: "uuid (file)" } },
      { method: "PUT",    path: "/api/items/medical_specialty/:id",  description: "Update specialty.", auth: true },
      { method: "DELETE", path: "/api/items/medical_specialty/:id",  description: "Delete specialty.", auth: true },
    ],
  },
  {
    label: "Taxonomy",
    color: "#999999",
    endpoints: [
      { method: "GET",    path: "/api/items/category_product",      description: "List product categories.", auth: false },
      { method: "POST",   path: "/api/items/category_product",      description: "Create category.", auth: true, body: { name: "string" } },
      { method: "PUT",    path: "/api/items/category_product/:id",  description: "Update category.", auth: true },
      { method: "DELETE", path: "/api/items/category_product/:id",  description: "Delete category.", auth: true },
      { method: "GET",    path: "/api/items/sub_category",          description: "List sub-categories.", auth: false },
      { method: "POST",   path: "/api/items/sub_category",          description: "Create sub-category.", auth: true, body: { subCategory: "string" } },
      { method: "PUT",    path: "/api/items/sub_category/:id",      description: "Update sub-category.", auth: true },
      { method: "DELETE", path: "/api/items/sub_category/:id",      description: "Delete sub-category.", auth: true },
      { method: "GET",    path: "/api/items/brand",                 description: "List brands.", auth: false },
      { method: "POST",   path: "/api/items/brand",                 description: "Create brand.", auth: true, body: { brandName: "string" } },
      { method: "PUT",    path: "/api/items/brand/:id",             description: "Update brand.", auth: true },
      { method: "DELETE", path: "/api/items/brand/:id",             description: "Delete brand.", auth: true },
    ],
  },
  {
    label: "Events",
    color: "#0099ff",
    endpoints: [
      { method: "GET",    path: "/api/items/event_types",        description: "List event types.", auth: false },
      { method: "GET",    path: "/api/items/event_types/:id",    description: "Get event type by ID.", auth: false },
      { method: "POST",   path: "/api/items/event_types",        description: "Create event type.", auth: true, body: { eventName: "string", nameEvents: "string", slug: "string", description: "string (HTML)", eventImage: "uuid" } },
      { method: "PUT",    path: "/api/items/event_types/:id",    description: "Update event type.", auth: true },
      { method: "DELETE", path: "/api/items/event_types/:id",    description: "Delete event type.", auth: true },
      { method: "GET",    path: "/api/items/Events",             description: "List event gallery images. Supports ?filter={medical_events:{_eq:id}}.", auth: false, query: ["filter (JSON)"] },
      { method: "POST",   path: "/api/items/Events",             description: "Add gallery image to event type.", auth: true, body: { eventImage: "uuid", medicalEvents: "int (event_type FK)" } },
      { method: "DELETE", path: "/api/items/Events/:id",         description: "Remove gallery image.", auth: true },
    ],
  },
  {
    label: "Contacts",
    color: "#22c55e",
    endpoints: [
      { method: "POST",   path: "/api/items/client_contact",      description: "Submit contact form. Public. Accepts both phone_number and phoneNumber.", auth: false, body: { name: "string", email: "string", phone_number: "string (or phoneNumber)", message: "string" } },
      { method: "GET",    path: "/api/items/client_contact",       description: "List all contact submissions (inbox).", auth: true },
      { method: "GET",    path: "/api/items/client_contact/:id",   description: "Get single contact by ID.", auth: true },
      { method: "PATCH",  path: "/api/items/client_contact/:id/read", description: "Mark contact as read.", auth: true },
      { method: "DELETE", path: "/api/items/client_contact/:id",   description: "Delete contact.", auth: true },
    ],
  },
  {
    label: "Company",
    color: "#d44df0",
    endpoints: [
      { method: "GET", path: "/api/items/Company",  description: "Get company profile (single record).", auth: false },
      { method: "PUT", path: "/api/items/Company",  description: "Upsert company profile.", auth: true, body: { address: "string", phoneNumber: "string", emailAddress: "string", instagram: "url", youtube: "url", linkedin: "url", logoNavbar: "uuid", logoFooter: "uuid" } },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    "#22c55e",
  POST:   "#0099ff",
  PUT:    "#ff7a3d",
  PATCH:  "#d44df0",
  DELETE: "#ff5577",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded transition-colors"
      style={{ color: "var(--ink-muted)" }}
      title="Copy URL"
    >
      {copied ? <Check className="w-3 h-3" style={{ color: "#22c55e" }} /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function EndpointRow({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const fullUrl = `${BASE_URL}${ep.path}`;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{ border: `1px solid var(--hairline)`, background: open ? "var(--surface-2)" : "var(--surface-1)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="text-xs font-bold w-14 shrink-0 rounded px-1.5 py-0.5 text-center"
          style={{ background: `${METHOD_COLORS[ep.method]}22`, color: METHOD_COLORS[ep.method] }}
        >
          {ep.method}
        </span>
        <code className="text-xs flex-1 font-mono" style={{ color: "var(--ink)" }}>{ep.path}</code>
        <div className="flex items-center gap-2 shrink-0">
          {ep.auth ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#ff7a3d" }}>
              <Lock className="w-3 h-3" /> Auth
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
              <Globe className="w-3 h-3" /> Public
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--hairline)" }}>
          <p className="text-xs pt-3" style={{ color: "var(--ink-muted)" }}>{ep.description}</p>

          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}>
            <code className="text-xs flex-1 font-mono" style={{ color: "var(--accent-blue)" }}>{fullUrl}</code>
            <CopyButton text={fullUrl} />
          </div>

          {ep.params && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Path Parameters</p>
              <div className="space-y-1">
                {ep.params.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs rounded px-2 py-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
                    <code style={{ color: "var(--ink)" }}>{p}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ep.query && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Query Parameters</p>
              <div className="space-y-1">
                {ep.query.map((q) => (
                  <div key={q} className="flex items-center gap-2 text-xs rounded px-2 py-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
                    <code style={{ color: "var(--ink)" }}>{q}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ep.body && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Request Body (JSON)</p>
              <div className="rounded-lg p-3 font-mono text-xs space-y-1" style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}>
                <span style={{ color: "var(--ink-muted)" }}>{"{"}</span>
                {Object.entries(ep.body).map(([k, v]) => (
                  <div key={k} className="pl-4">
                    <span style={{ color: "#d44df0" }}>"{k}"</span>
                    <span style={{ color: "var(--ink-muted)" }}>: </span>
                    <span style={{ color: "#22c55e" }}>// {v}</span>
                  </div>
                ))}
                <span style={{ color: "var(--ink-muted)" }}>{"}"}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiReferencePage() {
  const [search, setSearch] = useState("");
  const totalEndpoints = API_GROUPS.reduce((acc, g) => acc + g.endpoints.length, 0);

  const filtered = search
    ? API_GROUPS.map((g) => ({
        ...g,
        endpoints: g.endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(search.toLowerCase()) ||
            ep.description.toLowerCase().includes(search.toLowerCase()) ||
            ep.method.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.endpoints.length > 0)
    : API_GROUPS;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>
          API Reference
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          {totalEndpoints} endpoints · Base URL:{" "}
          <code className="text-xs" style={{ color: "var(--accent-blue)" }}>{BASE_URL}</code>
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search endpoints…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm mb-6"
        style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
      />

      {/* Auth note */}
      <div className="rounded-xl px-4 py-3 mb-6 flex items-start gap-3" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
        <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#ff7a3d" }} />
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>Protected endpoints require JWT</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            Add <code className="text-xs" style={{ color: "var(--accent-blue)" }}>Authorization: Bearer &lt;accessToken&gt;</code> header. Get token from <code className="text-xs" style={{ color: "var(--accent-blue)" }}>POST /api/auth/login</code>.
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {filtered.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
                {group.label}
              </h2>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {group.endpoints.map((ep, i) => (
                <EndpointRow key={`${ep.method}-${ep.path}-${i}`} ep={ep} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
