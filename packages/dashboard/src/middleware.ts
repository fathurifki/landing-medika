import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import {
  dashboardAppRoutes,
  stripDashboardBasePath,
  stripLegacyDashboardSegment,
  toDashboardPublicPath,
  toLegacyDashboardPath,
} from "@/lib/routes";

export async function middleware(req: NextRequest) {
  const appPath = stripDashboardBasePath(req.nextUrl.pathname);

  if (
    appPath.startsWith("/api") ||
    appPath.startsWith("/_next") ||
    appPath === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoginPage = appPath === dashboardAppRoutes.login;
  const dedupedPath = stripLegacyDashboardSegment(appPath);

  if (dedupedPath !== appPath) {
    return NextResponse.redirect(
      new URL(toDashboardPublicPath(dedupedPath), req.url)
    );
  }

  if (!token && !isLoginPage) {
    return NextResponse.redirect(
      new URL(toDashboardPublicPath(dashboardAppRoutes.login), req.url)
    );
  }

  // Refresh token expired — force re-login
  if (token && (token as any).error === "RefreshAccessTokenError" && !isLoginPage) {
    return NextResponse.redirect(
      new URL(toDashboardPublicPath(dashboardAppRoutes.login), req.url)
    );
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(
      new URL(toDashboardPublicPath(dashboardAppRoutes.home), req.url)
    );
  }

  if (!isLoginPage) {
    const legacyPath = toLegacyDashboardPath(appPath);

    if (legacyPath !== appPath) {
      // NextResponse.rewrite() automatically re-applies basePath to whatever
      // pathname we set here, so the target must be basePath-relative — do
      // NOT run it through toDashboardPublicPath() or basePath gets doubled.
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = legacyPath;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
