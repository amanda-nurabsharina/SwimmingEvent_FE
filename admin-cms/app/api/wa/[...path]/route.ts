import { NextRequest, NextResponse } from "next/server";

// Candidate gateway URLs to support local dev, Docker on host, and container networking
const RAW_CANDIDATES = [
  process.env.WA_GATEWAY_INTERNAL_URL,
  process.env.WA_GATEWAY_URL,
  process.env.NEXT_PUBLIC_WA_GATEWAY_URL,
  "http://localhost:5001/api/wa",
  "http://127.0.0.1:5001/api/wa",
  "http://host.docker.internal:5001/api/wa",
  "http://wa-gateway:5001/api/wa",
  "http://172.17.0.1:5001/api/wa",
];

// Clean and deduplicate candidates
const CANDIDATE_TARGETS: string[] = Array.from(
  new Set(
    RAW_CANDIDATES.filter((url): url is string => typeof url === "string" && url.trim().length > 0).map((u) =>
      u.replace(/\/+$/, "")
    )
  )
);

let cachedWorkingTarget: string | null = null;

async function proxyRequest(req: NextRequest, pathArray: string[]) {
  const subPath = (pathArray || []).join("/");
  const url = new URL(req.url);

  const targetsToTry = cachedWorkingTarget
    ? [cachedWorkingTarget, ...CANDIDATE_TARGETS.filter((t) => t !== cachedWorkingTarget)]
    : CANDIDATE_TARGETS;

  let lastError: any = null;

  for (const baseTarget of targetsToTry) {
    const targetUrl = `${baseTarget}/${subPath}${url.search}`;

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

      // Fast timeout per target so we fall through to working target quickly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      init.signal = controller.signal;

      const res = await fetch(targetUrl, init);
      clearTimeout(timeoutId);

      // If successful response from wa-gateway, cache this working target
      cachedWorkingTarget = baseTarget;

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
      lastError = err;
      if (cachedWorkingTarget === baseTarget) {
        cachedWorkingTarget = null;
      }
    }
  }

  return NextResponse.json(
    {
      success: false,
      isConnected: false,
      message:
        "WhatsApp Gateway service belum aktif di server: " +
        (lastError?.message || "Offline (Port 5001)"),
      status: "offline",
    },
    { status: 200 }
  );
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
