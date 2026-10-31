import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  "https://be-ql-chubeo.onrender.com"
).replace(/\/$/, "");

async function proxyCalendarItemRequest(
  request: NextRequest,
  id: string,
  init?: RequestInit
) {
  const backendUrl = new URL(`/api/calendar/${id}`, `${BACKEND_API_URL}/`);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return proxyCalendarItemRequest(request, id, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return proxyCalendarItemRequest(request, id, {
    method: "DELETE",
  });
}
