import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { LFGService } from "../services/lfgService";
import { createInitialLFGSelectionMenus } from "../events/handleLFGInteractions";
import type { Command } from "../interface";

export default {
  data: new SlashCommandBuilder()
    .setName("lfg")
    .setDescription("Manage Looking For Group requests")
    .addSubcommand((subcommand) =>
      subcommand.setName("create").setDescription("Create a new LFG request")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close your active LFG request")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      console.log(
        `[LFG DEBUG] Executing LFG command: ${interaction.options.getSubcommand()}`
      );

      if (interaction.options.getSubcommand() === "create") {
        // Check if user already has an active LFG request
        const lfgService = LFGService.instance;
        const activeLFGs = await lfgService.getLFGsByStatus("active");
        const existingLFG = activeLFGs.find(
          (lfg) => lfg.ownerId === interaction.user.id
        );

        if (existingLFG) {
          // User already has an active LFG request
          const closeButton = [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4,
                  label: "Close Existing LFG",
                  custom_id: `lfg-close-existing-${existingLFG.id}`,
                },
              ],
            },
          ];

          await interaction.reply({
            content:
              "You already have an active LFG request. Please close it before creating a new one.",
            components: closeButton,
            ephemeral: true,
          });
          return;
        }

        // Start the LFG creation process
        const initialComponents = createInitialLFGSelectionMenus();

        await interaction.reply({
          content:
            "Step 1/3: Select a map, difficulty, and ranked status for your LFG request:",
          components: initialComponents,
          ephemeral: true,
        });
      } else if (interaction.options.getSubcommand() === "close") {
        // Handle close subcommand
        const lfgService = LFGService.instance;
        const activeLFGs = await lfgService.getLFGsByStatus("active");
        const existingLFG = activeLFGs.find(
          (lfg) => lfg.ownerId === interaction.user.id
        );

        if (!existingLFG) {
          await interaction.reply({
            content: "You don't have any active LFG requests to close.",
            ephemeral: true,
          });
          return;
        }

        // Create confirmation buttons
        const confirmButtons = [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: "Confirm Close",
                custom_id: `lfg-close-confirm-${existingLFG.id}`,
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

        await interaction.reply({
          content: `Are you sure you want to close your LFG request for ${existingLFG.map} (${existingLFG.difficulty})?`,
          components: confirmButtons,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error executing LFG command:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content:
            "An error occurred while processing your command. Please try again.",
          ephemeral: true,
        });
      }
    }
  },
} as Command;
