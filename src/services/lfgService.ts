import type { Collection } from "mongodb";
import type { LFGCreateParams, LFGSchema } from "../types/lfg";
import { lfgSchema } from "../types/lfg";
import type { LFGConfigType } from "../types/lfgConfig";
import { LFGConfigSchema } from "../types/lfgConfig";
import getDb from "../utils/database";
import db from "../utils/database";

const LFG_COLLECTION = "lfg";
const GUILD_CONFIG_COLLECTION = "lfgConfigs";

export class LFGService {
  private static _instance: LFGService;

  private lfgs: Map<string, LFGSchema>;
  private guildConfigs: Map<string, LFGConfigType>;
  private lfgCollection: Collection<LFGSchema> | null = null;
  private guildConfigCollection: Collection<LFGConfigType> | null = null;

  private constructor() {
    this.lfgs = new Map<string, LFGSchema>();
    this.guildConfigs = new Map<string, LFGConfigType>();
    console.log("[LFG DEBUG] LFGService initializing...");
    this.initializeDbCollections();
  }

  private async initializeDbCollections() {
    try {
      const db = await getDb();
      this.lfgCollection = db.collection<LFGSchema>(LFG_COLLECTION);
      this.guildConfigCollection = db.collection<LFGConfigType>(
        GUILD_CONFIG_COLLECTION,
      );
      console.log("[LFG DEBUG] Database collections initialized.");
    } catch (error) {
      console.error(
        "[LFG ERROR] Failed to initialize database collections:",
        error,
      );
    }
  }

  private async loadAllGuildConfigsToCache() {
    if (!this.guildConfigCollection) {
      console.warn(
        "[LFG Cache] Guild config collection not available for pre-loading.",
      );
      return;
    }
    try {
      const configs = await this.guildConfigCollection.find().toArray();
      for (const config of configs) {
        try {
          const validatedConfig = LFGConfigSchema.parse(config);
          this.guildConfigs.set(validatedConfig.guildId, validatedConfig);
        } catch (validationError) {
          console.error(
            `[LFG Cache] Invalid config found in DB for guild ${config.guildId}:`,
            validationError,
          );
        }
      }
      console.log(
        `[LFG DEBUG] Pre-loaded ${this.guildConfigs.size} guild configs into cache.`,
      );
    } catch (error) {
      console.error(
        "[LFG ERROR] Failed to load guild configs into cache:",
        error,
      );
    }
  }

  public static get instance(): LFGService {
    if (!LFGService._instance) {
      LFGService._instance = new LFGService();
    }
    return LFGService._instance;
  }

  public async getLFGById(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Getting LFG with ID: ${id}`);

    const lfg = this.lfgs.get(id);
    if (lfg) {
      console.log(`[LFG DEBUG] LFG ${id} found in cache.`);
      return lfg;
    }

    if (!this.lfgCollection) {
      console.error(
        "[LFG ERROR] LFG collection not initialized for getLFGById.",
      );
      return undefined;
    }
    try {
      console.log(`[LFG DEBUG] LFG ${id} not in cache, querying DB...`);

      const lfgFromDb = await this.lfgCollection.findOne({ id: id });
      if (lfgFromDb) {
        console.log(`[LFG DEBUG] LFG ${id} found in DB.`);

        const validatedLfg = lfgSchema.parse(lfgFromDb);
        this.lfgs.set(validatedLfg.id, validatedLfg);
        return validatedLfg;
      }
      console.log(`[LFG DEBUG] LFG ${id} not found in DB.`);
      return undefined;
    } catch (error) {
      console.error(`[LFG ERROR] Error fetching LFG ${id} from DB:`, error);
      return undefined;
    }
  }

  public async getLFGsByStatus(
    guildId: string,
    status: "active" | "closed",
  ): Promise<LFGSchema[]> {
    console.log(
      `[LFG DEBUG] Getting LFGs for guild ${guildId} with status: ${status}`,
    );
    if (!this.lfgCollection) {
      console.error(
        "[LFG ERROR] LFG collection not initialized for getLFGsByStatus.",
      );
      return [];
    }
    try {
      const lfgsFromDb = await this.lfgCollection
        .find({ guildId: guildId, status: status })
        .toArray();

      const validatedLfgs = lfgsFromDb.map(lfg => lfgSchema.parse(lfg));

      for (const lfg of validatedLfgs) {
        this.lfgs.set(lfg.id, lfg);
      }
      return validatedLfgs;
    } catch (error) {
      console.error(
        "[LFG ERROR] Error fetching LFGs by status from DB:",
        error,
      );
      return [];
    }
  }

  public async getLFGsByOwnerId(
    guildId: string,
    ownerId: string,
  ): Promise<LFGSchema[]> {
    console.log(
      `[LFG DEBUG] Getting active LFGs for owner ${ownerId} in guild ${guildId}`,
    );
    if (!this.lfgCollection) {
      console.error(
        "[LFG ERROR] LFG collection not initialized for getLFGsByOwnerId.",
      );
      return [];
    }
    try {
      const lfgsFromDb = await this.lfgCollection
        .find({ guildId: guildId, ownerId: ownerId, status: "active" })
        .toArray();

      const validatedLfgs = lfgsFromDb.map(lfg => lfgSchema.parse(lfg));

      return validatedLfgs;
    } catch (error) {
      console.error("[LFG ERROR] Error fetching LFGs by owner from DB:", error);
      return [];
    }
  }

  public async createLFG(
    guildId: string,
    ownerId: string,
    ownerTag: string,
    params: LFGCreateParams,
  ): Promise<LFGSchema> {
    console.log(
      `[LFG DEBUG] Creating LFG for owner ${ownerTag} in guild ${guildId}`,
    );

    const lfgData = lfgSchema.parse({
      guildId: guildId,
      ownerId: ownerId,
      ownerTag: ownerTag,
      map: params.map,
      difficulty: params.difficulty,
      rankedStatus: params.rankedStatus,
      objectiveType: params.objectiveType,
      loadoutType: params.loadoutType,
      neededClasses: params.neededClasses || [],
    });

    if (!this.lfgCollection) {
      console.error(
        "[LFG ERROR] LFG collection not initialized for createLFG.",
      );

      throw new Error("LFG Database collection is not available.");
    }
    try {
      await this.lfgCollection.insertOne(lfgData);
      console.log(`[LFG DEBUG] LFG ${lfgData.id} saved to DB.`);
    } catch (error) {
      console.error(
        `[LFG ERROR] Failed to save LFG ${lfgData.id} to DB:`,
        error,
      );

      throw error;
    }

    this.lfgs.set(lfgData.id, lfgData);
    console.log(`[LFG DEBUG] LFG created with ID: ${lfgData.id}`);
    return lfgData;
  }

  public async updateLFG(
    id: string,
    updates: Partial<
      Omit<LFGSchema, "id" | "guildId" | "ownerId" | "createdAt">
    >,
  ): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Updating LFG with ID: ${id}`);

