"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { initialSceneState, reduceScene, type SceneCommand } from "@/domain/atlas";
import { copilotStreamEventSchema, sceneCommandSchema } from "@/domain/schemas";
import { parseCopilotToolCall, type CopilotToolCall } from "@/domain/copilot-tools";
import { territories } from "@/domain/territories";
import { domainColorHex } from "@/domain/domain-colors";
import type { AtlasProtein, AtlasSearchResult } from "@/domain/atlas-data";
import { useProteinAtlas } from "@/hooks/useProteinAtlas";
import { useStructureConfidence } from "@/hooks/useStructureConfidence";
import { useStructureMetadata } from "@/hooks/useStructureMetadata";
import { useDesignTrajectory } from "@/hooks/useDesignTrajectory";
import { useProteinDetail } from "@/hooks/useProteinDetail";
import { useTheme } from "@/hooks/useTheme";
import { useSound } from "@/hooks/useSound";
import { WorldCanvas, type WorldMetrics } from "./WorldCanvas";
import { Header } from "./Header";
import { DepthRail } from "./DepthRail";
import { QueryBar } from "./QueryBar";
import { IdentityPanel } from "./IdentityPanel";
import { InspectPanel } from "./InspectPanel";
import { DesignPanel } from "./DesignPanel";
import { SequenceTray } from "./SequenceTray";
import { AskAtlas } from "./AskAtlas";
import { LoadingScreen } from "./LoadingScreen";

const StructureView = dynamic(() => import("./StructureView").then((module) => module.StructureView), { ssr: false });

type CopilotStreamEvent = { type: "meta"; source: string } | { type: "text_delta"; delta: string } | { type: "tool_call"; call: CopilotToolCall } | { type: "error"; message: string; retryable: boolean } | { type: "done" };
type AtlasAnswer = { text: string; trace: string[] };
const DESIGN_DURATION_MS = 32_000;

