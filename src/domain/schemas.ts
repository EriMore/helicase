import { z } from "zod";

const vec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);

export const sceneCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ENTER_ATLAS") }).strict(),
  z.object({ type: z.literal("FLY_TO_PROTEIN"), proteinId: z.string().min(1).max(40) }).strict(),
  z.object({ type: z.literal("RETURN_TO_UNIVERSE") }).strict(),
  z.object({ type: z.literal("SET_CAMERA_CONTEXT"), context: z.object({ position: vec3Schema, target: vec3Schema, scale: z.enum(["universe", "region", "cluster", "protein"]) }) }).strict(),
  z.object({ type: z.literal("QUERY_ATLAS"), query: z.string().max(240), resultIds: z.array(z.string().max(40)).max(500) }).strict(),
  z.object({ type: z.literal("CLEAR_QUERY") }).strict(),
  z.object({ type: z.literal("FOCUS_REGION"), regionId: z.string().min(1).max(48) }).strict(),
  z.object({ type: z.literal("COLOR_BY"), scheme: z.enum(["confidence", "trusted_core", "hydrophobicity"]) }).strict(),
  z.object({ type: z.literal("SET_REPRESENTATION"), representation: z.enum(["cartoon", "surface", "ball-and-stick"]) }).strict(),
  z.object({ type: z.literal("SET_LIGAND_VISIBILITY"), visible: z.boolean() }).strict(),
  z.object({ type: z.literal("FOCUS_RESIDUES"), start: z.number().int().min(-10_000).max(100_000), end: z.number().int().min(-10_000).max(100_000), chain: z.string().min(1).max(12).optional(), requestId: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("RETRY_STRUCTURE") }).strict(),
  z.object({ type: z.literal("START_DESIGN_JOURNEY"), trajectoryId: z.string().min(1).max(120), specification: z.string().min(1).max(500) }).strict(),
  z.object({ type: z.literal("PLAY_DESIGN_TRAJECTORY") }).strict(),
  z.object({ type: z.literal("PAUSE_DESIGN_TRAJECTORY") }).strict(),
  z.object({ type: z.literal("STEP_DESIGN_STAGE"), direction: z.enum(["forward", "backward"]) }).strict(),
  z.object({ type: z.literal("SEEK_DESIGN_STAGE"), stageIndex: z.number().int().min(0).max(100) }).strict(),
  z.object({ type: z.literal("RESTART_DESIGN_TRAJECTORY") }).strict(),
  z.object({ type: z.literal("SET_DESIGN_STAGE"), stageIndex: z.number().int().min(0).max(100) }).strict(),
  z.object({ type: z.literal("SELECT_DESIGN_CANDIDATE"), candidateId: z.string().min(1).max(120) }).strict(),
  z.object({ type: z.literal("COMPARE_DESIGN_CANDIDATES"), candidateIds: z.array(z.string().min(1).max(120)).min(1).max(2) }).strict(),
  z.object({ type: z.literal("LEAVE_DESIGN_JOURNEY") }).strict(),
]);

export const structureReferenceSchema = z.object({
  kind: z.enum(["experimental", "predicted"]),
  accession: z.string().min(1).max(40),
  source: z.enum(["RCSB PDB", "AlphaFold DB"]),
});

export const atlasProteinSchema = z.object({
  id: z.string().min(1).max(40),
  entry: z.string().max(64),
  name: z.string().min(1).max(256),
  organism: z.string().max(180),
  taxonomyId: z.number().int().positive().nullable(),
  length: z.number().int().nonnegative(),
  family: z.string().max(180),
  region: z.string().min(1).max(48),
  cluster: z.string().min(1).max(120),
  position: vec3Schema,
  structure: structureReferenceSchema,
});

const atlasClusterSchema = z.object({
  id: z.string(), label: z.string(), region: z.string(), count: z.number().int().nonnegative(),
  center: vec3Schema, shard: z.number().int().nonnegative(),
});

const atlasRegionSchema = z.object({
  id: z.string(), label: z.string(), center: vec3Schema, count: z.number().int().nonnegative(),
});

export const atlasManifestSchema = z.object({
  schema: z.literal("helicase.atlas.manifest.v1"),
  generatedAt: z.string(),
  source: z.object({
    name: z.string(), query: z.string(), url: z.string().url(), release: z.string(), releaseDate: z.string(), license: z.string(),
  }),
  spatialization: z.object({
    method: z.string(), semantics: z.string(), structuralSimilarity: z.boolean(), caveat: z.string(),
  }),
  coverage: z.object({
    records: z.number().int().nonnegative(), experimentalStructures: z.number().int().nonnegative(),
    predictedStructureReferences: z.number().int().nonnegative(), completeSourceQuery: z.boolean(),
    requestedLimit: z.number().int().positive().nullable(),
  }),
  regions: z.array(atlasRegionSchema),
  clusters: z.array(atlasClusterSchema),
  shards: z.array(z.object({ id: z.string(), count: z.number().int().nonnegative(), bytes: z.number().int().nonnegative(), href: z.string() })),
});

export const atlasShardSchema = z.object({
  schema: z.literal("helicase.atlas.shard.v1"),
  id: z.string(),
  records: z.array(atlasProteinSchema),
});

