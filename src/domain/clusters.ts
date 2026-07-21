import { atlasRegions } from "./spatialization";

/**
 * The Claude Design specifies a 6-hue grouping (originally named "Territory").
 * Production's real classification is a finer 12-region annotation taxonomy
 * (spatialization.ts, shared with the offline build pipeline). Rather than
 * discard that resolution, each of these 6 UI-facing clusters groups two
 * thematically related regions — the data keeps its real granularity, the
 * presentation gets the design's 6 groups. See docs/handoff/CLAUDE_TAKEOVER_AUDIT.md §3.
 *
 * Named distinctly from the unrelated `AtlasCluster` type (atlas-data.ts) —
 * that is a much finer-grained annotation-family grouping used only for shard
 * load-priority ordering, not this UI depth level. See docs/handoff/DESIGN_DELTA.md.
 */
export const clusters = [
  { id: "catalysis-metabolism", label: "Catalysis & Metabolism", hue: 0, regions: ["catalysis", "metabolism"] },
  { id: "transport-membrane", label: "Transport & Membrane", hue: 1, regions: ["transport", "membrane"] },
  { id: "signalling-regulation", label: "Signalling & Regulation", hue: 2, regions: ["signalling", "regulation"] },
  { id: "genome-expression", label: "Genome & Expression", hue: 3, regions: ["genome", "expression"] },
  { id: "immunity-viral", label: "Immunity & Viral", hue: 4, regions: ["immunity", "viral"] },
  { id: "structure-unresolved", label: "Structure & Unresolved", hue: 5, regions: ["structure", "unresolved"] },
] as const;

export type ClusterId = (typeof clusters)[number]["id"];

/**
 * The real corpus's annotation-family hierarchy (spatialization.ts) places region
 * centers within roughly ±100 units of the origin — a coordinate system inherited
 * from the pre-Claude-Design engine's much tighter camera clamp (r ∈ [8,520]).
 * The design's camera contract (MOTION_AND_CAMERA_SPEC.md) uses much larger,
 * fixed r values (640 arrival, 260 cluster-enter, ...) tuned against the
 * prototype's own much larger synthetic point field. Rather than compress the
 * design's camera numbers to fit, every world-space position is scaled up by this
 * factor at the render boundary (WorldCanvas) so the two contracts agree — a
 * presentation-layer transform only; it never touches the underlying data files
 * or their real semantic coordinates.
 */
export const WORLD_SCALE = 6;

const regionToCluster = new Map<string, number>();
clusters.forEach((cluster, index) => cluster.regions.forEach((region) => regionToCluster.set(region, index)));

const regionCenters = new Map(atlasRegions.map(([id, center]) => [id, center]));

export function clusterIndexForRegion(regionId: string): number {
  return regionToCluster.get(regionId) ?? clusters.length - 1;
}

/** World-space (scaled) center — use for camera targeting and rendering. */
export function clusterCenter(clusterIndex: number): [number, number, number] {
  const cluster = clusters[clusterIndex];
  const centers = cluster.regions.map((region) => regionCenters.get(region) ?? [0, 0, 0]);
  const sum = centers.reduce((total, center) => [total[0] + center[0], total[1] + center[1], total[2] + center[2]], [0, 0, 0]);
  return [(sum[0] / centers.length) * WORLD_SCALE, (sum[1] / centers.length) * WORLD_SCALE, (sum[2] / centers.length) * WORLD_SCALE];
}

/** Convert a real protein's raw data-space position into the same scaled world space as clusterCenter(). */
export function worldPosition(position: readonly [number, number, number]): [number, number, number] {
  return [position[0] * WORLD_SCALE, position[1] * WORLD_SCALE, position[2] * WORLD_SCALE];
}

export function clusterByRegion(regionId: string) {
  return clusters[clusterIndexForRegion(regionId)];
}
