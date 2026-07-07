import { NextResponse } from "next/server";

// Used by the Docker HEALTHCHECK in packages/dashboard/Dockerfile.
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
