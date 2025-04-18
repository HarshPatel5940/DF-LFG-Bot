import type { LFGCreateParams, LFGSchema } from "../types/lfg";
import type { LFGConfig } from "../types/lfgConfig";
import { lfgSchema } from "../types/lfg"; // Import Zod schema for validation/defaults

export class LFGService {
  private static _instance: LFGService;
  // In-memory storage (replace with database later)
  private lfgs: Map<string, LFGSchema>;
  private guildConfigs: Map<string, LFGConfig>;

  private constructor() {
    this.lfgs = new Map<string, LFGSchema>();
    this.guildConfigs = new Map<string, LFGConfig>();
    console.log("[LFG DEBUG] LFGService initialized (In-Memory)");
    // TODO: Load initial data from DB if applicable
  }

  public static get instance(): LFGService {
    if (!LFGService._instance) {
      LFGService._instance = new LFGService();
    }
    return LFGService._instance;
  }

  // --- LFG Getters ---

  public async getLFGById(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Getting LFG with ID: ${id}`);
    return this.lfgs.get(id);
  }

  public async getLFGsByStatus(
    guildId: string, // Filter by guild
    status: "active" | "closed"
  ): Promise<LFGSchema[]> {
    console.log(
      `[LFG DEBUG] Getting LFGs for guild ${guildId} with status: ${status}`
    );
    return Array.from(this.lfgs.values()).filter(
      (lfg) => lfg.guildId === guildId && lfg.status === status
    );
  }

  public async getLFGsByOwnerId(
    guildId: string, // Filter by guild
    ownerId: string
  ): Promise<LFGSchema[]> {
    console.log(
      `[LFG DEBUG] Getting active LFGs for owner ${ownerId} in guild ${guildId}`
    );
    return Array.from(this.lfgs.values()).filter(
      (lfg) =>
        lfg.guildId === guildId &&
        lfg.ownerId === ownerId &&
        lfg.status === "active"
    );
  }

  // --- LFG Mutators ---

  public async createLFG(
    guildId: string, // Added guildId
    ownerId: string,
    ownerTag: string,
    params: LFGCreateParams
  ): Promise<LFGSchema> {
    console.log(
      `[LFG DEBUG] Creating LFG for owner ${ownerTag} in guild ${guildId}`
    );

    // Use Zod schema to parse, validate, and apply defaults
    const lfgData = lfgSchema.parse({
      guildId: guildId,
      ownerId: ownerId,
      ownerTag: ownerTag,
      map: params.map,
      difficulty: params.difficulty,
      rankedStatus: params.rankedStatus,
      objectiveType: params.objectiveType,
      loadoutType: params.loadoutType,
      neededClasses: params.neededClasses || [], // Ensure array
      // Zod schema applies defaults for id, createdAt, updatedAt, mode, squadSize, microphone, members, status
      members: [{ id: ownerId, tag: ownerTag, joinedAt: new Date() }], // Explicitly set initial member with date
    });

    // Generate a simple ID (Zod default might be complex if ulid isn't installed)
    // const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    // lfgData.id = id; // Overwrite Zod default if needed

    this.lfgs.set(lfgData.id, lfgData);
    console.log(`[LFG DEBUG] LFG created with ID: ${lfgData.id}`);
    // TODO: Save to DB
    return lfgData;
  }

  public async updateLFG(
    id: string,
    updates: Partial<LFGSchema> // Use Partial<LFGSchema> for flexibility
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Updating LFG with ID: ${id}`);

    const lfg = this.lfgs.get(id);
    if (!lfg) {
      console.warn(`[LFG Update] LFG ${id} not found for update.`);
      return undefined;
    }

    // Merge updates and set updatedAt timestamp
    const updatedLFG = {
      ...lfg,
      ...updates,
      updatedAt: new Date(), // Update timestamp on every change
    };

    // Optional: Validate the updated object against the schema
    try {
      lfgSchema.parse(updatedLFG);
    } catch (validationError) {
      console.error(
        `[LFG Update] Validation failed for LFG ${id}:`,
        validationError
      );
      return undefined; // Don't save invalid data
    }

