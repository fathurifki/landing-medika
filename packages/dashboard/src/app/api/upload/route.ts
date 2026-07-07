import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.BACKEND_URL?.replace("/api", "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:3001";

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (token as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token in session" }, { status: 401 });
  }

  const formData = await req.formData();

  try {
    const res = await fetch(`${BACKEND_URL}/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/upload] backend error:", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
