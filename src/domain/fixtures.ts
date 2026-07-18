import type { Protein } from "./atlas";

export const featuredProtein: Protein = {
  id: "P42212", name: "Green fluorescent protein", source: "RCSB Protein Data Bank", accession: "1EMA", family: "Fluorescent proteins", length: 238, confidence: 92.4,
  designableSite: { id: "gfp-exposed-loop", name: "Exposed barrel loop", residues: "145–158" },
  citation: "Ormö et al., Science (1996), PDB 1EMA",
};

export const atlasStats = { visibleRecords: 1037, targetUniverse: "200M+ structures", selectionMethod: "Curated, family-balanced build fixture" };
export const developmentDesign = { steps: 50, pipeline: ["RFdiffusion", "ProteinMPNN", "Boltz-2"], disclaimer: "Choreography preview — verified offline design trajectory pending import." };
