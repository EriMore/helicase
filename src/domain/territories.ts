import { atlasRegions } from "./spatialization";

/**
 * The Claude Design specifies a 6-hue territory palette. Production's real
 * classification is a finer 12-region annotation taxonomy (spatialization.ts,
 * shared with the offline build pipeline). Rather than discard that
 * resolution, each design territory groups two thematically related regions
 * — the data keeps its real granularity, the presentation gets the design's
 * 6 territories. See docs/handoff/CLAUDE_TAKEOVER_AUDIT.md §3.
 */
export const territories = [
  { id: "catalysis-metabolism", label: "Catalysis & Metabolism", hue: 0, regions: ["catalysis", "metabolism"] },
  { id: "transport-membrane", label: "Transport & Membrane", hue: 1, regions: ["transport", "membrane"] },
  { id: "signalling-regulation", label: "Signalling & Regulation", hue: 2, regions: ["signalling", "regulation"] },
  { id: "genome-expression", label: "Genome & Expression", hue: 3, regions: ["genome", "expression"] },
  { id: "immunity-viral", label: "Immunity & Viral", hue: 4, regions: ["immunity", "viral"] },
  { id: "structure-unresolved", label: "Structure & Unresolved", hue: 5, regions: ["structure", "unresolved"] },
] as const;

export type TerritoryId = (typeof territories)[number]["id"];

const regionToTerritory = new Map<string, number>();
territories.forEach((territory, index) => territory.regions.forEach((region) => regionToTerritory.set(region, index)));

const regionCenters = new Map(atlasRegions.map(([id, center]) => [id, center]));

export function territoryIndexForRegion(regionId: string): number {
  return regionToTerritory.get(regionId) ?? territories.length - 1;
}

export function territoryCenter(territoryIndex: number): [number, number, number] {
  const territory = territories[territoryIndex];
  const centers = territory.regions.map((region) => regionCenters.get(region) ?? [0, 0, 0]);
  const sum = centers.reduce((total, center) => [total[0] + center[0], total[1] + center[1], total[2] + center[2]], [0, 0, 0]);
  return [sum[0] / centers.length, sum[1] / centers.length, sum[2] / centers.length];
}

export function territoryByRegion(regionId: string) {
  return territories[territoryIndexForRegion(regionId)];
}
