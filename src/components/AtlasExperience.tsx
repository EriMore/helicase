"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { initialSceneState, reduceScene, type SceneCommand } from "@/domain/atlas";
import { copilotStreamEventSchema, sceneCommandSchema } from "@/domain/schemas";
import { parseCopilotToolCall } from "@/domain/copilot-tools";
import type { AtlasCluster, AtlasProtein, AtlasSearchResult, CameraContext } from "@/domain/atlas-data";
import type { CopilotToolCall } from "@/domain/copilot-tools";
import { useProteinAtlas } from "@/hooks/useProteinAtlas";
import { useStructureConfidence } from "@/hooks/useStructureConfidence";
import { useDesignTrajectory } from "@/hooks/useDesignTrajectory";
import { useStructureMetadata } from "@/hooks/useStructureMetadata";
import { WorldCanvas } from "./WorldCanvas";

const StructureView = dynamic(() => import("./StructureView").then((module) => module.StructureView), { ssr: false });

type Message = { role: "atlas" | "you"; text: string };
type CopilotStreamEvent = { type: "meta"; source: string } | { type: "text_delta"; delta: string } | { type: "tool_call"; call: CopilotToolCall } | { type: "error"; message: string; retryable: boolean } | { type: "done" };
type WorldMetrics = { fps: number; visibleEntities: number; cameraDistance: number; heapMb: number | null };

const initialMetrics: WorldMetrics = { fps: 0, visibleEntities: 0, cameraDistance: 0, heapMb: null };

