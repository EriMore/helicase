import { NextResponse } from "next/server";
import { copilotTools, type CopilotToolCall } from "@/domain/copilot-tools";
import { featuredProtein } from "@/domain/fixtures";

type ResponseOutput = { type?: string; name?: string; arguments?: string };
const systemInstruction = "You are Atlas, a rigorous structural-biology guide. Ground claims only in supplied context. Distinguish observed facts, predictions, and hypotheses. Use tools to create visible scene changes. A design playback is precomputed and predicted, never wet-lab validated.";

function fallback(message: string) {
  const asksForDesign = /design|binder|bind/i.test(message);
  const asksForTrust = /trust|confidence|uncertain|x-ray|xray/i.test(message);
  const toolCalls: CopilotToolCall[] = asksForDesign ? [{ name: "design_binder", arguments: { target_site: featuredProtein.designableSite.id, specification: message } }] : asksForTrust ? [{ name: "color_by", arguments: { scheme: "trusted_core" } }] : [];
  const text = asksForDesign ? "I can stage the available binder-design playback at the exposed barrel loop. This development build labels its choreography fixture; a verified RFdiffusion trajectory will replace it before scientific demonstration." : asksForTrust ? "The confidence view separates the stable core from regions where a structural prediction should be interpreted with more caution. I am opening the X-ray view." : "Ask where confidence changes, or ask to design a small binder for the exposed loop. I will show the action in the scene rather than only describe it.";
  return { text, toolCalls, source: "local-fallback" };
}

export async function POST(request: Request) {
  const { message } = await request.json() as { message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "A question is required." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(fallback(message));
  const context = { protein: featuredProtein, note: "Only the listed designable site is available. Design playback is precomputed and prediction-only." };
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-5.6", instructions: systemInstruction, input: `Scientific context:\n${JSON.stringify(context)}\n\nUser: ${message}`, tools: copilotTools }) });
  if (!response.ok) return NextResponse.json(fallback(message));
  const result = await response.json() as { output_text?: string; output?: ResponseOutput[] };
  const toolCalls = (result.output ?? []).flatMap((item) => { if (item.type !== "function_call" || !item.name) return []; try { return [{ name: item.name, arguments: JSON.parse(item.arguments ?? "{}") as Record<string, string> }]; } catch { return []; } });
  return NextResponse.json({ text: result.output_text ?? "I have prepared a scene action.", toolCalls, source: "gpt-5.6" });
}
