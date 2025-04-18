import { ulid } from "ulid";
import { z } from "zod";

// Enum schemas for LFG parameters
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

// Main LFG schema
export const lfgSchema = z.object({
  id: z
    .string()
    .ulid()
    .default(() => ulid()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  ownerId: z.string(), // Discord user ID
  ownerTag: z.string(), // Discord user tag

  // Fixed parameters
  mode: z.literal("Operations"),
  squadSize: z.literal(3),
  microphone: z.literal(true),

  // Customizable parameters
  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,

  // Squad tags
  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2),

  // Channel and message IDs
  voiceChannelId: z.string().optional(),
  announcementMessageId: z.string().optional(),
  announcementChannelId: z.string().optional(),

  // Current squad members (including owner)
  members: z
    .array(
      z.object({
        id: z.string(), // Discord user ID
        tag: z.string(), // Discord user tag
        joinedAt: z.date().default(() => new Date()),
      })
    )
    .default([]),

  // Status
  status: z.enum(["active", "closed"]).default("active"),
  closedAt: z.date().optional(),
});

// Helper type for LFG parameters
export const lfgCreateParamsSchema = z.object({
  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,
  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2),
});

// Export types
export type MapType = z.infer<typeof MapSchema>;
export type DifficultyType = z.infer<typeof DifficultySchema>;
export type RankedStatusType = z.infer<typeof RankedStatusSchema>;
export type ObjectiveTypeType = z.infer<typeof ObjectiveTypeSchema>;
export type LoadoutTypeType = z.infer<typeof LoadoutTypeSchema>;
export type ClassTypeType = (typeof ClassTypeSchema.options)[number];
export interface LFGCreateParams {
  map: "Zero Dam" | "Layali Grove" | "Space City" | "Brakkesh";
  difficulty: "Easy" | "Normal";
  rankedStatus: "Ranked" | "Not Ranked";
  objectiveType: "Hotspots" | "Scavenge";
  loadoutType: "Fully Armed" | "Scavenger Hunt" | "Risk it for the Biscuit";
  neededClasses: (
    | "Need Recon"
    | "Need Assault"
    | "Need Engineer"
    | "Need Support"
  )[];
}

export interface LFGSchema {
  id: string;
  ownerId: string;
  createdAt: string;
  status: "active" | "closed";
  mode: string;
  map: string;
  difficulty: string;
  rankedStatus: string;
  objectiveType: string;
  loadoutType: string;
  neededClasses: string[];
  squadSize: number;
  members: Array<{ id: string; tag: string }>;
  voiceChannelId: string | null;
  announcementChannelId: string | null;
  announcementMessageId: string | null;
}
