"use client";

import { FormEvent, useEffect, useReducer, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { developmentDesign, featuredProtein, atlasStats, renderingStatus } from "@/domain/fixtures";
import { initialSceneState, reduceScene, type SceneCommand } from "@/domain/atlas";
import type { CopilotToolCall } from "@/domain/copilot-tools";
import { WorldCanvas } from "./WorldCanvas";

const StructureView = dynamic(() => import("./StructureView").then((module) => module.StructureView), { ssr: false });

type Message = { role: "atlas" | "you"; text: string };

export function AtlasExperience() {
  const [state, dispatch] = useReducer(reduceScene, initialSceneState);
  const [loaded, setLoaded] = useState(false); const [designProgress, setDesignProgress] = useState(0); const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "atlas", text: "I am ready to move through protein space with you." }]);
  const issue = (command: SceneCommand) => dispatch(command);
  const launchDesign = (targetSite: string, specification: string) => { setDesignProgress(0); issue({ type: "DESIGN_BINDER", targetSite, specification }); };
  useEffect(() => { const timer = window.setTimeout(() => setLoaded(true), 2100); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (state.mode !== "diving") return; const timer = window.setTimeout(() => issue({ type: "COLOR_BY", scheme: "confidence" }), 1100); return () => window.clearTimeout(timer); }, [state.mode]);
  useEffect(() => { if (state.mode !== "designing") return; const timer = window.setInterval(() => setDesignProgress((current) => { if (current >= 100) { window.clearInterval(timer); issue({ type: "DESIGN_COMPLETE" }); return 100; } return current + 2; }), 90); return () => window.clearInterval(timer); }, [state.mode]);
  const applyTool = (tool: CopilotToolCall) => {
    if (tool.name === "color_by") issue({ type: "COLOR_BY", scheme: (tool.arguments.scheme as "confidence" | "trusted_core" | "hydrophobicity") ?? "confidence" });
    if (tool.name === "design_binder") launchDesign(tool.arguments.target_site ?? featuredProtein.designableSite.id, tool.arguments.specification ?? "A compact binder");
    if (tool.name === "fly_to_protein") issue({ type: "FLY_TO_PROTEIN", proteinId: tool.arguments.protein_id ?? featuredProtein.id });
  };
  const ask = async (event: FormEvent) => { event.preventDefault(); const question = prompt.trim(); if (!question) return; setPrompt(""); setMessages((current) => [...current, { role: "you", text: question }]); try { const response = await fetch("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) }); const data = await response.json() as { text: string; toolCalls?: CopilotToolCall[] }; setMessages((current) => [...current, { role: "atlas", text: data.text }]); data.toolCalls?.forEach(applyTool); } catch { setMessages((current) => [...current, { role: "atlas", text: "The reasoning channel is unavailable. The atlas remains fully navigable." }]); } };
  const mapMode = state.mode === "map"; const designMode = state.mode === "designing" || state.mode === "designComplete";
  return <main className={`atlas mode-${state.mode}`}>
    <WorldCanvas mode={state.mode} designProgress={designProgress} /><StructureView active={!mapMode} accession={featuredProtein.accession} /><div className="atmosphere" />
    <header className="masthead"><Image src="/brand/logo/logo_full_white_svg.svg" alt="Helicase" width={246} height={48} priority /><span>ATLAS / 01</span><span className="live-dot">LIVE ATLAS</span></header>
    <aside className="identity-rail"><span>UNIVERSE</span><i className={mapMode ? "active" : ""} /><span>STRUCTURE</span><i className={!mapMode ? "active" : ""} /><span>HYPOTHESIS</span><i className={designMode ? "active violet" : ""} /></aside>
    {mapMode ? <section className="cold-open"><p className="eyebrow">A LIVING INDEX OF MOLECULAR POSSIBILITY</p><h1>The protein<br /><em>universe</em>, within reach.</h1><p className="lede">A cited molecular landmark anchors this staged density field. The full atlas will resolve from verified, embedded protein coordinates.</p><button className="primary" onClick={() => issue({ type: "FLY_TO_PROTEIN", proteinId: featuredProtein.id })}><span>Enter the atlas</span><b>↘</b></button><div className="map-stats"><span>{atlasStats.citedLandmarks} cited landmark</span><span>{atlasStats.targetUniverse} destination</span></div><p className="field-status">{atlasStats.fieldStatus}</p></section> : <><section className="specimen-card"><p className="eyebrow">SELECTED SPECIMEN / {featuredProtein.accession}</p><h2>{featuredProtein.name}</h2><dl><div><dt>SOURCE</dt><dd>{featuredProtein.source}</dd></div><div><dt>RESIDUES</dt><dd>{featuredProtein.length}</dd></div><div><dt>EVIDENCE</dt><dd>Experimental structure</dd></div></dl><p className="citation">{featuredProtein.citation}</p><p className="rendering-status">{renderingStatus}</p></section><button className="return" onClick={() => issue({ type: "RETURN_TO_MAP" })}>← Return to universe</button>{state.mode === "structure" && <button className="xray-trigger" disabled><span>✦</span> Confidence X-ray requires predicted entry</button>}{state.mode === "xray" && <section className="xray-note"><span>CONFIDENCE X-RAY</span><p>Solid: trusted structural core<br />Fog: lower-confidence regions</p><button onClick={() => issue({ type: "COLOR_BY", scheme: "confidence" })}>Restore structure</button></section>}</>}
    {designMode && <section className="design-hud"><p className="eyebrow">GENERATIVE HYPOTHESIS / {String(Math.round(designProgress)).padStart(2, "0")}%</p><div className="pipeline">{developmentDesign.pipeline.map((stage, index) => <span key={stage} className={designProgress >= index * 40 ? "resolved" : ""}>{stage}</span>)}</div><div className="progress"><i style={{ width: `${designProgress}%` }} /></div>{state.mode === "designComplete" ? <><h2>Candidate resolved.</h2><p>Sequence and predicted docking scores will appear only after a verified offline trajectory is imported.</p></> : <p>Order is emerging from noise around {featuredProtein.designableSite.name.toLowerCase()}.</p>}<small>{developmentDesign.disclaimer}</small></section>}
    {!mapMode && !designMode && <button className="design-launch" onClick={() => launchDesign(featuredProtein.designableSite.id, "A small protein that binds this exposed site")}>Design a binder <span>↗</span></button>}
    <section className="copilot"><div className="copilot-header"><span className="orb" /> ATLAS COPILOT <small>GPT-5.6 PATH</small></div><div className="copilot-messages">{messages.slice(-3).map((message, index) => <p key={`${message.role}-${index}`} className={`message-${message.role}`}><b>{message.role === "atlas" ? "ATLAS" : "YOU"}</b>{message.text}</p>)}</div><form onSubmit={ask}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask where confidence changes…" aria-label="Ask Atlas" /><button type="submit">↑</button></form></section>
    {!loaded && <div className="loader"><Image src="/brand/logo/icon_white_svg.svg" alt="" width={45} height={45} priority /><p>CALIBRATING THE PROTEIN UNIVERSE</p><div><i /></div><small>Loading curated coordinates · preserving provenance</small></div>}
  </main>;
}
