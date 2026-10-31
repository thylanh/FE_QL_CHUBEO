import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  "https://be-ql-chubeo.onrender.com"
).replace(/\/$/, "");

async function proxyCalendarRequest(request: NextRequest, init?: RequestInit, extraPath = "") {
  const backendUrl = new URL(`/api/calendar${extraPath}`, `${BACKEND_API_URL}/`);
  const { searchParams } = new URL(request.url);

  searchParams.forEach((value, key) => {
    if (key === "from" || key === "to") {
      backendUrl.searchParams.append(key, value);
    }
  });

  const headers = new Headers(init?.headers || {});
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  const response = await fetch(backendUrl, {
    ...init,
    headers,
    cache: "no-store",
  });

  const responseText = await response.text();
  let payload: unknown = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = { success: false, error: "Backend trả về dữ liệu không hợp lệ." };
  }

  return NextResponse.json(
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : { success: false, error: "Backend không trả về JSON hợp lệ." },
    { status: response.status }
  );
}

export async function GET(request: NextRequest) {
  return proxyCalendarRequest(request, { method: "GET" });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return proxyCalendarRequest(request, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
