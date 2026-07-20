"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useMemo, useReducer, useState } from "react";
import { developmentDesign } from "@/domain/fixtures";
import { initialSceneState, reduceScene, type SceneCommand } from "@/domain/atlas";
import type { AtlasCluster, AtlasProtein, AtlasSearchResult, CameraContext } from "@/domain/atlas-data";
import type { CopilotToolCall } from "@/domain/copilot-tools";
import { useProteinAtlas } from "@/hooks/useProteinAtlas";
import { WorldCanvas } from "./WorldCanvas";

const StructureView = dynamic(() => import("./StructureView").then((module) => module.StructureView), { ssr: false });

type Message = { role: "atlas" | "you"; text: string };
type WorldMetrics = { fps: number; visibleEntities: number; cameraDistance: number; heapMb: number | null };

const initialMetrics: WorldMetrics = { fps: 0, visibleEntities: 0, cameraDistance: 0, heapMb: null };

export function AtlasExperience() {
  const [state, dispatch] = useReducer(reduceScene, initialSceneState);
  const [minimumLoadComplete, setMinimumLoadComplete] = useState(false);
  const [designProgress, setDesignProgress] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState<AtlasSearchResult[]>([]);
  const [querying, setQuerying] = useState(false);
  const [hoveredProtein, setHoveredProtein] = useState<AtlasProtein | null>(null);
  const [focusedCluster, setFocusedCluster] = useState<AtlasCluster | null>(null);
  const [metrics, setMetrics] = useState<WorldMetrics>(initialMetrics);
  const [messages, setMessages] = useState<Message[]>([{ role: "atlas", text: "Ask for a protein, organism, family, or function. I will move the universe, not just return text." }]);
  const entered = state.mode !== "landing";
  const atlas = useProteinAtlas(entered);
  const selectedProtein = state.selectedProteinId ? atlas.recordById.get(state.selectedProteinId) ?? null : null;

  const issue = (command: SceneCommand) => dispatch(command);
  const launchDesign = (targetSite: string, specification: string) => {
    setDesignProgress(0);
    issue({ type: "DESIGN_BINDER", targetSite, specification });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoadComplete(true), 2100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state.mode !== "diving") return;
    const timer = window.setTimeout(() => issue({ type: "COLOR_BY", scheme: "confidence" }), 1180);
    return () => window.clearTimeout(timer);
  }, [state.mode]);

  useEffect(() => {
    if (state.mode !== "designing") return;
    const timer = window.setInterval(() => setDesignProgress((current) => {
      if (current >= 100) {
        window.clearInterval(timer);
        issue({ type: "DESIGN_COMPLETE" });
        return 100;
      }
      return current + 2;
    }), 90);
    return () => window.clearInterval(timer);
  }, [state.mode]);

  const runQuery = async (value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) {
      setQuery("");
      setQueryResults([]);
      issue({ type: "CLEAR_QUERY" });
      return [];
    }
    setQuery(nextQuery);
    setQuerying(true);
    const results = await atlas.search(nextQuery);
    setQueryResults(results);
    issue({ type: "QUERY_ATLAS", query: nextQuery, resultIds: results.map((result) => result.protein.id) });
    setQuerying(false);
    return results;
  };

  const submitQuery = (event: FormEvent) => {
    event.preventDefault();
    void runQuery(query);
  };

  const selectProtein = (protein: AtlasProtein, context?: CameraContext) => {
    if (context) issue({ type: "SET_CAMERA_CONTEXT", context });
    issue({ type: "FLY_TO_PROTEIN", proteinId: protein.id });
    setHoveredProtein(null);
  };

  const focusCluster = (cluster: AtlasCluster) => {
    setFocusedCluster(cluster);
    issue({ type: "FOCUS_REGION", regionId: cluster.region });
    void atlas.ensureShard(cluster.shard.toString(16).padStart(2, "0"));
  };

  const applyTool = async (tool: CopilotToolCall) => {
    if (tool.name === "query_atlas") await runQuery(tool.arguments.query ?? "");
    if (tool.name === "focus_region") issue({ type: "FOCUS_REGION", regionId: tool.arguments.region_id ?? "unresolved" });
    if (tool.name === "color_by") issue({ type: "COLOR_BY", scheme: (tool.arguments.scheme as "confidence" | "trusted_core" | "hydrophobicity") ?? "confidence" });
    if (tool.name === "design_binder" && selectedProtein) launchDesign(tool.arguments.target_site ?? `${selectedProtein.id}-surface`, tool.arguments.specification ?? "A compact binder");
    if (tool.name === "fly_to_protein") {
      const protein = atlas.recordById.get(tool.arguments.protein_id ?? "");
      if (protein) selectProtein(protein);
    }
    if (tool.name === "return_to_universe") issue({ type: "RETURN_TO_UNIVERSE" });
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const question = prompt.trim();
    if (!question) return;
    setPrompt("");
    setMessages((current) => [...current, { role: "you", text: question }]);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          scene: { mode: state.mode, query: state.query, indexedProteins: atlas.indexedCount },
          protein: selectedProtein,
        }),
      });
      const data = await response.json() as { text: string; toolCalls?: CopilotToolCall[] };
      setMessages((current) => [...current, { role: "atlas", text: data.text }]);
      for (const tool of data.toolCalls ?? []) await applyTool(tool);
    } catch {
      setMessages((current) => [...current, { role: "atlas", text: "The reasoning channel is unavailable. Direct spatial search remains active." }]);
    }
  };

  const universeMode = state.mode === "landing" || state.mode === "universe" || state.mode === "diving";
  const structureMode = !universeMode;
  const designMode = state.mode === "designing" || state.mode === "designComplete";
  const loaderVisible = !minimumLoadComplete || !atlas.manifest;
  const coverageLabel = atlas.manifest?.coverage.completeSourceQuery
    ? `${atlas.manifest.coverage.records.toLocaleString()} reviewed proteins`
    : `${atlas.manifest?.coverage.records.toLocaleString() ?? "—"} indexed development records`;
  const highlightedIds = useMemo(() => state.queryResultIds, [state.queryResultIds]);

  return <main className={`atlas mode-${state.mode}`}>
    <WorldCanvas
      mode={state.mode}
      manifest={atlas.manifest}
      proteins={atlas.records}
      highlightedIds={highlightedIds}
      selectedProteinId={state.selectedProteinId}
      focusedRegionId={state.focusedRegionId}
      onSelectProtein={selectProtein}
      onFocusCluster={focusCluster}
      onHoverProtein={setHoveredProtein}
      onMetrics={setMetrics}
    />
    <StructureView active={structureMode} structure={selectedProtein?.structure ?? null} />
    <div className="atmosphere" />

    <header className="masthead">
      <Image src="/brand/logo/logo_full_white_svg.svg" alt="Helicase" width={246} height={48} priority />
      <span>ATLAS / UNIVERSE</span>
      <span className="live-dot">{atlas.manifest?.source.release === "unknown" ? "DEVELOPMENT INDEX" : `UNIPROT ${atlas.manifest?.source.release}`}</span>
    </header>

    <aside className="identity-rail">
      <span>UNIVERSE</span><i className={universeMode ? "active" : ""} />
      <span>STRUCTURE</span><i className={structureMode ? "active" : ""} />
      <span>HYPOTHESIS</span><i className={designMode ? "active violet" : ""} />
    </aside>

    {state.mode === "landing" && <section className="cold-open">
      <p className="eyebrow">A SPATIAL INDEX OF PROTEIN LIFE</p>
      <h1>Enter the<br /><em>protein universe.</em></h1>
      <p className="lede">Functions gather into regions. Families become neighbourhoods. Every illuminated address resolves to a sourced protein record.</p>
      <button className="primary" onClick={() => issue({ type: "ENTER_ATLAS" })}><span>Cross the threshold</span><b>↘</b></button>
      <div className="map-stats"><span>{coverageLabel}</span><span>{atlas.manifest?.clusters.length.toLocaleString() ?? "—"} families</span></div>
      <p className="field-status">{atlas.manifest?.spatialization.caveat ?? atlas.status}</p>
    </section>}

    {state.mode === "universe" && <>
      <form className="atlas-query" onSubmit={submitQuery}>
        <span>QUERY THE UNIVERSE</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="protein, function, organism, family, class, identifier…" aria-label="Query the protein universe" />
        <button type="submit" aria-label="Run spatial query">{querying ? "···" : "↗"}</button>
      </form>
      <section className="universe-status">
        <p>{focusedCluster ? focusedCluster.label : hoveredProtein ? hoveredProtein.name : "DRAG TO TRAVERSE · SCROLL TO CHANGE SCALE"}</p>
        <span>{atlas.status}</span>
        <div><b>{metrics.fps || "—"}</b> FPS <b>{metrics.visibleEntities.toLocaleString()}</b> VISIBLE <b>{metrics.heapMb ?? "—"}</b> MB</div>
      </section>
      {hoveredProtein && <section className="protein-signal">
        <span>{hoveredProtein.id} · {hoveredProtein.structure.kind}</span>
        <h2>{hoveredProtein.name}</h2>
        <p>{hoveredProtein.organism}</p>
        <small>{hoveredProtein.family} · {hoveredProtein.length} aa</small>
      </section>}
      {state.query && <section className="query-readout">
        <div><span>SPATIAL RESPONSE</span><button onClick={() => { setQuery(""); setQueryResults([]); issue({ type: "CLEAR_QUERY" }); }}>CLEAR</button></div>
        <h2>{queryResults.length ? `${queryResults.length} signals resolved` : "No indexed signals yet"}</h2>
        <p>Matches resolve as individual addresses; unrelated proteins recede into aggregate context.</p>
        <ol>{queryResults.slice(0, 4).map((result) => <li key={result.protein.id}>
          <button onClick={() => selectProtein(result.protein)}><span>{result.protein.id}</span>{result.protein.name}<small>{result.matchedBy.join(" · ")}</small></button>
        </li>)}</ol>
      </section>}
    </>}

    {structureMode && selectedProtein && <>
      <section className="specimen-card">
        <p className="eyebrow">SELECTED ADDRESS / {selectedProtein.id}</p>
        <h2>{selectedProtein.name}</h2>
        <dl>
          <div><dt>ORGANISM</dt><dd>{selectedProtein.organism}</dd></div>
          <div><dt>FAMILY</dt><dd>{selectedProtein.family}</dd></div>
          <div><dt>RESIDUES</dt><dd>{selectedProtein.length}</dd></div>
          <div><dt>EVIDENCE</dt><dd>{selectedProtein.structure.kind === "experimental" ? "Experimental structure" : "Predicted structure"}</dd></div>
        </dl>
        <p className="citation">UniProt {selectedProtein.id} · {selectedProtein.structure.source} {selectedProtein.structure.accession}</p>
        <p className="rendering-status">Atlas position encodes annotation-family proximity. It is not a measured structural distance.</p>
        {selectedProtein.structure.kind === "experimental" && <p className="rendering-status">The linked PDB entry may cover a domain, chain, or complex fragment; residue coverage is not yet resolved.</p>}
      </section>
      <button className="return" onClick={() => issue({ type: "RETURN_TO_UNIVERSE" })}>← Return to spatial context</button>
      {state.mode === "structure" && <button className="xray-trigger" disabled><span>✦</span> Confidence X-ray requires verified confidence extraction</button>}
    </>}

    {designMode && selectedProtein && <section className="design-hud">
      <p className="eyebrow">GENERATIVE HYPOTHESIS / {String(Math.round(designProgress)).padStart(2, "0")}%</p>
      <div className="pipeline">{developmentDesign.pipeline.map((stage, index) => <span key={stage} className={designProgress >= index * 40 ? "resolved" : ""}>{stage}</span>)}</div>
      <div className="progress"><i style={{ width: `${designProgress}%` }} /></div>
      {state.mode === "designComplete" ? <><h2>Candidate choreography resolved.</h2><p>A verified scientific trajectory has not yet been imported for this address.</p></> : <p>Order is emerging around the selected protein address.</p>}
      <small>{developmentDesign.disclaimer}</small>
    </section>}

    <section className={`copilot ${state.mode === "landing" ? "copilot-dormant" : ""}`}>
      <div className="copilot-header"><span className="orb" /> ATLAS COPILOT <small>GPT-5.6 SCENE PATH</small></div>
      <div className="copilot-messages">{messages.slice(-3).map((message, index) => <p key={`${message.role}-${index}`} className={`message-${message.role}`}><b>{message.role === "atlas" ? "ATLAS" : "YOU"}</b>{message.text}</p>)}</div>
      <form onSubmit={ask}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Show me membrane proteins in humans…" aria-label="Ask Atlas" /><button type="submit">↑</button></form>
    </section>

    {loaderVisible && <div className="loader">
      <div className="loader-orbit"><Image src="/brand/logo/icon_white_svg.svg" alt="" width={45} height={45} priority /><i /><i /><i /></div>
      <p>{atlas.manifest ? "SPATIALIZING PROTEIN FAMILIES" : "OPENING THE BIOLOGICAL INDEX"}</p>
      <div className="loader-track"><i style={{ width: `${Math.max(8, atlas.progress * 100)}%` }} /></div>
      <small>{atlas.error ?? atlas.status} · preserving provenance</small>
    </div>}
  </main>;
}
