import {
  type Collection,
  Events,
  type Interaction,
  type Client,
} from "discord.js";
import type { Command } from "../interface";
import handleLFGInteractions from "./handleLFGInteractions";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(
    interaction: Interaction,
    commands: Collection<string, Command>,
    client: Client // Properly typed as Client
  ) {
    try {
      // First, check if this is an LFG-related interaction
      if (
        (interaction.isButton() && interaction.customId.startsWith("lfg-")) ||
        (interaction.isStringSelectMenu() &&
          interaction.customId.startsWith("lfg-"))
      ) {
        console.log(
          `[LFG DEBUG] Delegating interaction to LFG handler: ${interaction.id}`
        );
        return await handleLFGInteractions.execute(interaction, client);
      }

      // Handle commands
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          console.log("Command not found here", commands);
          await interaction.reply({
            content: "Command not found",
            ephemeral: true,
          });
          return;
        }

        try {
          await command.execute(interaction);
        } catch (err) {
          console.error(err);
          if (!interaction.replied) {
            await interaction.reply({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          }
        }
      } else if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          console.log("Command not found here", commands);
          return;
        }
        try {
          if (!command.autocomplete) {
            console.error("Autocomplete not implemented for this command");
            return;
          }
          await command.autocomplete(interaction);
        } catch (err) {
          console.error(err);
        }
      }
    } catch (error) {
      console.error("Error in interaction handler:", error);
    }
  },
};