    this.lfgs.set(id, updatedLFG);
    // TODO: Save to DB
    return updatedLFG;
  }

  public async closeLFG(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Closing LFG with ID: ${id}`);

    const lfg = this.lfgs.get(id);
    if (!lfg) {
      console.warn(`[LFG Close] LFG ${id} not found.`);
      return undefined;
    }
    if (lfg.status === "closed") {
      console.log(`[LFG Close] LFG ${id} already closed.`);
      return lfg; // Return existing closed LFG
    }

    const updatedLFG: LFGSchema = {
      ...lfg,
      status: "closed",
      closedAt: new Date(),
      updatedAt: new Date(),
    };
    this.lfgs.set(id, updatedLFG);
    console.log(`[LFG DEBUG] LFG ${id} marked as closed.`);
    // TODO: Save to DB
    return updatedLFG;
  }

  // --- Squad Management ---

  public async joinSquad(
    lfgId: string,
    userId: string,
    userTag: string,
    guildId?: string // Optional guildId for context
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] User ${userTag} joining LFG: ${lfgId}`);

    const lfg = this.lfgs.get(lfgId);
    // Basic validation
    if (!lfg || lfg.status !== "active") {
      console.warn(`[LFG Join] LFG ${lfgId} not found or inactive.`);
      return undefined;
    }
    if (lfg.members.some((m) => m.id === userId)) {
      console.log(`[LFG Join] User ${userId} already in LFG ${lfgId}.`);
      return lfg; // Already in squad
    }
    if (lfg.members.length >= lfg.squadSize) {
      console.warn(`[LFG Join] LFG ${lfgId} is full.`);
      return undefined; // Squad full
    }

    // Add member
    const updatedMembers = [
      ...lfg.members,
      { id: userId, tag: userTag, joinedAt: new Date() },
    ];
    const updatedLFG = {
      ...lfg,
      members: updatedMembers,
      updatedAt: new Date(),
      // Ensure guildId is set if provided
      ...(guildId && !lfg.guildId && { guildId: guildId }),
    };

    // Validate and save
    try {
      lfgSchema.parse(updatedLFG);
      this.lfgs.set(lfgId, updatedLFG);
      console.log(
        `[LFG DEBUG] User ${userId} added to LFG ${lfgId}. Members: ${updatedMembers.length}/${lfg.squadSize}`
      );
      // TODO: Save to DB
      return updatedLFG;
    } catch (validationError) {
      console.error(
        `[LFG Join] Validation failed for LFG ${lfgId}:`,
        validationError
      );
      return undefined;
    }
  }

  public async leaveSquad(
    lfgId: string,
    userId: string
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] User ${userId} leaving LFG: ${lfgId}`);

    const lfg = this.lfgs.get(lfgId);
    // Basic validation
    if (!lfg || lfg.status !== "active") {
      console.warn(`[LFG Leave] LFG ${lfgId} not found or inactive.`);
      return undefined;
    }
    if (!lfg.members.some((m) => m.id === userId)) {
      console.log(`[LFG Leave] User ${userId} not in LFG ${lfgId}.`);
      return lfg; // Not in squad
    }
    // Owner cannot leave via this method, must use close
    if (lfg.ownerId === userId) {
      console.warn(
        `[LFG Leave] Owner ${userId} attempted to leave LFG ${lfgId}. Use close instead.`
      );
      return undefined;
    }

    // Remove member
    const updatedMembers = lfg.members.filter((m) => m.id !== userId);
    const updatedLFG = {
      ...lfg,
      members: updatedMembers,
      updatedAt: new Date(),
    };

    // Validate and save
    try {
      lfgSchema.parse(updatedLFG);
      this.lfgs.set(lfgId, updatedLFG);
      console.log(
        `[LFG DEBUG] User ${userId} removed from LFG ${lfgId}. Members: ${updatedMembers.length}/${lfg.squadSize}`
      );
      // TODO: Save to DB
      return updatedLFG;
    } catch (validationError) {
      console.error(
        `[LFG Leave] Validation failed for LFG ${lfgId}:`,
        validationError
      );
      return undefined;
    }
  }

  // --- Guild Configuration ---

  public async saveGuildConfig(config: LFGConfig): Promise<void> {
    console.log(`[LFG DEBUG] Saving guild config for guild: ${config.guildId}`);
    // Validate config using Zod schema if available (import LFGConfigSchema)
    // LFGConfigSchema.parse(config);
    this.guildConfigs.set(config.guildId, config);
    // TODO: Save to DB
  }

  public async getGuildConfig(guildId: string): Promise<LFGConfig | undefined> {
    console.log(`[LFG DEBUG] Getting guild config for guild: ${guildId}`);
    // TODO: Load from DB if not in memory
    return this.guildConfigs.get(guildId);
  }
}