export const matchedFieldSchema = z.enum(["identifier", "name", "function", "organism", "family", "class"]);

export const atlasWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("INDEX_SIZE"), count: z.number().int().nonnegative() }).strict(),
  z.object({
    type: z.literal("RESULTS"),
    requestId: z.number().int().nonnegative(),
    results: z.array(z.object({
      id: z.string().min(1).max(40),
      score: z.number().finite(),
      matchedBy: z.array(matchedFieldSchema),
    }).strict()).max(500),
  }).strict(),
]);

export const copilotStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("meta"), source: z.enum(["gpt-5.6", "local-explicit"]) }).strict(),
  z.object({ type: z.literal("text_delta"), delta: z.string() }).strict(),
  z.object({ type: z.literal("tool_call"), call: z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) }).strict() }).strict(),
  z.object({ type: z.literal("error"), message: z.string(), retryable: z.boolean() }).strict(),
  z.object({ type: z.literal("done") }).strict(),
]);

export const corpusSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(240),
  cursor: z.string().regex(/^[A-Za-z0-9_-]+$/).max(512).optional(),
  size: z.number().int().min(1).max(100).default(40),
});

export const corpusSearchResponseSchema = z.object({
  schema: z.literal("helicase.atlas.search.v1"),
  query: z.string(),
  scope: z.enum(["complete-reviewed-corpus", "browser-profile"]),
  source: z.object({ name: z.string(), release: z.string(), url: z.string().url() }),
  records: z.array(atlasProteinSchema),
  totalResults: z.number().int().nonnegative().nullable(),
  nextCursor: z.string().nullable(),
  partial: z.boolean(),
  warning: z.string().nullable(),
});

export const residueConfidenceSchema = z.object({
  chain: z.string().min(1).max(12),
  residueNumber: z.number().int(),
  insertionCode: z.string().max(4),
  residueName: z.string().max(8),
  plddt: z.number().min(0).max(100),
});

export const confidenceDatasetSchema = z.object({
  schema: z.literal("helicase.confidence.plddt.v1"),
  metric: z.literal("pLDDT"),
  accession: z.string(),
  modelId: z.string(),
  modelVersion: z.string(),
  source: z.literal("AlphaFold DB"),
  sourceUrl: z.string().url(),
  retrievedAt: z.string(),
  mean: z.number().min(0).max(100),
  residues: z.array(residueConfidenceSchema).min(1),
  ranges: z.object({ veryHigh: z.array(z.tuple([z.number().int(), z.number().int()])), confident: z.array(z.tuple([z.number().int(), z.number().int()])), low: z.array(z.tuple([z.number().int(), z.number().int()])), veryLow: z.array(z.tuple([z.number().int(), z.number().int()])) }),
  paeUrl: z.string().url().nullable(),
  limitations: z.array(z.string()),
});

export const structureMetadataSchema = z.object({
  schema: z.literal("helicase.structure.metadata.v1"),
  structure: structureReferenceSchema,
  sourceUrl: z.string().url(),
  retrievedAt: z.string(),
  chains: z.array(z.object({
    id: z.string(), entityId: z.string(), description: z.string(), uniprotAccession: z.string().nullable(),
    entitySequenceCoverage: z.number().min(0).max(1).nullable(), referenceSequenceCoverage: z.number().min(0).max(1).nullable(),
    alignments: z.array(z.object({ entityStart: z.number().int(), referenceStart: z.number().int(), length: z.number().int().positive(), provenance: z.string() })),
  })),
  limitations: z.array(z.string()),
});

export const provenanceSchema = z.object({
  source: z.string(), method: z.string(), methodVersion: z.string(), generatedAt: z.string(),
  inputIdentity: z.string(), outputIdentity: z.string(), license: z.string().nullable(), limitations: z.array(z.string()),
});

export const designMetricSchema = z.object({
  name: z.string(), value: z.number(), unit: z.string().nullable(), direction: z.enum(["higher", "lower", "contextual"]), source: z.string(),
});

export const designCandidateSchema = z.object({
  id: z.string(), name: z.string(), sequence: z.string().regex(/^[A-Z]+(?:\/[A-Z]+)*$/).nullable(), structureUrl: z.string().url().nullable(),
  metrics: z.array(designMetricSchema), provenance: provenanceSchema,
});

export const designStageSchema = z.object({
  id: z.string(), label: z.string(), method: z.string(), description: z.string(), artifactUrl: z.string().nullable(),
  candidates: z.array(designCandidateSchema), provenance: provenanceSchema,
});

export const designTrajectorySchema = z.object({
  schema: z.literal("helicase.design.trajectory.v1"), id: z.string(), targetProteinId: z.string(), targetStructureId: z.string(),
  targetSite: z.object({ label: z.string(), residues: z.array(z.number().int()) }), objective: z.string(),
  precomputed: z.literal(true), stages: z.array(designStageSchema).min(2), provenance: provenanceSchema,
});

export type ConfidenceDataset = z.infer<typeof confidenceDatasetSchema>;
export type StructureMetadata = z.infer<typeof structureMetadataSchema>;
export type DesignTrajectory = z.infer<typeof designTrajectorySchema>;
