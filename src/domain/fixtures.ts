import type { Protein } from "./atlas";

export const featuredProtein: Protein = {
  id: "P42212", name: "Green fluorescent protein", source: "RCSB Protein Data Bank", accession: "1EMA", family: "Fluorescent proteins", length: 238, confidence: null,
  designableSite: { id: "gfp-exposed-loop", name: "Exposed barrel loop", residues: "145–158" },
  citation: "Ormö et al., Science (1996), PDB 1EMA",
};

export const renderingStatus = "Molecular coordinates load from RCSB PDB; prediction confidence is unavailable for this experimental entry.";

export const atlasStats = {
  citedLandmarks: 1,
  targetUniverse: "200M+ structures",
  fieldStatus: "Conceptual density field — embedded atlas fixture pending import",
};
export const developmentDesign = { steps: 50, pipeline: ["RFdiffusion", "ProteinMPNN", "Boltz-2"], disclaimer: "Choreography preview — verified offline design trajectory pending import." };
