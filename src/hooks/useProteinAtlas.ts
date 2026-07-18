"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasManifest, AtlasProtein, AtlasSearchResult, AtlasShard } from "@/domain/atlas-data";

type SearchMessage = {
  type: "RESULTS";
  requestId: number;
  results: Array<{ id: string; score: number; matchedBy: AtlasSearchResult["matchedBy"] }>;
};

type SearchResolver = (results: AtlasSearchResult[]) => void;

export function useProteinAtlas(active: boolean) {
  const [manifest, setManifest] = useState<AtlasManifest | null>(null);
  const [records, setRecords] = useState<AtlasProtein[]>([]);
  const [indexedCount, setIndexedCount] = useState(0);
  const [loadedShardIds, setLoadedShardIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("Opening source manifest");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const recordsRef = useRef<Map<string, AtlasProtein>>(new Map());
  const pendingSearches = useRef<Map<number, SearchResolver>>(new Map());
  const requestId = useRef(0);
  const loadingShards = useRef<Set<string>>(new Set());
  const loadedShards = useRef<Set<string>>(new Set());

  useEffect(() => {
    const searches = pendingSearches.current;
    const worker = new Worker("/workers/atlas-search.js");
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SearchMessage | { type: "INDEX_SIZE"; count: number }>) => {
      if (event.data.type === "INDEX_SIZE") {
        setIndexedCount(event.data.count);
        return;
      }
      const resolver = pendingSearches.current.get(event.data.requestId);
      if (!resolver) return;
      pendingSearches.current.delete(event.data.requestId);
      resolver(event.data.results.flatMap((result) => {
        const protein = recordsRef.current.get(result.id);
        return protein ? [{ protein, score: result.score, matchedBy: result.matchedBy }] : [];
      }));
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      for (const resolver of searches.values()) resolver([]);
      searches.clear();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/data/atlas/manifest.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Atlas manifest unavailable (${response.status})`);
        return response.json() as Promise<AtlasManifest>;
      })
      .then((data) => {
        setManifest(data);
        setStatus(`Mapped ${data.clusters.length.toLocaleString()} protein families`);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Atlas manifest unavailable");
      });
    return () => controller.abort();
  }, []);

  const ensureShard = useCallback(async (id: string) => {
    if (!manifest || loadedShards.current.has(id) || loadingShards.current.has(id)) return;
    const descriptor = manifest.shards.find((candidate) => candidate.id === id);
    if (!descriptor) return;
    loadingShards.current.add(id);
    try {
      const response = await fetch(descriptor.href);
      if (!response.ok) throw new Error(`Shard ${id} unavailable (${response.status})`);
      const shard = await response.json() as AtlasShard;
      const additions = shard.records.filter((record) => !recordsRef.current.has(record.id));
      for (const record of additions) recordsRef.current.set(record.id, record);
      setRecords((current) => current.concat(additions));
      workerRef.current?.postMessage({ type: "ADD_RECORDS", records: additions });
      loadedShards.current.add(id);
      setLoadedShardIds(new Set(loadedShards.current));
      setStatus(`Indexed ${recordsRef.current.size.toLocaleString()} proteins`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Shard ${id} unavailable`);
    } finally {
      loadingShards.current.delete(id);
    }
  }, [manifest]);

  useEffect(() => {
    if (!active || !manifest) return;
    let cancelled = false;
    const priority = [...new Set(manifest.clusters.slice(0, 48).map((cluster) => cluster.shard.toString(16).padStart(2, "0")))];
    const remainder = manifest.shards.map((shard) => shard.id).filter((id) => !priority.includes(id));
    const ordered = priority.concat(remainder);
    void (async () => {
      for (let index = 0; index < ordered.length && !cancelled; index += 4) {
        await Promise.all(ordered.slice(index, index + 4).map(ensureShard));
        await new Promise((resolve) => window.setTimeout(resolve, 16));
      }
      if (!cancelled) setStatus(`Atlas ready · ${recordsRef.current.size.toLocaleString()} proteins indexed`);
    })();
    return () => { cancelled = true; };
  }, [active, ensureShard, manifest]);

  const search = useCallback((query: string) => new Promise<AtlasSearchResult[]>((resolve) => {
    const worker = workerRef.current;
    if (!worker || !query.trim()) {
      resolve([]);
      return;
    }
    const id = ++requestId.current;
    pendingSearches.current.set(id, resolve);
    worker.postMessage({ type: "QUERY", requestId: id, query });
  }), []);

  const recordById = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]);
  const progress = manifest ? Math.min(1, records.length / Math.max(1, manifest.coverage.records)) : 0;

  return { manifest, records, recordById, indexedCount, loadedShardIds, ensureShard, search, status, error, progress };
}
