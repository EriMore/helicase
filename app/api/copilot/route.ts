import { copilotTools, parseCopilotToolCall, type CopilotToolCall } from "@/domain/copilot-tools";
import { atlasProteinSchema } from "@/domain/schemas";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  scene: z.object({
    mode: z.string().max(40), query: z.string().max(240), indexedProteins: z.number().int().nonnegative(),
    camera: z.object({ position: z.tuple([z.number(), z.number(), z.number()]), target: z.tuple([z.number(), z.number(), z.number()]), scale: z.enum(["universe", "region", "cluster", "protein"]) }).nullable(),
    representation: z.enum(["cartoon", "surface", "ball-and-stick"]),
    ligandsVisible: z.boolean(),
    residueFocus: z.object({ start: z.number().int(), end: z.number().int(), chain: z.string().optional(), requestId: z.number().int().nonnegative() }).nullable(),
  }).strict(),
  protein: atlasProteinSchema.nullable(),
  confidence: z.object({ status: z.string(), metric: z.string().optional(), mean: z.number().optional(), lowConfidenceRanges: z.array(z.tuple([z.number().int(), z.number().int()])).optional() }).optional(),
  design: z.object({ status: z.string(), trajectoryId: z.string().nullable(), stageIndex: z.number().int().nonnegative() }).optional(),
}).strict();

type CopilotEvent =
  | { type: "meta"; source: "gpt-5.6" | "local-explicit" }
  | { type: "text_delta"; delta: string }
  | { type: "tool_call"; call: CopilotToolCall }
  | { type: "done" }
  | { type: "error"; message: string; retryable: boolean };

const systemInstruction = `You are Atlas, a concise and rigorous structural-biology navigator inside a spatial protein universe.
Ground claims only in supplied context. Distinguish source records, computed annotation-family proximity, predictions, and hypotheses.
Use bounded tools for every scene mutation. Prose can never mutate the scene. For an eligible design request, call design_binder with target_site 6ehb-homotrimer; it maps to the imported artifact and never generates a sequence.
Never call annotation proximity structural similarity. Never imply that the 75,000 staged proteins are the complete reviewed corpus.
AlphaFold pLDDT applies only to predicted structures. The available 6EHB ProteinMPNN journey is precomputed sequence redesign, not binder generation, affinity validation, or wet-lab evidence.`;

const encode = (event: CopilotEvent) => `${JSON.stringify(event)}\n`;

function fallback(message: string, proteinId: string | undefined): { text: string; calls: CopilotToolCall[] } {
  const calls: CopilotToolCall[] = [];
  if (/back|return|universe|zoom out/i.test(message)) calls.push({ name: "return_to_universe", arguments: {} });
  else if (/design|redesign|candidate|binder/i.test(message) && proteinId === "A5F934") calls.push({ name: "design_binder", arguments: { target_site: "6ehb-homotrimer", spec: message.slice(0, 500) } });
  else if (/show|find|search|where|proteins?|family|organism|enzyme|membrane|viral|receptor|transport/i.test(message)) calls.push({ name: "query_atlas", arguments: { query: message.slice(0, 240) } });
  const text = /design|redesign|candidate/i.test(message)
    ? proteinId === "A5F934" ? "Opening the attributable, precomputed ProteinMPNN 6EHB sequence-redesign journey." : "The imported design journey is eligible only for the sourced 6EHB target, UniProt A5F934."
    : calls.length ? "Expressing that request through the Atlas scene." : "The credentialed reasoning service is unavailable. Spatial search and verified scientific views remain active.";
  return { text, calls };
}

function streamEvents(events: CopilotEvent[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(controller) { for (const event of events) controller.enqueue(encoder.encode(encode(event))); controller.close(); } }), {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return streamEvents([{ type: "error", message: "The copilot request was invalid.", retryable: false }, { type: "done" }]);
  const { message, protein, ...context } = parsed.data;
  if (!process.env.OPENAI_API_KEY) {
    const local = fallback(message, protein?.id);
    return streamEvents([{ type: "meta", source: "local-explicit" }, { type: "text_delta", delta: local.text }, ...local.calls.map((call): CopilotEvent => ({ type: "tool_call", call })), { type: "done" }]);
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: request.signal,
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      stream: true,
      instructions: systemInstruction,
      input: `Scientific scene context:\n${JSON.stringify({ ...context, selectedProtein: protein, spatialSemantics: "Deterministic UniProt annotation-family hierarchy; not measured structural or sequence distance." })}\n\nUser: ${message}`,
      tools: copilotTools,
    }),
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    const local = fallback(message, protein?.id);
    return streamEvents([{ type: "meta", source: "local-explicit" }, { type: "text_delta", delta: local.text }, ...local.calls.map((call): CopilotEvent => ({ type: "tool_call", call })), { type: "done" }]);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(encode({ type: "meta", source: "gpt-5.6" })));
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6); if (data === "[DONE]") continue;
            const event = JSON.parse(data) as { type?: string; delta?: string; item?: { type?: string; name?: string; arguments?: string } };
            if (event.type === "response.output_text.delta" && event.delta) controller.enqueue(encoder.encode(encode({ type: "text_delta", delta: event.delta })));
            if (event.type === "response.output_item.done" && event.item?.type === "function_call" && event.item.name) {
              let args: unknown = null; try { args = JSON.parse(event.item.arguments ?? "{}"); } catch { args = null; }
              const call = parseCopilotToolCall(event.item.name, args);
              if (call) controller.enqueue(encoder.encode(encode({ type: "tool_call", call })));
            }
          }
        }
        controller.enqueue(encoder.encode(encode({ type: "done" })));
      } catch {
        controller.enqueue(encoder.encode(encode({ type: "error", message: "The reasoning stream was interrupted.", retryable: true })));
        controller.enqueue(encoder.encode(encode({ type: "done" })));
      } finally { reader.releaseLock(); controller.close(); }
    },
    cancel() { void upstream.body?.cancel(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
