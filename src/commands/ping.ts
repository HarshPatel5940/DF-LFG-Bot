import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../interface";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setDMPermission(false),

  async execute(interaction) {
    const message = await interaction.reply({
      content: "Pong!",
      withResponse: true,
    });
    await interaction.editReply(
      `Pong! Latency is ${Math.abs(Date.now() - message.interaction.createdTimestamp)}ms.`,
    );
  },
} as Command;
