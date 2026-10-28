import { ensurePlatformRuntime, eventVisible, resolveScope, subscribeToEvents } from "@aicte/backend";
import { apiError } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
  ensurePlatformRuntime();
  // Events name institutions, so each stream only carries what this user may see (same rules as the lists).
  const scope = resolveScope(session);

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };

      send("retry: 4000\n\n");
      send(`data: ${JSON.stringify({ type: "ping" })}\n\n`);

      const unsubscribe = subscribeToEvents((event) => {
        if (eventVisible(scope, event)) send(`data: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        send(`: keep-alive ${Date.now()}\n\n`);
      }, 25_000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      request.signal.addEventListener("abort", () => {
        cleanup?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