    const currentLFG = await this.getLFGById(id);
    if (!currentLFG) {
      console.warn(`[LFG Update] LFG ${id} not found for update.`);
      return undefined;
    }

    const updatedData = {
      ...currentLFG,
      ...updates,
      updatedAt: new Date(),
    };

    let validatedLFG: LFGSchema;
    try {
      validatedLFG = lfgSchema.parse(updatedData);
    } catch (validationError) {
      console.error(
        `[LFG Update] Validation failed for LFG ${id}:`,
        validationError,
      );
      return undefined;
    }

    if (!this.lfgCollection) {
      console.error(
        "[LFG ERROR] LFG collection not initialized for updateLFG.",
      );
      return undefined;
    }
    try {
      const result = await this.lfgCollection.updateOne(
        { id: id },
        { $set: { ...updates, updatedAt: validatedLFG.updatedAt } },
      );
      if (result.matchedCount === 0) {
        console.warn(
          `[LFG Update] LFG ${id} not found in DB during update operation.`,
        );

        this.lfgs.delete(id);
        return undefined;
      }
      console.log(`[LFG DEBUG] LFG ${id} updated in DB.`);
    } catch (error) {
      console.error(`[LFG ERROR] Failed to update LFG ${id} in DB:`, error);
      return undefined;
    }

    this.lfgs.set(id, validatedLFG);
    return validatedLFG;
  }

  public async closeLFG(id: string): Promise<LFGSchema | undefined> {
    console.log(`[LFG DEBUG] Closing LFG with ID: ${id}`);

    const lfg = await this.getLFGById(id);
    if (!lfg) {
      console.warn(`[LFG Close] LFG ${id} not found.`);
      return undefined;
    }
    if (lfg.status === "closed") {
      console.log(`[LFG Close] LFG ${id} already closed.`);
      return lfg;
    }

    const updates = {
      status: "closed" as const,
      closedAt: new Date(),
    };

    return this.updateLFG(id, updates);
  }

  public async saveGuildConfig(config: LFGConfigType): Promise<void> {
    console.log(`[LFG DEBUG] Saving guild config for guild: ${config.guildId}`);

    let validatedConfig: LFGConfigType;
    try {
      validatedConfig = LFGConfigSchema.parse(config);
    } catch (validationError) {
      console.error(
        `[LFG Config Save] Invalid config data provided for guild ${config.guildId}:`,
        validationError,
      );
      throw validationError;
    }

    if (!this.guildConfigCollection) {
      console.error(
        "[LFG ERROR] Guild config collection not initialized for saveGuildConfig.",
      );
      throw new Error("Guild Config Database collection is not available.");
    }
    try {
      await this.guildConfigCollection.updateOne(
        { guildId: validatedConfig.guildId },
        { $set: validatedConfig, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      console.log(
        `[LFG DEBUG] Guild config for ${validatedConfig.guildId} saved to DB.`,
      );
    } catch (error) {
      console.error(
        `[LFG ERROR] Failed to save guild config for ${validatedConfig.guildId} to DB:`,
        error,
      );
      throw error;
    }

    this.guildConfigs.set(validatedConfig.guildId, validatedConfig);
  }

  public async getGuildConfig(guildId: string): Promise<LFGConfigType | null> {
    console.log(`[LFG DEBUG] Getting guild config for guild: ${guildId}`);

    const cachedConfig = this.guildConfigs.get(guildId);
    if (cachedConfig) {
      console.log(`[LFG DEBUG] Guild config for ${guildId} found in cache.`);
      return cachedConfig;
    }

    if (!this.guildConfigCollection) {
      console.error(
        "[LFG ERROR] Guild config collection not initialized for getGuildConfig.",
      );
      return null;
    }
    try {
      const result = await (await db())
        .collection<LFGConfigType>("lfgConfigs")
        .findOne({ guildId: guildId });

      if (result) {
        return result;
      }

      console.log(`[LFG DEBUG] Guild config for ${guildId} not found in DB.`);
      return null;
    } catch (error) {
      console.error(
        `[LFG ERROR] Error fetching guild config for ${guildId} from DB:`,
        error,
      );
      return null;
    }
  }
}
