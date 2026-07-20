export type StructureReference = {
  kind: "experimental" | "predicted";
  accession: string;
  source: "RCSB PDB" | "AlphaFold DB";
};

export type AtlasProtein = {
  id: string;
  entry: string;
  name: string;
  organism: string;
  taxonomyId: number | null;
  length: number;
  family: string;
  region: string;
  cluster: string;
  position: [number, number, number];
  structure: StructureReference;
};

export type AtlasCluster = {
  id: string;
  label: string;
  region: string;
  count: number;
  center: [number, number, number];
  shard: number;
};

export type AtlasRegion = {
  id: string;
  label: string;
  center: [number, number, number];
  count: number;
};

export type AtlasManifest = {
  schema: "helicase.atlas.manifest.v1";
  generatedAt: string;
  source: {
    name: string;
    query: string;
    url: string;
    release: string;
    releaseDate: string;
    license: string;
  };
  spatialization: {
    method: string;
    semantics: string;
    structuralSimilarity: boolean;
    caveat: string;
  };
  coverage: {
    records: number;
    experimentalStructures: number;
    predictedStructureReferences: number;
    completeSourceQuery: boolean;
    requestedLimit: number | null;
  };
  regions: AtlasRegion[];
  clusters: AtlasCluster[];
  shards: Array<{ id: string; count: number; bytes: number; href: string }>;
};

export type AtlasShard = {
  schema: "helicase.atlas.shard.v1";
  id: string;
  records: AtlasProtein[];
};

export type AtlasSearchResult = {
  protein: AtlasProtein;
  score: number;
  matchedBy: Array<"identifier" | "name" | "function" | "organism" | "family" | "class">;
};

export type CameraContext = {
  position: [number, number, number];
  target: [number, number, number];
  scale: "universe" | "region" | "cluster" | "protein";
};
