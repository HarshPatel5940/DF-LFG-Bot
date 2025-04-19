import { ulid } from "ulid";
import { z } from "zod";

export const MapSchema = z.enum([
  "Zero Dam",
  "Layali Grove",
  "Space City",
  "Brakkesh",
]);
export const DifficultySchema = z.enum(["Easy", "Normal"]);
export const RankedStatusSchema = z.enum(["Ranked", "Not Ranked"]);
export const ObjectiveTypeSchema = z.enum(["Hotspots", "Scavenge"]);
export const LoadoutTypeSchema = z.enum([
  "Fully Armed",
  "Scavenger Hunt",
  "Risk it for the Biscuit",
]);
export const ClassTypeSchema = {
  options: [
    "Need Recon",
    "Need Assault",
    "Need Engineer",
    "Need Support",
  ] as const,
};

export const lfgSchema = z.object({
  id: z
    .string()
    .default(
      () => Date.now().toString() + Math.random().toString(36).substring(2, 9),
    ),
  guildId: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  ownerId: z.string(),
  ownerTag: z.string(),

  mode: z.literal("Operations").default("Operations"),
  microphone: z.literal(true).default(true),

  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,

  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2).default([]),

  voiceChannelId: z.string().optional().nullable(),
  announcementMessageId: z.string().optional().nullable(),
  announcementChannelId: z.string().optional().nullable(),

  status: z.enum(["active", "closed"]).default("active"),
  closedAt: z.date().optional(),
});

export const lfgCreateParamsSchema = z.object({
  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,
  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2).optional(),
});

export type MapType = z.infer<typeof MapSchema>;
export type DifficultyType = z.infer<typeof DifficultySchema>;
export type RankedStatusType = z.infer<typeof RankedStatusSchema>;
export type ObjectiveTypeType = z.infer<typeof ObjectiveTypeSchema>;
export type LoadoutTypeType = z.infer<typeof LoadoutTypeSchema>;
export type ClassTypeType = (typeof ClassTypeSchema.options)[number];
export type LFGCreateParams = z.infer<typeof lfgCreateParamsSchema>;
export type LFGSchema = z.infer<typeof lfgSchema>;
