export const DASHBOARD_BASE_PATH = "/dashboard";
const LEGACY_DASHBOARD_SEGMENT = "/dashboard";

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export const dashboardAppRoutes = {
  home: "/",
  login: "/login",
  company: "/company",
  blog: "/blog",
  catalog: "/catalog",
  partners: "/partners",
  medicalSpecialty: "/medical-specialty",
  categories: "/categories",
  events: "/events",
  contacts: "/contacts",
  media: "/media",
  apiReference: "/api-reference",
} as const;

export const dashboardAuthBasePath = `${DASHBOARD_BASE_PATH}/api/auth`;

export function toDashboardPublicPath(pathname: string): string {
  const normalized = normalizePath(pathname);
  return normalized === "/" ? DASHBOARD_BASE_PATH : `${DASHBOARD_BASE_PATH}${normalized}`;
}

export function stripDashboardBasePath(pathname: string): string {
  const normalized = normalizePath(pathname);

  if (normalized === DASHBOARD_BASE_PATH) {
    return "/";
  }

  if (normalized.startsWith(`${DASHBOARD_BASE_PATH}/`)) {
    return normalized.slice(DASHBOARD_BASE_PATH.length) || "/";
  }

  return normalized;
}

export function stripLegacyDashboardSegment(pathname: string): string {
  const normalized = normalizePath(pathname);

  if (normalized === LEGACY_DASHBOARD_SEGMENT) {
    return "/";
  }

  if (normalized.startsWith(`${LEGACY_DASHBOARD_SEGMENT}/`)) {
    return normalized.slice(LEGACY_DASHBOARD_SEGMENT.length) || "/";
  }

  return normalized;
}

export function toLegacyDashboardPath(pathname: string): string {
  const normalized = normalizePath(pathname);

  // Home ("/") and login ("/login") were flattened to top-level files
  // (src/app/page.tsx, src/app/login/page.tsx), so they need no rewrite —
  // only the remaining pages still live nested under src/app/dashboard/*.
  if (normalized === dashboardAppRoutes.home || normalized === dashboardAppRoutes.login) {
    return normalized;
  }

  if (normalized === LEGACY_DASHBOARD_SEGMENT) {
    return LEGACY_DASHBOARD_SEGMENT;
  }

  if (normalized.startsWith(`${LEGACY_DASHBOARD_SEGMENT}/`)) {
    return normalized;
  }

  return `${LEGACY_DASHBOARD_SEGMENT}${normalized}`;
}
