import { z } from "zod";

export const LFGConfigSchema = z.object({
  guildId: z.string(),
  announcementChannelId: z.string(),
  voiceCategoryId: z.string(),
  pingRoleId: z.string().optional().nullable(),
});

export type LFGConfigType = z.infer<typeof LFGConfigSchema>;
