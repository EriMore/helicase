import type { AtlasProtein } from "./atlas-data";
import { explainProximity } from "./spatialization";

export type RelationshipThread = {
  protein: AtlasProtein;
  type: "Shared family" | "Shared classification";
  status: "Annotated" | "Computed";
  basis: string;
};

/**
 * Real, attributable relationship signal from explainProximity() — never an
 * invented edge. "Shared family" comes from UniProt's own protein-family
 * annotation; "Shared classification" comes from this codebase's own
 * annotation-region tagging (spatialization.ts), which is explicitly not a
 * measured similarity. At most `limit` threads, ranked family match first.
 */
export function computeRelationshipThreads(selected: AtlasProtein, pool: AtlasProtein[], limit = 3): RelationshipThread[] {
  const scored = pool
    .filter((candidate) => candidate.id !== selected.id)
    .map((candidate) => {
      const { signals } = explainProximity(selected, candidate);
      const familyMatch = signals.some((signal) => signal?.kind === "uniprot-family");
      const organismMatch = signals.some((signal) => signal?.kind === "organism");
      const regionMatch = signals.some((signal) => signal?.kind === "annotation-region");
      const score = (familyMatch ? 10 : 0) + (organismMatch ? 2 : 0) + (regionMatch ? 1 : 0);
      return { candidate, score, familyMatch, organismMatch, regionMatch };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));

  return scored.slice(0, limit).map(({ candidate, familyMatch, organismMatch, regionMatch }): RelationshipThread => {
    if (familyMatch) {
      return { protein: candidate, type: "Shared family", status: "Annotated", basis: `Both are UniProt-annotated members of "${selected.family}".` };
    }
    if (regionMatch && organismMatch) {
      return { protein: candidate, type: "Shared classification", status: "Computed", basis: `Same ${selected.organism} lineage, both classified under the ${selected.region} annotation region.` };
    }
    return { protein: candidate, type: "Shared classification", status: "Computed", basis: `Both classified under the ${selected.region} annotation region.` };
  });
}
