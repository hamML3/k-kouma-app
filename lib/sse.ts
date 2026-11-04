export type SendEvent = (event: string, data: unknown) => void;

const HEARTBEAT_MS = 25_000;

/**
 * Flux Server-Sent Events. `subscribe` branche la source et renvoie sa
 * fonction de désinscription, appelée quand le client se déconnecte.
 */
export function eventStreamResponse(signal: AbortSignal, subscribe: (send: SendEvent) => () => void): Response {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send: SendEvent = (event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // le contrôleur peut déjà être fermé si le client s'est déconnecté
        }
      };

      const unsubscribe = subscribe(send);
      // Ping régulier pour garder la connexion ouverte à travers les proxys/reverse-proxy.
      const heartbeat = setInterval(() => send("ping", { t: Date.now() }), HEARTBEAT_MS);
      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      send("ready", {});
    },
    cancel() {
      cleanup?.();
    },
  });

  signal.addEventListener("abort", () => cleanup?.());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
