import { ulid } from "ulid";
import { z } from "zod";

export const MapSchema = z.enum([
  "Zero Dam",
  "Zero Dam - Blackout: Long Night",
  "Layali Grove",
  "Space City",
  "Brakkesh",
]);
export const DifficultySchema = z.enum(["Easy", "Normal", "Hard"]);
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
      () => Date.now().toString() + Math.random().toString(36).substring(2, 9)
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

export const MapAvailabilitySchema = z.object({
  map: MapSchema,
  difficulty: DifficultySchema,
  isPermanent: z.boolean(),
  rotationHours: z.array(z.number()).optional(),
});

export const MAP_AVAILABILITY: z.infer<typeof MapAvailabilitySchema>[] = [
  { map: "Zero Dam", difficulty: "Easy", isPermanent: true },
  { map: "Zero Dam", difficulty: "Normal", isPermanent: true },
  { map: "Layali Grove", difficulty: "Easy", isPermanent: true },
  {
    map: "Zero Dam - Blackout: Long Night",
    difficulty: "Normal",
    isPermanent: false,
    rotationHours: [1, 2, 5, 6, 17, 18, 21, 22],
  },
  {
    map: "Layali Grove",
    difficulty: "Normal",
    isPermanent: false,
    rotationHours: [3, 7, 19, 23],
  },
  {
    map: "Space City",
    difficulty: "Normal",
    isPermanent: false,
    rotationHours: [0, 1, 5, 8, 9, 12, 13, 16, 17, 20, 21],
  },
  {
    map: "Space City",
    difficulty: "Hard",
    isPermanent: false,
    rotationHours: [0, 4, 8, 20],
  },
  {
    map: "Brakkesh",
    difficulty: "Normal",
    isPermanent: false,
    rotationHours: [2, 3, 4, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23],
  },
];

export function isMapAvailable(
  map: MapType,
  difficulty: DifficultyType
): boolean {
  const mapConfig = MAP_AVAILABILITY.find(
    (m) => m.map === map && m.difficulty === difficulty
  );

  if (!mapConfig) return false;
  if (mapConfig.isPermanent) return true;

  const currentHour = new Date().getUTCHours();
  return mapConfig.rotationHours?.includes(currentHour) ?? false;
}

export type MapType = z.infer<typeof MapSchema>;
export type DifficultyType = z.infer<typeof DifficultySchema>;
export type RankedStatusType = z.infer<typeof RankedStatusSchema>;
export type ObjectiveTypeType = z.infer<typeof ObjectiveTypeSchema>;
export type LoadoutTypeType = z.infer<typeof LoadoutTypeSchema>;
export type ClassTypeType = (typeof ClassTypeSchema.options)[number];
export type LFGCreateParams = z.infer<typeof lfgCreateParamsSchema>;
export type LFGSchema = z.infer<typeof lfgSchema>;
