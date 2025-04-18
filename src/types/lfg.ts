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
    // .ulid() // Using simpler ID generation now
    // .default(() => ulid()),
    .default(
      () => Date.now().toString() + Math.random().toString(36).substring(2, 9)
    ), // Match service
  guildId: z.string(), // Added Guild ID
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  ownerId: z.string(), // Discord user ID
  ownerTag: z.string(), // Discord user tag

  // Fixed parameters (adjust if needed)
  mode: z.literal("Operations").default("Operations"), // Default added
  squadSize: z.literal(3).default(3), // Default added, adjust size if needed
  microphone: z.literal(true).default(true), // Default added

  // Customizable parameters
  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,

  // Squad tags
  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2).default([]), // Default added

  // Channel and message IDs
  voiceChannelId: z.string().optional().nullable(), // Allow null
  announcementMessageId: z.string().optional().nullable(), // Allow null
  announcementChannelId: z.string().optional().nullable(), // Allow null

  // Current squad members (including owner)
  members: z
    .array(
      z.object({
        id: z.string(), // Discord user ID
        tag: z.string(), // Discord user tag
        joinedAt: z.date().default(() => new Date()),
      })
    )
    .default([]), // Default added

  // Status
  status: z.enum(["active", "closed"]).default("active"),
  closedAt: z.date().optional(),
});

// Helper type for LFG parameters used during creation
export const lfgCreateParamsSchema = z.object({
  map: MapSchema,
  difficulty: DifficultySchema,
  rankedStatus: RankedStatusSchema,
  objectiveType: ObjectiveTypeSchema,
  loadoutType: LoadoutTypeSchema,
  neededClasses: z.array(z.enum(ClassTypeSchema.options)).max(2).optional(), // Make optional here
});

// Export types
export type MapType = z.infer<typeof MapSchema>;
export type DifficultyType = z.infer<typeof DifficultySchema>;
export type RankedStatusType = z.infer<typeof RankedStatusSchema>;
export type ObjectiveTypeType = z.infer<typeof ObjectiveTypeSchema>;
export type LoadoutTypeType = z.infer<typeof LoadoutTypeSchema>;
export type ClassTypeType = (typeof ClassTypeSchema.options)[number];

// Interface for creation parameters (matches schema)
export type LFGCreateParams = z.infer<typeof lfgCreateParamsSchema>;

// Interface for the stored LFG object (matches schema)
// Using z.infer is generally preferred over manual interfaces
export type LFGSchema = z.infer<typeof lfgSchema>;

/* Manual interface (can be removed if using z.infer consistently)
export interface LFGSchema {
  id: string;
  guildId: string; // Added
  ownerId: string;
  ownerTag: string; // Added ownerTag
  createdAt: string; // Use string for ISO date format if not using Date objects
  updatedAt: string; // Use string for ISO date format
  status: "active" | "closed";
  mode: string;
  map: MapType; // Use specific types
  difficulty: DifficultyType;
  rankedStatus: RankedStatusType;
  objectiveType: ObjectiveTypeType;
  loadoutType: LoadoutTypeType;
  neededClasses: ClassTypeType[];
  squadSize: number;
  members: Array<{ id: string; tag: string; joinedAt: string }>; // Add joinedAt, use string date
  voiceChannelId: string | null;
  announcementChannelId: string | null;
  announcementMessageId: string | null;
  closedAt?: string | null; // Optional string date
}
*/
