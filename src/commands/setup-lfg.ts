import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../interface";
import { LFGService } from "../services/lfgService";
import { LFGConfigSchema } from "../types/lfgConfig";

export default {
  data: new SlashCommandBuilder()
    .setName("setup-lfg")
    .setDescription("Configure the LFG system for your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName("announcement-channel")
        .setDescription("Channel where LFG announcements will be posted")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    )
    .addChannelOption(option =>
      option
        .setName("voice-category")
        .setDescription("Category where LFG voice channels will be created")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addRoleOption(option =>
      option
        .setName("ping-role")
        .setDescription("Role to ping for LFG announcements (optional)")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const announcementChannel = interaction.options.getChannel(
      "announcement-channel",
      true,
    );
    const voiceCategory = interaction.options.getChannel(
      "voice-category",
      true,
    );
    const pingRole = interaction.options.getRole("ping-role");

    try {
      const lfgService = LFGService.instance;

      const config = LFGConfigSchema.parse({
        guildId: interaction.guildId,
        announcementChannelId: announcementChannel.id,
        voiceCategoryId: voiceCategory.id,
        pingRoleId: pingRole?.id,
      });

      await lfgService.saveGuildConfig(config);

      await interaction.reply({
        content: `✅ LFG system has been configured successfully!\n\nAnnouncement Channel: <#${
          announcementChannel.id
        }>\nVoice Category: ${voiceCategory.name}\n${
          pingRole ? `Ping Role: <@&${pingRole.id}>` : "No ping role set"
        }`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error saving LFG configuration:", error);
      await interaction.reply({
        content:
          "An error occurred while saving the LFG configuration. Please try again.",
        ephemeral: true,
      });
    }
  },
} as Command;