export function AtlasExperience() {
  const [state, dispatch] = useReducer(reduceScene, initialSceneState);
  const { theme, toggleTheme } = useTheme();
  const sound = useSound();
  const atlas = useProteinAtlas(true);

  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState<AtlasSearchResult[]>([]);
  const [worldMetrics, setWorldMetrics] = useState<WorldMetrics>({ fps: 0, visibleCount: 0 });
  const [hintSeen, setHintSeen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [answer, setAnswer] = useState<AtlasAnswer | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [structureStatus, setStructureStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const copilotRequest = useRef<AbortController | null>(null);
  const answerTimer = useRef<number | null>(null);
  const designProgressRef = useRef(0);

  const selectedProtein = state.selectedProteinId ? atlas.recordById.get(state.selectedProteinId) ?? null : null;
  const confidence = useStructureConfidence(selectedProtein?.structure ?? null);
  const structureMetadata = useStructureMetadata(selectedProtein?.structure ?? null);
  const design = useDesignTrajectory(selectedProtein?.id === "A5F934");
  const detail = useProteinDetail(selectedProtein?.id ?? null);

  const issue = useCallback((commandToIssue: SceneCommand) => {
    const parsed = sceneCommandSchema.safeParse(commandToIssue);
    if (!parsed.success) { setCommandError("A scene command was rejected before it could change the scientific view."); return false; }
    setCommandError(null);
    dispatch(parsed.data as SceneCommand);
    return true;
  }, []);

  // ---- loading ----
  const loaderVisible = !atlas.manifest || atlas.progress < 1;
  const stageLabel = !atlas.manifest ? "OPENING THE BIOLOGICAL INDEX" : atlas.progress < 1 ? "SPATIALIZING PROTEIN FAMILIES" : "ATLAS READY";

  // ---- query ----
  const runQuery = useCallback(async (value: string) => {
    const nextQuery = value.trim();
    setCommandOpen(false);
    if (!nextQuery) { setQuery(""); setQueryResults([]); issue({ type: "CLEAR_QUERY" }); return; }
    setQuery(nextQuery);
    const results = await atlas.search(nextQuery);
    setQueryResults(results);
    issue({ type: "QUERY_ATLAS", query: nextQuery, resultIds: results.map((result) => result.protein.id) });
    sound.play(results.length ? "query" : "deny");
  }, [atlas, issue, sound]);

  const clearQuery = useCallback(() => { setQuery(""); setQueryResults([]); issue({ type: "CLEAR_QUERY" }); }, [issue]);

  const dominantTerritoryLabel = useMemo(() => {
    if (!queryResults.length) return null;
    const counts = new Map<string, number>();
    for (const result of queryResults) counts.set(result.protein.region, (counts.get(result.protein.region) ?? 0) + 1);
    const topRegion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const territory = territories.find((candidate) => candidate.regions.includes(topRegion as never));
    return territory?.label ?? "Mixed territories";
  }, [queryResults]);

  // ---- selection / navigation ----
  const selectProtein = useCallback((protein: AtlasProtein) => { issue({ type: "SELECT_PROTEIN", proteinId: protein.id }); sound.play("select"); }, [issue, sound]);
  const enterTerritory = useCallback((territoryId: string) => { issue({ type: "ENTER_TERRITORY", territoryId }); sound.play("enter"); }, [issue, sound]);
  const navigateLevel = useCallback((level: "universe" | "territory" | "protein" | "structure") => { issue({ type: "NAV_TO_LEVEL", level }); sound.play("back"); }, [issue, sound]);
  const returnHome = useCallback(() => { issue({ type: "RETURN_TO_UNIVERSE" }); clearQuery(); sound.play("back"); }, [issue, clearQuery, sound]);
  const inspectStructure = useCallback(() => { issue({ type: "INSPECT_STRUCTURE" }); sound.play("enter"); }, [issue, sound]);
  const startDesign = useCallback(() => { issue({ type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "Official precomputed 6EHB sequence redesign" }); sound.play("enter"); }, [issue, sound]);

  // ---- global keyboard: Esc returns one level / closes overlays, Cmd+K summons Ask Atlas ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping = activeElement?.matches("input,textarea,[contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }
      if (event.key !== "Escape") return;
      if (isTyping) { activeElement?.blur(); return; }
      if (commandOpen) { setCommandOpen(false); return; }
      if (state.seqOpen) { issue({ type: "CLOSE_SEQUENCE" }); return; }
      if (state.mode !== "universe") { issue({ type: "RETURN_ONE_LEVEL" }); sound.play("back"); return; }
      if (query) clearQuery();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, state.seqOpen, state.mode, query, issue, clearQuery, sound]);

  // ---- continuous design playback ----
  useEffect(() => { designProgressRef.current = state.design?.progress ?? 0; }, [state.design?.progress]);
  useEffect(() => {
    if (!state.design || state.design.playback !== "playing") return;
    let frame = 0; let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      const next = Math.min(1, designProgressRef.current + dt / DESIGN_DURATION_MS);
      designProgressRef.current = next;
      issue({ type: "SEEK_DESIGN", progress: next });
      if (next >= 1) { issue({ type: "SET_DESIGN_PLAYBACK", playback: "paused" }); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // state.design.progress is intentionally excluded: designProgressRef carries it so the
    // rAF loop isn't restarted on every frame's own progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.design?.playback, state.design?.trajectoryId, issue]);

  const onDesignPlayPause = useCallback(() => {
    if (!state.design) return;
    if (state.design.progress >= 1) { designProgressRef.current = 0; issue({ type: "SEEK_DESIGN", progress: 0 }); issue({ type: "SET_DESIGN_PLAYBACK", playback: "playing" }); return; }
    issue({ type: "SET_DESIGN_PLAYBACK", playback: state.design.playback === "playing" ? "paused" : "playing" });
  }, [state.design, issue]);

  // ---- Ask Atlas / GPT-5.6 copilot ----
  const applyTool = useCallback(async (tool: CopilotToolCall): Promise<string[]> => {
    switch (tool.name) {
      case "query_atlas": await runQuery(tool.arguments.query); return [`scene.filter("${tool.arguments.query}")`];
      case "focus_territory": enterTerritory(tool.arguments.territory_id); return [`scene.focusTerritory(${tool.arguments.territory_id})`];
      case "select_protein": {
        const protein = atlas.recordById.get(tool.arguments.protein_id);
        if (!protein) throw new Error(`${tool.arguments.protein_id} is not present in scene context.`);
        selectProtein(protein);
        return [`scene.select(${protein.id})`];
      }
      case "inspect_structure":
        if (state.mode !== "glance") throw new Error("Select a protein first.");
        inspectStructure();
        return ["structure.resolve()"];
      case "set_confidence_xray":
        if (confidence.status !== "available") throw new Error("Verified confidence is unavailable for this structure.");
        issue({ type: "SET_CONFIDENCE_XRAY", visible: tool.arguments.visible });
        return [`structure.setColoring(${tool.arguments.visible ? "plddt" : "default"})`];
      case "reveal_threads":
        if (state.threadsOn !== tool.arguments.visible) issue({ type: "TOGGLE_THREADS" });
        return [`graph.relations(${selectedProtein?.id ?? "?"})`];
      case "focus_residues":
        if (state.mode !== "inspect") throw new Error("Inspect a structure first.");
        issue({ type: "FOCUS_RESIDUES", start: tool.arguments.start, end: tool.arguments.end, chain: tool.arguments.chain, requestId: Date.now() });
        return [`structure.highlightResidues(${tool.arguments.start}, ${tool.arguments.end})`];
      case "start_design":
        if (selectedProtein?.id !== "A5F934") throw new Error("The verified design journey requires selected target A5F934 / 6EHB.");
        startDesign();
        return ["scene.startDesign()"];
      case "return_to_universe":
        returnHome();
        return ["scene.returnToUniverse()"];
    }
  }, [runQuery, enterTerritory, atlas.recordById, selectProtein, state.mode, state.threadsOn, inspectStructure, confidence.status, issue, selectedProtein, startDesign, returnHome]);

  const submitCommand = useCallback(async (value: string) => {
    const question = value.trim();
    if (!question) return;
    setCommand("");
    setCommandOpen(false);
    copilotRequest.current?.abort();
    const controller = new AbortController();
    copilotRequest.current = controller;
    setCopilotBusy(true);
    if (answerTimer.current) window.clearTimeout(answerTimer.current);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: question,
          scene: {
            mode: state.mode, territoryId: state.territoryId, query: state.query, indexedProteins: atlas.indexedCount,
            representation: state.structureRepresentation, ligandsVisible: state.ligandsVisible,
            confidenceXray: state.confidenceXray, threadsOn: state.threadsOn, residueFocus: state.residueFocus,
          },
          protein: selectedProtein,
          confidence: confidence.status === "available" ? { status: "available", metric: confidence.data.metric, mean: confidence.data.mean, lowConfidenceRanges: confidence.data.ranges.veryLow } : { status: confidence.status },
          design: state.design ? { status: design.status, trajectoryId: state.design.trajectoryId, progress: state.design.progress } : undefined,
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Copilot unavailable (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      const trace: string[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsedEvent = copilotStreamEventSchema.safeParse(JSON.parse(line));
          if (!parsedEvent.success) throw new Error("The reasoning channel returned an invalid event.");
          const streamed = parsedEvent.data as CopilotStreamEvent;
          if (streamed.type === "text_delta") { text += streamed.delta; setAnswer({ text, trace: [...trace] }); }
          if (streamed.type === "tool_call") {
            const call = parseCopilotToolCall(streamed.call.name, streamed.call.arguments);
            if (!call) throw new Error("The reasoning channel proposed an invalid scene command.");
            try {
              const traceLines = await applyTool(call);
              trace.push(...traceLines);
            } catch (toolError) {
              trace.push(`scene.reject(${toolError instanceof Error ? toolError.message : "invalid action"})`);
            }
            setAnswer({ text, trace: [...trace] });
          }
          if (streamed.type === "error") { text = text || streamed.message; setAnswer({ text, trace: [...trace] }); }
        }
      }
      answerTimer.current = window.setTimeout(() => setAnswer(null), 9000);
    } catch (error) {
      if (!controller.signal.aborted) {
        setAnswer({ text: error instanceof Error ? error.message : "The reasoning channel is unavailable. Direct spatial search remains active.", trace: [] });
        answerTimer.current = window.setTimeout(() => setAnswer(null), 9000);
      }
    } finally {
      if (copilotRequest.current === controller) copilotRequest.current = null;
      setCopilotBusy(false);
    }
  }, [applyTool, atlas.indexedCount, confidence, design.status, selectedProtein, state]);

  // ---- derived UI flags ----
  const releaseLabel = atlas.manifest?.source.release && atlas.manifest.source.release !== "unknown" ? `UNIPROT ${atlas.manifest.source.release}` : "DEVELOPMENT INDEX";
  const showQuery = !loaderVisible && (state.mode === "universe" || state.mode === "territory") && !commandOpen;
  const territoryLabel = state.territoryId ? territories.find((t) => t.id === state.territoryId)?.label ?? null : null;
  const canDesign = !!selectedProtein && selectedProtein.id === "A5F934";
  const structureDomains = detail.status === "available" ? detail.data.domains.map((domain, index) => ({ label: domain.label, start: domain.start, end: domain.end, color: domainColorHex(index) })) : [];
  const showAskButton = !loaderVisible && !commandOpen;
  const navHint = state.mode === "universe" ? "DRAG ORBIT · RIGHT/SHIFT-DRAG PAN · SCROLL ZOOM · DOUBLE-CLICK FOCUS" : "ESC RETURNS ONE LEVEL";

  const onSelectProteinFromWorld = useCallback((protein: AtlasProtein) => { selectProtein(protein); }, [selectProtein]);
  const submitQuery = (event: FormEvent) => { event.preventDefault(); void runQuery(query); };

  return (
    <main className="hx-app">
      <WorldCanvas
        theme={theme}
        scene={state}
        proteins={atlas.records}
        onSelectProtein={onSelectProteinFromWorld}
        onEnterTerritory={enterTerritory}
        onHoverProtein={() => { if (!hintSeen) setHintSeen(true); }}
        onMetrics={setWorldMetrics}
      />

      {(state.mode === "inspect" || state.mode === "design") && selectedProtein && (
        <StructureView
          active
          structure={selectedProtein.structure}
          confidenceActive={state.confidenceXray}
          representation={state.structureRepresentation}
          colorMode={state.structureColorMode}
          domains={structureDomains}
          showLigands={state.ligandsVisible}
          focusRange={state.residueFocus}
          retryKey={state.structureRetry}
          onStatusChange={setStructureStatus}
          onResiduePick={(residueNumber) => issue({ type: "SET_SEQUENCE_SELECTION", selection: { start: residueNumber - 1, end: residueNumber - 1 } })}
        />
      )}

      <div className="hx-scrim-top" />
      <div className="hx-scrim-bot" />
      <div className="hx-vignette" />

      <Header theme={theme} releaseLabel={releaseLabel} soundOn={sound.enabled} onToggleSound={sound.toggle} onToggleTheme={toggleTheme} onHome={returnHome} />
      <DepthRail
        mode={state.mode}
        visible={!loaderVisible}
        territoryLabel={territoryLabel}
        proteinName={selectedProtein?.name ?? null}
        structureLabel={selectedProtein ? (state.mode === "design" ? `Design · ${selectedProtein.structure.accession}` : selectedProtein.structure.accession) : null}
        onNavigate={navigateLevel}
      />

      <QueryBar
        visible={showQuery}
        query={query}
        onQueryChange={setQuery}
        onSubmit={runQuery}
        onClear={clearQuery}
        active={!!state.query}
        resultCount={queryResults.length || null}
        filterLabel={dominantTerritoryLabel}
      />
      {/* Keep native form submission working for screen readers / Enter key without JS focus tricks */}
      <form onSubmit={submitQuery} className="hx-sr-only" aria-hidden />

      {state.mode === "glance" && selectedProtein && (
        <IdentityPanel
          protein={selectedProtein}
          detail={detail}
          tab={state.tab}
          onSetTab={(tab) => issue({ type: "SET_TAB", tab })}
          threadsOn={state.threadsOn}
          onToggleThreads={() => { issue({ type: "TOGGLE_THREADS" }); sound.play("tick"); }}
          relatedPool={atlas.records}
          onSelectRelated={selectProtein}
          showInspectButton
          onInspect={inspectStructure}
          onOpenSequence={() => issue({ type: state.seqOpen ? "CLOSE_SEQUENCE" : "OPEN_SEQUENCE" })}
          canDesign={canDesign}
          onStartDesign={startDesign}
        />
      )}

      {state.mode === "inspect" && selectedProtein && (
        <InspectPanel
          protein={selectedProtein}
          representation={state.structureRepresentation}
          onSetRepresentation={(representation) => { issue({ type: "SET_REPRESENTATION", representation }); sound.play("tick"); }}
          colorMode={state.structureColorMode}
          onSetColorMode={(colorMode) => { issue({ type: "SET_COLOR_MODE", colorMode }); sound.play("tick"); }}
          ligandsVisible={state.ligandsVisible}
          onToggleLigands={() => { issue({ type: "SET_LIGAND_VISIBILITY", visible: !state.ligandsVisible }); sound.play("tick"); }}
          confidenceXray={state.confidenceXray}
          onToggleConfidenceXray={() => { issue({ type: "SET_CONFIDENCE_XRAY", visible: !state.confidenceXray }); sound.play("tick"); }}
          confidence={confidence}
          structureMetadata={structureMetadata}
          seqOpen={state.seqOpen}
          onOpenSequence={() => issue({ type: state.seqOpen ? "CLOSE_SEQUENCE" : "OPEN_SEQUENCE" })}
          canDesign={canDesign}
          onStartDesign={startDesign}
        />
      )}
      {state.mode === "inspect" && structureStatus === "unavailable" && (
        <button className="hx-command-error" role="alert" onClick={() => issue({ type: "RETRY_STRUCTURE" })}>
          Structure service unavailable · click to retry
        </button>
      )}

      {state.mode === "design" && selectedProtein && state.design && design.status === "available" && (
        <DesignPanel
          proteinName={selectedProtein.name}
          trajectory={design.data}
          design={state.design}
          onPlayPause={onDesignPlayPause}
          onSeek={(progress) => { designProgressRef.current = progress; issue({ type: "SEEK_DESIGN", progress }); }}
          onSelectCandidate={(candidateId) => { issue({ type: "SELECT_DESIGN_CANDIDATE", candidateId }); sound.play("select"); }}
          onExit={() => { issue({ type: "EXIT_DESIGN" }); sound.play("back"); }}
        />
      )}

      {state.seqOpen && selectedProtein && (
        <SequenceTray
          protein={selectedProtein}
          detail={detail}
          selection={state.seqSelection}
          onSetSelection={(selection) => issue({ type: "SET_SEQUENCE_SELECTION", selection })}
          onClose={() => issue({ type: "CLOSE_SEQUENCE" })}
        />
      )}

      <AskAtlas
        visible={showAskButton}
        navHint={navHint}
        hintVisible={!hintSeen}
        commandOpen={commandOpen}
        onOpenCommand={() => setCommandOpen(true)}
        onCloseCommand={() => setCommandOpen(false)}
        command={command}
        onCommandChange={setCommand}
        onSubmitCommand={submitCommand}
        busy={copilotBusy}
        answer={answer}
        onDismissAnswer={() => setAnswer(null)}
      />

      {!loaderVisible && state.mode !== "inspect" && state.mode !== "design" && !state.seqOpen && (
        <div className="hx-telemetry">
          <div className="hx-telemetry-status">
            {state.mode === "universe" ? `Atlas ready · ${(atlas.manifest?.coverage.records ?? 0).toLocaleString()} proteins in delivery profile` : state.mode === "territory" ? `${territoryLabel} · ${worldMetrics.visibleCount.toLocaleString()} loaded` : selectedProtein?.name ?? "Atlas ready"}
          </div>
          <div className="hx-telemetry-row mono">
            <span>{worldMetrics.fps || "—"} FPS</span>
            <span>{worldMetrics.visibleCount.toLocaleString()} VISIBLE</span>
            <span>{(atlas.addressableCount ?? 575_503).toLocaleString()} INDEXED</span>
          </div>
        </div>
      )}

      {commandError && <p className="hx-command-error" role="alert">{commandError}<button onClick={() => setCommandError(null)}>Dismiss</button></p>}

      {loaderVisible && <LoadingScreen theme={theme} stageLabel={stageLabel} progress={atlas.progress} resolvedCount={atlas.records.length} />}
    </main>
  );
}
