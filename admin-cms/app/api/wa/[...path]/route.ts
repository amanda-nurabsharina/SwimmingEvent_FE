import { NextRequest, NextResponse } from "next/server";

const WA_TARGET =
  process.env.WA_GATEWAY_INTERNAL_URL ||
  process.env.WA_GATEWAY_URL ||
  "http://localhost:5001/api/wa";

async function proxyRequest(req: NextRequest, pathArray: string[]) {
  const subPath = (pathArray || []).join("/");
  const url = new URL(req.url);
  const targetUrl = `${WA_TARGET.replace(/\/+$/, "")}/${subPath}${url.search}`;

  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const body = await req.text();
        if (body) {
          init.body = body;
        }
      } catch {}
    }

    const res = await fetch(targetUrl, init);
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        isConnected: false,
        message: "WhatsApp Gateway service belum aktif di server: " + (err?.message || "Offline"),
        status: "offline",
      },
      { status: 200 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params.path);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params.path);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params.path);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params.path);
}
