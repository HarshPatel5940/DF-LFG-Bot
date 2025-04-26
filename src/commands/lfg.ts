import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { Command } from "../interface";
import { LFGService } from "../services/lfgService";
import {
  DifficultySchema,
  MAP_AVAILABILITY,
  MapSchema,
  RankedStatusSchema,
} from "../types/lfg";

export default {
  data: new SlashCommandBuilder()
    .setName("lfg")
    .setDescription("Manage Looking For Group requests")
    .addSubcommand((subcommand) =>
      subcommand.setName("create").setDescription("Create a new LFG request"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close your active LFG request"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rotation")
        .setDescription("View current map rotation information"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      console.log(
        `[LFG DEBUG] Executing LFG command: ${interaction.options.getSubcommand()}`,
      );

      if (interaction.options.getSubcommand() === "create") {
        await interaction.deferReply({ ephemeral: true });
      }

      if (interaction.options.getSubcommand() === "create") {
        const lfgService = LFGService.instance;

        if (!interaction.guildId) {
          await interaction.editReply({
            content: "Error: This command must be used in a server.",
            components: [],
          });
          return;
        }

        const activeLFGs = await lfgService.getLFGsByOwnerId(
          interaction.guildId,
          interaction.user.id,
        );

        if (activeLFGs.length > 0) {
          await interaction.editReply({
            content:
              "You already have an active LFG request. Please close it before creating a new one. Use `/lfg close` to close your current request.",
          });
          return;
        }

        const currentHour = new Date().getUTCHours();

        const availableMaps = MapSchema.options.filter((mapName) =>
          MAP_AVAILABILITY.some(
            (m) =>
              m.map === mapName &&
              (m.isPermanent || m.rotationHours?.includes(currentHour)),
          ),
        );

        const mapOptions = availableMaps.map((map) => {
          const isPermanent = MAP_AVAILABILITY.some(
            (m) => m.map === map && m.isPermanent,
          );

          return new StringSelectMenuOptionBuilder()
            .setLabel(map)
            .setValue(map)
            .setDescription(isPermanent ? "Permanent Map" : "Rotating Map");
        });

        const mapSelectMenu = new StringSelectMenuBuilder()
          .setCustomId("lfg-map-select")
          .setPlaceholder("Select a map")
          .addOptions(mapOptions);
        const mapRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            mapSelectMenu,
          );

        const difficultyOptions = DifficultySchema.options.map((difficulty) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(difficulty)
            .setValue(difficulty),
        );
        const difficultySelectMenu = new StringSelectMenuBuilder()
          .setCustomId("lfg-difficulty-select")
          .setPlaceholder("Select difficulty")
          .addOptions(difficultyOptions);
        const difficultyRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            difficultySelectMenu,
          );

        const rankedOptions = RankedStatusSchema.options.map((status) =>
          new StringSelectMenuOptionBuilder().setLabel(status).setValue(status),
        );
        const rankedSelectMenu = new StringSelectMenuBuilder()
          .setCustomId("lfg-ranked-select")
          .setPlaceholder("Select ranked status")
          .addOptions(rankedOptions);
        const rankedRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            rankedSelectMenu,
          );

        try {
          await interaction.editReply({
            content: "Step 1/2: Select Map, Difficulty, and Ranked Status.",
            components: [mapRow, difficultyRow, rankedRow],
          });
          console.log(
            "[LFG DEBUG] Successfully sent first 3 selection menus to user",
          );
        } catch (err) {
          console.error(
            "[LFG ERROR] Failed to send initial selection menus:",
            err,
          );

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content:
                "An error occurred while creating the LFG menu. Please try again.",
              ephemeral: true,
            });
          } else if (!interaction.replied) {
            await interaction.followUp({
              content:
                "An error occurred while creating the LFG menu. Please try again.",
              ephemeral: true,
            });
          }
        }
      } else if (interaction.options.getSubcommand() === "rotation") {
        const currentHour = new Date().getUTCHours();
        const nextHour = (currentHour + 1) % 24;

        const currentMaps = MAP_AVAILABILITY.filter(
          (m) => m.isPermanent || m.rotationHours?.includes(currentHour),
        ).map(
          (m) =>
            `- ${m.map} (${m.difficulty})${m.isPermanent ? " (Permanent)" : ""}`,
        );

        const nextMaps = MAP_AVAILABILITY.filter(
          (m) => m.isPermanent || m.rotationHours?.includes(nextHour),
        )
          .filter((m) => !m.isPermanent)
          .map((m) => `- ${m.map} (${m.difficulty})`);

        const rotationInfo = [
          `**Current UTC time:** ${currentHour}:00-${nextHour}:00`,
          "",
          "**Currently Available Maps:**",
          ...currentMaps,
          "",
          "**Coming Up Next Hour:**",
          nextMaps.length > 0
            ? nextMaps.join("\n")
            : "No rotation changes next hour",
        ].join("\n");

        await interaction.reply({
          content: rotationInfo,
          ephemeral: true,
        });
      } else if (interaction.options.getSubcommand() === "close") {
        if (!interaction.deferred) {
          await interaction.deferReply({ ephemeral: true });
        }

        const lfgService = LFGService.instance;

        if (!interaction.guildId) {
          await interaction.editReply({
            content: "Error: This command must be used in a server.",
            components: [],
          });
          return;
        }

        const activeLFGs = await lfgService.getLFGsByOwnerId(
          interaction.guildId,
          interaction.user.id,
        );

        if (activeLFGs.length === 0) {
          await interaction.editReply({
            content: "You don't have any active LFG requests to close.",
          });
          return;
        }

        const confirmButtons = [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: "Confirm Close",
                custom_id: `lfg-close-confirm-${activeLFGs[0]?.id}`,
              },
              {
                type: 2,
                style: 2,
                label: "Cancel",
                custom_id: "lfg-close-cancel",
              },
            ],
          },
        ];

        await interaction.editReply({
          content: `Are you sure you want to close your LFG request for ${activeLFGs[0]?.map} (${activeLFGs[0]?.difficulty})?`,
          components: confirmButtons,
        });
      }
    } catch (error) {
      console.error("Error executing LFG command:", error);

      if (interaction.deferred && !interaction.replied) {
        await interaction.followUp({
          content:
            "An error occurred while processing your command. Please try again.",
          ephemeral: true,
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content:
            "An error occurred while processing your command. Please try again.",
          ephemeral: true,
        });
      }
    }
  },
} as Command;
