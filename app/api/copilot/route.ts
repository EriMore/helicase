import { NextResponse } from "next/server";
import { copilotTools, type CopilotToolCall } from "@/domain/copilot-tools";
import type { AtlasProtein } from "@/domain/atlas-data";

type ResponseOutput = { type?: string; name?: string; arguments?: string };
type CopilotRequest = {
  message?: string;
  scene?: { mode?: string; query?: string; indexedProteins?: number };
  protein?: AtlasProtein | null;
};

const systemInstruction = `You are Atlas, a rigorous structural-biology navigator inside a spatial protein universe.
Ground claims only in supplied context. Distinguish source records, computed annotation-family proximity, predictions, and hypotheses.
Use typed tools to make the universe visibly answer: query, focus a region, fly to an exact indexed protein, or return to spatial context.
Never call annotation proximity structural similarity. Never imply complete coverage when the context says the local index is partial.
Design playback is precomputed and predicted, never wet-lab validated.`;

function fallback(message: string, protein: AtlasProtein | null | undefined) {
  const asksForDesign = /design|binder|bind/i.test(message);
  const asksForReturn = /back|return|universe|zoom out/i.test(message);
  const asksForTrust = /trust|confidence|uncertain|x-ray|xray/i.test(message);
  const asksToExplore = /show|find|search|where|proteins?|family|organism|enzyme|membrane|viral|receptor|transport/i.test(message);
  const toolCalls: CopilotToolCall[] = [];
  if (asksForReturn) toolCalls.push({ name: "return_to_universe", arguments: {} });
  else if (asksForDesign && protein) toolCalls.push({ name: "design_binder", arguments: { target_site: `${protein.id}-surface`, specification: message } });
  else if (asksToExplore) toolCalls.push({ name: "query_atlas", arguments: { query: message } });
  const text = asksForDesign
    ? protein
      ? "I can stage the design path at this selected address, but the current choreography is not a validated molecular result."
      : "Select a protein address first; binder design needs an explicit target and provenance boundary."
    : asksForTrust
      ? "Confidence is available only when a verified predicted-structure confidence field has been extracted. I will not infer it from appearance."
      : asksToExplore
        ? "I am expressing that request inside the indexed universe. Matches will brighten and unrelated regions will recede."
        : "Ask for a protein, organism, family, or function and I will transform the scene rather than only answer in prose.";
  return { text, toolCalls, source: "local-fallback" };
}

export async function POST(request: Request) {
  const body = await request.json() as CopilotRequest;
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "A question is required." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(fallback(message, body.protein));
  const context = {
    scene: body.scene,
    selectedProtein: body.protein,
    spatialSemantics: "Deterministic UniProt annotation-family hierarchy; not measured structural or sequence distance.",
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-5.6",
      instructions: systemInstruction,
      input: `Scientific scene context:\n${JSON.stringify(context)}\n\nUser: ${message}`,
      tools: copilotTools,
    }),
  });
  if (!response.ok) return NextResponse.json(fallback(message, body.protein));
  const result = await response.json() as { output_text?: string; output?: ResponseOutput[] };
  const toolCalls = (result.output ?? []).flatMap((item) => {
    if (item.type !== "function_call" || !item.name) return [];
    try { return [{ name: item.name, arguments: JSON.parse(item.arguments ?? "{}") as Record<string, string> }]; }
    catch { return []; }
  });
  return NextResponse.json({ text: result.output_text ?? "I have prepared a spatial scene action.", toolCalls, source: "gpt-5.6" });
}