export function AtlasExperience() {
  const [state, dispatch] = useReducer(reduceScene, initialSceneState);
  const [minimumLoadComplete, setMinimumLoadComplete] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState<AtlasSearchResult[]>([]);
  const [querying, setQuerying] = useState(false);
  const [hoveredProtein, setHoveredProtein] = useState<AtlasProtein | null>(null);
  const [focusedCluster, setFocusedCluster] = useState<AtlasCluster | null>(null);
  const [metrics, setMetrics] = useState<WorldMetrics>(initialMetrics);
  const [messages, setMessages] = useState<Message[]>([{ role: "atlas", text: "Ask for a protein, organism, family, or function. I will move the universe, not just return text." }]);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [structureStatus, setStructureStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [copilotBusy, setCopilotBusy] = useState(false);
  const copilotRequest = useRef<AbortController | null>(null);
  const entered = state.mode !== "landing";
  const atlas = useProteinAtlas(entered);
  const selectedProtein = state.selectedProteinId ? atlas.recordById.get(state.selectedProteinId) ?? null : null;
  const confidence = useStructureConfidence(selectedProtein?.structure ?? null);
  const structureMetadata = useStructureMetadata(selectedProtein?.structure ?? null);
  const design = useDesignTrajectory(selectedProtein?.id === "A5F934");
  const designStageCount = design.status === "available" ? design.data.stages.length : 0;

  const issue = (command: SceneCommand) => {
    const parsed = sceneCommandSchema.safeParse(command);
    if (!parsed.success) { setCommandError("A scene command was rejected before it could change the scientific view."); return false; }
    setCommandError(null); dispatch(parsed.data as SceneCommand); return true;
  };
  const launchDesign = () => issue({ type: "START_DESIGN_JOURNEY", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "Official precomputed 6EHB sequence redesign" });

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
    if (state.mode !== "designing" || state.designPlayback !== "playing" || designStageCount === 0) return;
    const lastStage = designStageCount - 1;
    const timer = window.setInterval(() => {
      if (state.designStageIndex >= lastStage) issue({ type: "PAUSE_DESIGN_TRAJECTORY" });
      else issue({ type: "STEP_DESIGN_STAGE", direction: "forward" });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [state.mode, state.designPlayback, state.designStageIndex, designStageCount]);

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
    try {
      const results = await atlas.search(nextQuery);
      setQueryResults(results);
      issue({ type: "QUERY_ATLAS", query: nextQuery, resultIds: results.map((result) => result.protein.id) });
      return results;
    } finally { setQuerying(false); }
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
    if (tool.name === "focus_region") issue({ type: "FOCUS_REGION", regionId: tool.arguments.region_id });
    if (tool.name === "color_by") issue({ type: "COLOR_BY", scheme: (tool.arguments.scheme as "confidence" | "trusted_core" | "hydrophobicity") ?? "confidence" });
    if (tool.name === "start_design_journey") {
      if (selectedProtein?.id !== "A5F934") throw new Error("The verified design journey requires selected target A5F934 / 6EHB.");
      launchDesign();
    }
    if (tool.name === "design_binder") {
      if (selectedProtein?.id !== "A5F934") throw new Error("This evidence-backed design path is only available for target A5F934 / 6EHB.");
      launchDesign();
    }
    if (tool.name === "play_design_trajectory") { if (state.mode !== "designing") throw new Error("No design trajectory is active."); issue({ type: "PLAY_DESIGN_TRAJECTORY" }); }
    if (tool.name === "pause_design_trajectory") issue({ type: "PAUSE_DESIGN_TRAJECTORY" });
    if (tool.name === "set_design_stage") {
      if (state.mode !== "designing") throw new Error("No design journey is active.");
      issue({ type: "SET_DESIGN_STAGE", stageIndex: tool.arguments.stage_index });
    }
    if (tool.name === "select_design_candidate") {
      if (state.mode !== "designing") throw new Error("No design journey is active.");
      issue({ type: "SELECT_DESIGN_CANDIDATE", candidateId: tool.arguments.candidate_id });
    }
    if (tool.name === "compare_design_candidates") {
      if (state.mode !== "designing" && state.mode !== "comparison") throw new Error("No design trajectory is active.");
      issue({ type: "COMPARE_DESIGN_CANDIDATES", candidateIds: tool.arguments.candidate_ids });
    }
    if (tool.name === "return_to_design_target") issue({ type: "SET_DESIGN_STAGE", stageIndex: state.designStageIndex });
    if (tool.name === "focus_confidence_range") {
      if (confidence.status !== "available") throw new Error("Verified confidence is unavailable for this structure.");
      const ranges = tool.arguments.band === "very_high" ? confidence.data.ranges.veryHigh : tool.arguments.band === "confident" ? confidence.data.ranges.confident : tool.arguments.band === "low" ? confidence.data.ranges.low : confidence.data.ranges.veryLow;
      const range = ranges[0]; if (!range) throw new Error(`No ${tool.arguments.band.replace("_", " ")} confidence range exists.`);
      issue({ type: "COLOR_BY", scheme: "trusted_core" }); issue({ type: "FOCUS_RESIDUES", start: range[0], end: range[1], requestId: Date.now() });
    }
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
    copilotRequest.current?.abort();
    const controller = new AbortController();
    copilotRequest.current = controller;
    setCopilotBusy(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: question,
          scene: {
            mode: state.mode,
            query: state.query,
            indexedProteins: atlas.indexedCount,
            camera: state.cameraContext,
            representation: state.structureRepresentation,
            ligandsVisible: state.ligandsVisible,
            residueFocus: state.residueFocus,
          },
          protein: selectedProtein,
          confidence: confidence.status === "available" ? { status: "available", metric: confidence.data.metric, mean: confidence.data.mean, lowConfidenceRanges: confidence.data.ranges.veryLow } : { status: confidence.status },
          design: { status: design.status, trajectoryId: state.designTrajectoryId, stageIndex: state.designStageIndex },
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Copilot unavailable (${response.status})`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let messageIndex = -1;
      setMessages((current) => { messageIndex = current.length; return [...current, { role: "atlas", text: "" }]; });
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsedEvent = copilotStreamEventSchema.safeParse(JSON.parse(line));
          if (!parsedEvent.success) throw new Error("The reasoning channel returned an invalid event.");
          const streamed = parsedEvent.data as CopilotStreamEvent;
          if (streamed.type === "text_delta") setMessages((current) => current.map((message, index) => index === messageIndex ? { ...message, text: message.text + streamed.delta } : message));
          if (streamed.type === "tool_call") {
            const call = parseCopilotToolCall(streamed.call.name, streamed.call.arguments);
            if (!call) throw new Error("The reasoning channel proposed an invalid scene command.");
            await applyTool(call);
          }
          if (streamed.type === "error") setMessages((current) => current.map((message, index) => index === messageIndex ? { ...message, text: message.text || streamed.message } : message));
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessages((current) => [...current, { role: "atlas", text: error instanceof Error ? error.message : "The reasoning channel is unavailable. Direct spatial search remains active." }]);
    } finally {
      if (copilotRequest.current === controller) copilotRequest.current = null;
      setCopilotBusy(false);
    }
  };

  const universeMode = state.mode === "landing" || state.mode === "universe" || state.mode === "diving";
  const structureMode = !universeMode;
  const designMode = state.mode === "designing" || state.mode === "designComplete" || state.mode === "comparison";
  const loaderVisible = !minimumLoadComplete || !atlas.manifest;
  const coverageLabel = `${(atlas.addressableCount ?? atlas.manifest?.coverage.records ?? 0).toLocaleString()} reviewed proteins addressable · ${(atlas.manifest?.coverage.records ?? 0).toLocaleString()} staged locally`;
  const highlightedIds = useMemo(() => state.queryResultIds, [state.queryResultIds]);

  return <main className={`atlas mode-${state.mode}`}>
    <WorldCanvas
      mode={state.mode}
      manifest={atlas.manifest}
      proteins={atlas.records}
      highlightedIds={highlightedIds}
      selectedProteinId={state.selectedProteinId}
      focusedRegionId={state.focusedRegionId}
      restoreContext={state.cameraContext}
      onSelectProtein={selectProtein}
      onFocusCluster={focusCluster}
      onHoverProtein={setHoveredProtein}
      onMetrics={setMetrics}
    />
    <StructureView active={structureMode} structure={selectedProtein?.structure ?? null} confidenceActive={state.mode === "xray"} representation={state.structureRepresentation} showLigands={state.ligandsVisible} focusRange={state.residueFocus} retryKey={state.structureRetry} onStatusChange={setStructureStatus} />
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
        {querying ? <button type="button" aria-label="Cancel spatial query" onClick={() => { atlas.cancelSearch(); setQuerying(false); }}>×</button> : <button type="submit" aria-label="Run spatial query">↗</button>}
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
        {selectedProtein.structure.kind === "experimental" && <p className="rendering-status">{structureMetadata.status === "available" && structureMetadata.data.chains[0]?.referenceSequenceCoverage != null ? `RCSB/SIFTS maps ${(structureMetadata.data.chains[0].referenceSequenceCoverage * 100).toFixed(1)}% of UniProt ${structureMetadata.data.chains[0].uniprotAccession}; chains ${structureMetadata.data.chains.map((chain) => chain.id).join(", ")}.` : structureMetadata.status === "loading" ? "Resolving RCSB/SIFTS residue coverage…" : "PDB residue coverage is unavailable; residue actions use author numbering."}</p>}
      </section>
      <button className="return" onClick={() => issue({ type: "RETURN_TO_UNIVERSE" })}>← Return to spatial context</button>
      {state.mode === "structure" && <button className="xray-trigger" disabled={confidence.status !== "available"} onClick={() => issue({ type: "COLOR_BY", scheme: "trusted_core" })}><span>✦</span>{confidence.status === "available" ? `Confidence X-ray · mean pLDDT ${confidence.data.mean.toFixed(1)}` : confidence.status === "loading" ? "Resolving AlphaFold per-residue confidence…" : selectedProtein.structure.kind === "experimental" ? "Prediction confidence is undefined for experimental structures" : confidence.error ?? "Verified confidence unavailable"}</button>}
      {state.mode === "structure" && selectedProtein.id === "A5F934" && <button className="design-launch" disabled={design.status !== "available"} onClick={launchDesign}>Official 6EHB sequence redesign <span>→</span></button>}
      {state.mode === "structure" && <aside className="structure-tools" aria-label="Structure controls">
        <span>REPRESENTATION</span>
        <div>{(["cartoon", "surface", "ball-and-stick"] as const).map((option) => <button key={option} className={state.structureRepresentation === option ? "active" : ""} onClick={() => issue({ type: "SET_REPRESENTATION", representation: option })}>{option}</button>)}</div>
        <button className={state.ligandsVisible ? "active" : ""} onClick={() => issue({ type: "SET_LIGAND_VISIBILITY", visible: !state.ligandsVisible })}>{state.ligandsVisible ? "Ligands visible" : "Ligands hidden"}</button>
        {structureStatus === "unavailable" && <button onClick={() => issue({ type: "RETRY_STRUCTURE" })}>Retry structure</button>}
      </aside>}
      {state.mode === "xray" && confidence.status === "available" && <aside className="xray-note">
        <span>VERIFIED ALPHAFOLD CONFIDENCE</span>
        <p>Mean pLDDT {confidence.data.mean.toFixed(1)} · {confidence.data.ranges.veryLow.length} very-low-confidence ranges · model {confidence.data.modelVersion}</p>
        <p>{confidence.data.limitations[0]}</p>
        <div className="confidence-ranges">{confidence.data.ranges.veryLow.slice(0, 4).map(([start, end]) => <button key={`${start}-${end}`} onClick={() => issue({ type: "FOCUS_RESIDUES", start, end, requestId: Date.now() })}>Focus {start}–{end}</button>)}</div>
        <button onClick={() => issue({ type: "COLOR_BY", scheme: "confidence" })}>Return to structure</button>
      </aside>}
    </>}

    {designMode && selectedProtein && design.status === "available" && (() => {
      const stageIndex = Math.min(state.designStageIndex, design.data.stages.length - 1);
      const stage = design.data.stages[stageIndex];
      const selectedCandidate = stage.candidates.find((candidate) => candidate.id === state.selectedDesignCandidateId) ?? stage.candidates[0] ?? null;
      return <section className="design-hud">
        <p className="eyebrow">PRECOMPUTED DESIGN EVIDENCE / {stageIndex + 1} OF {design.data.stages.length}</p>
        <div className="design-reveal"><span className="reveal-orbit" /><strong>{state.designPlayback === "playing" ? "REVEALING EVIDENCE" : "EVIDENCE INSPECTOR"}</strong><small>Imported artifact · no live generation</small></div>
        <div className="pipeline">{design.data.stages.map((candidateStage, index) => <button key={candidateStage.id} className={index === stageIndex ? "resolved" : ""} onClick={() => issue({ type: "SET_DESIGN_STAGE", stageIndex: index })}>{candidateStage.label}</button>)}</div>
        <div className="progress"><i style={{ width: `${((stageIndex + 1) / design.data.stages.length) * 100}%` }} /></div>
        <h2>{stage.label}</h2>
        <p>{stage.description}</p>
        {stage.candidates.length > 0 && <div className="design-candidates">{stage.candidates.map((candidate) => <button key={candidate.id} className={candidate.id === selectedCandidate?.id ? "active" : ""} onClick={() => issue({ type: "SELECT_DESIGN_CANDIDATE", candidateId: candidate.id })}>{candidate.name}<small>score {candidate.metrics[0]?.value.toFixed(4)} · recovery {((candidate.metrics[2]?.value ?? 0) * 100).toFixed(1)}%</small></button>)}</div>}
        {selectedCandidate && <p>ProteinMPNN score {selectedCandidate.metrics[0]?.value.toFixed(4)}. This estimates sequence compatibility with the backbone; it is not affinity or experimental efficacy.</p>}
        <div className="design-controls"><button onClick={() => issue({ type: "RESTART_DESIGN_TRAJECTORY" })}>Restart</button><button onClick={() => issue({ type: state.designPlayback === "playing" ? "PAUSE_DESIGN_TRAJECTORY" : "PLAY_DESIGN_TRAJECTORY" })}>{state.designPlayback === "playing" ? "Pause" : "Play reveal"}</button><button disabled={stageIndex === 0} onClick={() => issue({ type: "STEP_DESIGN_STAGE", direction: "backward" })}>Back</button><button disabled={stageIndex === design.data.stages.length - 1} onClick={() => issue({ type: "STEP_DESIGN_STAGE", direction: "forward" })}>Step</button><button onClick={() => issue({ type: "COMPARE_DESIGN_CANDIDATES", candidateIds: design.data.stages.flatMap((item) => item.candidates.map((candidate) => candidate.id)).slice(0, 2) })}>Compare</button><button onClick={() => issue({ type: "LEAVE_DESIGN_JOURNEY" })}>Return to source</button></div>
        <input className="design-scrubber" type="range" min="0" max={design.data.stages.length - 1} value={stageIndex} onChange={(event) => issue({ type: "SEEK_DESIGN_STAGE", stageIndex: Number(event.target.value) })} aria-label="Seek design evidence stage" />
        {state.mode === "comparison" && <div className="comparison-note">Candidate comparison is limited to the two imported ProteinMPNN outputs. No predicted structure, interface metric, affinity, or wet-lab validation is available in this source run.</div>}
        <small>{stage.provenance.source} · {stage.provenance.methodVersion}<br />{stage.provenance.limitations[0]}</small>
      </section>;
    })()}

    <section className={`copilot ${state.mode === "landing" ? "copilot-dormant" : ""}`}>
      <div className="copilot-header"><span className="orb" /> ATLAS COPILOT <small>GPT-5.6 SCENE PATH</small></div>
      <div className="copilot-messages">{messages.slice(-3).map((message, index) => <p key={`${message.role}-${index}`} className={`message-${message.role}`}><b>{message.role === "atlas" ? "ATLAS" : "YOU"}</b>{message.text}</p>)}</div>
      <form onSubmit={ask}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Show me membrane proteins in humans…" aria-label="Ask Atlas" />{copilotBusy ? <button type="button" aria-label="Cancel copilot" onClick={() => copilotRequest.current?.abort()}>×</button> : <button type="submit" aria-label="Send to Atlas">↑</button>}</form>
    </section>

    {commandError && <p className="command-error" role="alert">{commandError}<button onClick={() => setCommandError(null)}>Dismiss</button></p>}

    {loaderVisible && <div className="loader">
      <div className="loader-orbit"><Image src="/brand/logo/icon_white_svg.svg" alt="" width={45} height={45} priority /><i /><i /><i /></div>
      <p>{atlas.manifest ? "SPATIALIZING PROTEIN FAMILIES" : "OPENING THE BIOLOGICAL INDEX"}</p>
      <div className="loader-track"><i style={{ width: `${Math.max(8, atlas.progress * 100)}%` }} /></div>
      <small>{atlas.error ?? atlas.status} · preserving provenance</small>
      {atlas.error && <button onClick={() => window.location.reload()}>Retry Atlas loading</button>}
    </div>}
  </main>;
}
