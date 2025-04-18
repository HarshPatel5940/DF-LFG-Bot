import type { LFGCreateParams, LFGSchema } from "../types/lfg";
import type { LFGConfig } from "../types/lfgConfig";

export class LFGService {
  private static _instance: LFGService;
  private lfgs: Map<string, LFGSchema>;
  private guildConfigs: Map<string, LFGConfig>;

  private constructor() {
    this.lfgs = new Map<string, LFGSchema>();
    this.guildConfigs = new Map<string, LFGConfig>();
    console.log("[LFG DEBUG] LFGService initialized");
  }

  public static get instance(): LFGService {
    if (!LFGService._instance) {
      LFGService._instance = new LFGService();
    }
    return LFGService._instance;
  }

  public async getLFGById(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Getting LFG with ID: ${id}`);
    return this.lfgs.get(id);
  }

  public async getLFGsByStatus(
    status: "active" | "closed"
  ): Promise<LFGSchema[]> {
    console.log(`[LFG DEBUG] Getting LFGs with status: ${status}`);
    return Array.from(this.lfgs.values()).filter(
      (lfg) => lfg.status === status
    );
  }

  public async createLFG(
    ownerId: string,
    ownerTag: string,
    params: LFGCreateParams
  ): Promise<LFGSchema> {
    console.log(`[LFG DEBUG] Creating LFG for owner: ${ownerTag}`);

    // Generate a simple ID without requiring uuid package
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 9);

    const lfg: LFGSchema = {
      id,
      ownerId,
      createdAt: new Date().toISOString(),
      status: "active",
      mode: "Dark Frontier",
      map: params.map,
      difficulty: params.difficulty,
      rankedStatus: params.rankedStatus,
      objectiveType: params.objectiveType,
      loadoutType: params.loadoutType,
      neededClasses: params.neededClasses || [],
      squadSize: 4, // Default squad size
      members: [{ id: ownerId, tag: ownerTag }],
      voiceChannelId: null,
      announcementChannelId: null,
      announcementMessageId: null,
    };

    this.lfgs.set(id, lfg);
    return lfg;
  }

  public async updateLFG(
    id: string,
    updates: Partial<LFGSchema>
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Updating LFG with ID: ${id}`);

    const lfg = this.lfgs.get(id);
    if (!lfg) return undefined;

    const updatedLFG = { ...lfg, ...updates };
    this.lfgs.set(id, updatedLFG);
    return updatedLFG;
  }

  public async closeLFG(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Closing LFG with ID: ${id}`);

    const lfg = this.lfgs.get(id);
    if (!lfg) return undefined;

    const updatedLFG = { ...lfg, status: "closed" as const };
    this.lfgs.set(id, updatedLFG);
    return updatedLFG;
  }

  public async joinSquad(
    lfgId: string,
    userId: string,
    userTag: string
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] User ${userTag} joining LFG: ${lfgId}`);

    const lfg = this.lfgs.get(lfgId);
    if (!lfg || lfg.status !== "active") return undefined;
    if (lfg.members.some((m) => m.id === userId)) return lfg;
    if (lfg.members.length >= lfg.squadSize) return undefined;

    const updatedMembers = [...lfg.members, { id: userId, tag: userTag }];
    const updatedLFG = { ...lfg, members: updatedMembers };
    this.lfgs.set(lfgId, updatedLFG);
    return updatedLFG;
  }

  public async leaveSquad(
    lfgId: string,
    userId: string
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] User ${userId} leaving LFG: ${lfgId}`);

    const lfg = this.lfgs.get(lfgId);
    if (!lfg || lfg.status !== "active") return undefined;
    if (!lfg.members.some((m) => m.id === userId)) return lfg;
    if (lfg.ownerId === userId) return undefined; // Owner can't leave, must close

    const updatedMembers = lfg.members.filter((m) => m.id !== userId);
    const updatedLFG = { ...lfg, members: updatedMembers };
    this.lfgs.set(lfgId, updatedLFG);
    return updatedLFG;
  }

  public async saveGuildConfig(config: LFGConfig): Promise<void> {
    console.log(`[LFG DEBUG] Saving guild config for guild: ${config.guildId}`);
    this.guildConfigs.set(config.guildId, config);
  }

  public async getGuildConfig(guildId: string): Promise<LFGConfig | undefined> {
    return this.guildConfigs.get(guildId);
  }
}
