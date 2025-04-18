import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonInteraction,
  type Client,
  type Interaction,
  type StringSelectMenuInteraction,
  type TextChannel,
  type CategoryChannel,
  DiscordAPIError,
  RESTJSONErrorCodes,
} from "discord.js";
import { LFGService } from "../services/lfgService";
import {
  ClassTypeSchema,
  DifficultySchema,
  LoadoutTypeSchema,
  MapSchema,
  ObjectiveTypeSchema,
  RankedStatusSchema,
  type DifficultyType,
  type LFGCreateParams,
  type LFGSchema,
  type LoadoutTypeType,
  type MapType,
  type ObjectiveTypeType,
  type RankedStatusType,
  type ClassTypeType,
} from "../types/lfg";
import type { LFGConfig } from "../types/lfgConfig";

const userSelections = new Map<string, Partial<LFGCreateParams>>();

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction, client: Client) {
    if (!interaction.guild) return;

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("lfg-close-existing-")) {
        await handleCloseExistingLFG(
          interaction,
          interaction.customId.replace("lfg-close-existing-", "")
        );
      } else if (interaction.customId === "lfg-cancel-creation") {
        userSelections.delete(interaction.user.id);
        await interaction.update({
          content: "LFG creation cancelled.",
          components: [],
        });
      } else if (interaction.customId.startsWith("lfg-close-confirm-")) {
        await handleCloseConfirmLFG(
          interaction,
          interaction.customId.replace("lfg-close-confirm-", ""),
          client
        );
      } else if (interaction.customId === "lfg-close-cancel") {
        await interaction.update({
          content: "LFG closure cancelled.",
          components: [],
        });
      } else if (interaction.customId.startsWith("lfg-join-")) {
        await handleJoinLFG(
          interaction,
          interaction.customId.replace("lfg-join-", ""),
          client
        );
      } else if (interaction.customId.startsWith("lfg-leave-")) {
        await handleLeaveLFG(
          interaction,
          interaction.customId.replace("lfg-leave-", ""),
          client
        );
      } else if (interaction.customId === "lfg-create-confirm") {
        await handleConfirmCreateLFG(interaction, client);
      } else if (interaction.customId === "lfg-create-cancel") {
        userSelections.delete(interaction.user.id);
        await interaction.update({
          content: "LFG creation cancelled.",
          components: [],
        });
      }
    }

    if (interaction.isStringSelectMenu()) {
      const lfgCreateMenus = [
        "lfg-map-select",
        "lfg-difficulty-select",
        "lfg-ranked-select",
        "lfg-objective-select",
        "lfg-loadout-select",
        "lfg-classes-select",
      ];
      if (lfgCreateMenus.includes(interaction.customId)) {
        const userSelection = userSelections.get(interaction.user.id) || {};
        let updated = false;

        switch (interaction.customId) {
          case "lfg-map-select":
            userSelection.map = interaction.values[0] as MapType;
            updated = true;
            break;
          case "lfg-difficulty-select":
            userSelection.difficulty = interaction.values[0] as DifficultyType;
            updated = true;
            break;
          case "lfg-ranked-select":
            userSelection.rankedStatus = interaction
              .values[0] as RankedStatusType;
            updated = true;
            break;
          case "lfg-objective-select":
            userSelection.objectiveType = interaction
              .values[0] as ObjectiveTypeType;
            updated = true;
            break;
          case "lfg-loadout-select":
            userSelection.loadoutType = interaction
              .values[0] as LoadoutTypeType;
            updated = true;
            break;
          case "lfg-classes-select":
            userSelection.neededClasses = interaction.values.filter((cls) =>
              (ClassTypeSchema.options as ReadonlyArray<string>).includes(cls)
            ) as ClassTypeType[];
            updated = true;
            break;
        }

        if (updated) {
          userSelections.set(interaction.user.id, userSelection);
          await updateLFGCreateMessage(interaction, userSelection);
        }
      }
    }
  },
};

async function updateLFGCreateMessage(
  interaction: StringSelectMenuInteraction,
  userSelection: Partial<LFGCreateParams>
) {
  try {
    const {
      map,
      difficulty,
      rankedStatus,
      objectiveType,
      loadoutType,
      neededClasses,
    } = userSelection;

    const firstStepComplete = map && difficulty && rankedStatus;
    const allRequiredSelected =
      firstStepComplete && objectiveType && loadoutType;

    let content = "";
    const components = [];

    const selectionsSummary = `\nCurrent selections:\n- Map: ${
      map || "Not selected"
    }\n- Difficulty: ${difficulty || "Not selected"}\n- Ranked Status: ${
      rankedStatus || "Not selected"
    }${
      firstStepComplete
        ? `\n- Objective Type: ${
            objectiveType || "Not selected"
          }\n- Loadout Type: ${
            loadoutType || "Not selected"
          }\n- Needed Classes: ${
            neededClasses && neededClasses.length > 0
              ? neededClasses.join(", ")
              : "None"
          }`
        : ""
    }`;

    if (!firstStepComplete) {
      content = `Step 1/2: Select Map, Difficulty, and Ranked Status.${selectionsSummary}`;

      const mapOptions = MapSchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(map === opt)
      );
      const mapSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-map-select")
        .setPlaceholder(map ? `Selected: ${map}` : "Select a map")
        .addOptions(mapOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          mapSelectMenu
        )
      );

      const difficultyOptions = DifficultySchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(difficulty === opt)
      );
      const difficultySelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-difficulty-select")
        .setPlaceholder(
          difficulty ? `Selected: ${difficulty}` : "Select difficulty"
        )
        .addOptions(difficultyOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          difficultySelectMenu
        )
      );

      const rankedOptions = RankedStatusSchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(rankedStatus === opt)
      );
      const rankedSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-ranked-select")
        .setPlaceholder(
          rankedStatus ? `Selected: ${rankedStatus}` : "Select ranked status"
        )
        .addOptions(rankedOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          rankedSelectMenu
        )
      );
    } else {
      content = `Step 2/2: Select Objective, Loadout, and optionally Needed Classes.${selectionsSummary}`;

      const objectiveOptions = ObjectiveTypeSchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(objectiveType === opt)
      );
      const objectiveSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-objective-select")
        .setPlaceholder(
          objectiveType ? `Selected: ${objectiveType}` : "Select objective type"
        )
        .addOptions(objectiveOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          objectiveSelectMenu
        )
      );

      const loadoutOptions = LoadoutTypeSchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(loadoutType === opt)
      );
      const loadoutSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-loadout-select")
        .setPlaceholder(
          loadoutType ? `Selected: ${loadoutType}` : "Select loadout type"
        )
        .addOptions(loadoutOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          loadoutSelectMenu
        )
      );

      const classOptions = ClassTypeSchema.options.map((opt) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt)
          .setValue(opt)
          .setDefault(neededClasses?.includes(opt) ?? false)
      );
      const classSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("lfg-classes-select")
        .setPlaceholder(
          neededClasses && neededClasses.length > 0
            ? `Selected: ${neededClasses.join(", ")}`
            : "Select needed classes (up to 2)"
        )
        .setMinValues(0)
        .setMaxValues(2)
        .addOptions(classOptions);
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          classSelectMenu
        )
      );

      if (allRequiredSelected) {
        content = `Step 2/2: Review your selections and confirm.${selectionsSummary}`;
        const confirmButtons =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("lfg-create-confirm")
              .setLabel("Confirm & Create LFG")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("lfg-create-cancel")
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger)
          );
        components.push(confirmButtons);
      }
    }

    if (components.length > 5) {
      console.error(
        "[LFG ERROR] Attempted to send more than 5 action rows. This should not happen."
      );
    }

    await interaction.update({
      content: content,
      components: components.slice(0, 5),
    });
  } catch (err) {
    if (
      err instanceof DiscordAPIError &&
      (err.code === RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged ||
        err.code === 10062)
    ) {
      console.log(
        `[LFG DEBUG] Interaction already acknowledged (Code: ${err.code}). Likely double-click or race condition.`
      );
    } else {
      console.error("Error updating LFG create message:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "An error occurred while updating your selections.",
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.followUp({
            content: "An error occurred while updating your selections.",
            ephemeral: true,
          });
        }
      } catch (errorReplyErr) {
        console.error("Error sending error reply/followUp:", errorReplyErr);
      }
    }
  }
}

async function handleConfirmCreateLFG(
  interaction: ButtonInteraction,
  client: Client
) {
  if (!interaction.guildId || !interaction.guild) {
    const replyMethod =
      interaction.deferred || interaction.replied
        ? interaction.followUp
        : interaction.reply;
    await replyMethod
      .call(interaction, {
        content: "Error: This command can only be used in a server.",
        ephemeral: true,
        components: [],
      })
      .catch(console.error);
    return;
  }

  const selections = userSelections.get(interaction.user.id);

  if (
    !selections ||
    !selections.map ||
    !selections.difficulty ||
    !selections.rankedStatus ||
    !selections.objectiveType ||
    !selections.loadoutType
  ) {
    const replyMethod =
      interaction.deferred || interaction.replied
        ? interaction.followUp
        : interaction.reply;
    await replyMethod
      .call(interaction, {
        content:
          "Error: Some selections are missing. Please ensure all required dropdowns are selected.",
        ephemeral: true,
        components: [],
      })
      .catch(console.error);
    return;
  }

  if (!selections.neededClasses) {
    selections.neededClasses = [];
  }

  const lfgService = LFGService.instance;

  const config = await lfgService.getGuildConfig(interaction.guildId);
  if (!config) {
    const replyMethod =
      interaction.deferred || interaction.replied
        ? interaction.followUp
        : interaction.reply;
    await replyMethod
      .call(interaction, {
        content:
          "❌ Error: LFG system configuration not found for this server. An administrator needs to run `/setup-lfg` first.",
        ephemeral: true,
        components: [],
      })
      .catch(console.error);
    return;
  }

  try {
    const announcementChannel = await client.channels.fetch(
      config.announcementChannelId
    );
    if (!announcementChannel || !announcementChannel.isTextBased()) {
      throw new Error("Announcement channel not found or not text-based.");
    }
    const voiceCategory = await client.channels.fetch(config.voiceCategoryId);
    if (!voiceCategory || voiceCategory.type !== ChannelType.GuildCategory) {
      throw new Error("Voice category not found or not a category channel.");
    }
    if (config.pingRoleId) {
      await interaction.guild.roles.fetch(config.pingRoleId);
    }
  } catch (validationError: unknown) {
    const errorMessage =
      validationError instanceof Error
        ? validationError.message
        : String(validationError);
    console.error("LFG Config Validation Error:", validationError);
    const replyMethod =
      interaction.deferred || interaction.replied
        ? interaction.followUp
        : interaction.reply;
    await replyMethod
      .call(interaction, {
        content: `❌ Error: LFG configuration is invalid. Please check server settings or ask an admin to re-run \`/setup-lfg\`. Details: ${errorMessage}`,
        ephemeral: true,
        components: [],
      })
      .catch(console.error);
    return;
  }

  try {
    try {
      await interaction.update({
        content: "⏳ Creating your LFG request...",
        components: [],
      });
    } catch (updateError) {
      if (
        updateError instanceof DiscordAPIError &&
        updateError.code ===
          RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged
      ) {
        console.log(
          "[LFG Confirm] Interaction already acknowledged before update, proceeding."
        );
      } else {
        throw updateError;
      }
    }

    const lfg = await lfgService.createLFG(
      interaction.guildId,
      interaction.user.id,
      interaction.user.tag,
      selections as LFGCreateParams
    );

    const voiceChannel = await createVoiceChannel(
      interaction,
      lfg,
      client,
      config.voiceCategoryId
    );

    await sendLFGAnnouncement(
      interaction,
      lfg,
      client,
      config.announcementChannelId,
      config.pingRoleId
    );

    userSelections.delete(interaction.user.id);

    await interaction.followUp({
      content: `✅ Your LFG request has been created! ${
        voiceChannel ? `Voice channel <#${voiceChannel.id}> created.` : ""
      } An announcement has been sent to <#${
        config.announcementChannelId
      }>.\n\nUse \`/lfg close\` to close this request when you're done.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error creating LFG:", error);
    await interaction
      .followUp({
        content:
          "❌ An error occurred while creating your LFG request. Please try again.",
        ephemeral: true,
      })
      .catch(console.error);
  }
}

async function createVoiceChannel(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  lfg: LFGSchema,
  client: Client,
  voiceCategoryId?: string
) {
  if (!interaction.guild) return null;

  try {
    const membersNeeded = lfg.squadSize - lfg.members.length;
    const channelName = `🎮 ${lfg.map.replace(/\s+/g, "-")}-${
      lfg.difficulty
    }-LF${membersNeeded > 0 ? membersNeeded : "?"}`;

    let category: CategoryChannel | null = null;
    if (voiceCategoryId) {
      try {
        const fetchedChannel = await client.channels.fetch(voiceCategoryId);
        if (fetchedChannel?.type === ChannelType.GuildCategory) {
          category = fetchedChannel;
        } else {
          console.warn(
            `Configured voice category ID ${voiceCategoryId} is not a category channel.`
          );
        }
      } catch (fetchError) {
        console.error(
          `Could not fetch configured voice category ID ${voiceCategoryId}:`,
          fetchError
        );
      }
    }

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category?.id ?? null,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.DeafenMembers,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
      reason: `LFG created by ${interaction.user.tag} (ID: ${lfg.id})`,
    });

    console.log(
      `[LFG DEBUG] Created voice channel ${channel.name} (${
        channel.id
      }) under category ${category?.name ?? "None"}`
    );

    const lfgService = LFGService.instance;
    await lfgService.updateLFG(lfg.id, { voiceChannelId: channel.id });
    lfg.voiceChannelId = channel.id;

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (member?.voice?.channel) {
      try {
        await member.voice.setChannel(channel);
        console.log(
          `[LFG DEBUG] Moved user ${member.user.tag} to new VC ${channel.id}`
        );
      } catch (moveError) {
        console.error(
          `Could not move user ${member.user.tag} to voice channel ${channel.id}:`,
          moveError
        );
      }
    }
    return channel;
  } catch (error) {
    console.error("Error creating voice channel:", error);
    return null;
  }
}

async function sendLFGAnnouncement(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  lfg: LFGSchema,
  client: Client,
  announcementChannelId: string,
  pingRoleId?: string | null
) {
  if (!interaction.guild) return;

  try {
    const channel = await client.channels.fetch(announcementChannelId);

    if (!channel || !channel.isTextBased()) {
      console.error(
        `Configured announcement channel ${announcementChannelId} not found or not text-based.`
      );
      await interaction
        .followUp({
          content: `Error: Could not find or use the configured announcement channel (<#${announcementChannelId}>). Please check the setup.`,
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }
    const announcementChannel = channel as TextChannel;

    const membersNeeded = lfg.squadSize - lfg.members.length;
    const embed = new EmbedBuilder()
      .setTitle(
        `LF${membersNeeded > 0 ? membersNeeded : "?"} for ${lfg.map} (${
          lfg.difficulty
        })`
      )
      .setDescription(`<@${lfg.ownerId}> is looking for teammates!`)
      .setColor("#00FF00")
      .addFields(
        { name: "Mode", value: lfg.mode, inline: true },
        { name: "Map", value: lfg.map, inline: true },
        { name: "Difficulty", value: lfg.difficulty, inline: true },
        { name: "Ranked Status", value: lfg.rankedStatus, inline: true },
        { name: "Objective Type", value: lfg.objectiveType, inline: true },
        { name: "Loadout Type", value: lfg.loadoutType, inline: true },
        {
          name: "Needed Classes",
          value: lfg.neededClasses?.join(", ") || "None specified",
          inline: false,
        },
        {
          name: "Voice Channel",
          value: lfg.voiceChannelId
            ? `<#${lfg.voiceChannelId}>`
            : "Creating...",
          inline: false,
        },
        {
          name: `Squad Members (1/${lfg.squadSize})`,
          value: `<@${lfg.ownerId}>`,
          inline: false,
        }
      )
      .setFooter({ text: `Squad ID: ${lfg.id}` })
      .setTimestamp();

    const joinButton = new ButtonBuilder()
      .setCustomId(`lfg-join-${lfg.id}`)
      .setLabel("Join Squad")
      .setStyle(ButtonStyle.Success)
      .setDisabled(lfg.members.length >= lfg.squadSize);

    const leaveButton = new ButtonBuilder()
      .setCustomId(`lfg-leave-${lfg.id}`)
      .setLabel("Leave Squad")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      joinButton,
      leaveButton
    );

    const pingContent = pingRoleId
      ? `<@&${pingRoleId}>`
      : `<@&${interaction.guild.roles.everyone.id}>`;

    const message = await announcementChannel.send({
      content: `${pingContent} New LFG request!`,
      embeds: [embed],
      components: [row],
    });
    console.log(
      `[LFG DEBUG] Sent announcement for LFG ${lfg.id} to channel ${announcementChannel.id}`
    );

    const lfgService = LFGService.instance;
    await lfgService.updateLFG(lfg.id, {
      announcementMessageId: message.id,
      announcementChannelId: announcementChannel.id,
    });
  } catch (error) {
    console.error("Error sending LFG announcement:", error);
    await interaction
      .followUp({
        content:
          "Error: Failed to send LFG announcement message. Please check bot permissions.",
        ephemeral: true,
      })
      .catch(console.error);
  }
}

async function updateLFGAnnouncement(lfg: LFGSchema, client: Client) {
  try {
    if (
      !lfg.announcementChannelId ||
      !lfg.announcementMessageId ||
      !client.guilds.cache.has(lfg.guildId)
    ) {
      console.warn(
        `[LFG Update] Missing channel/message ID or guild not cached for LFG ${lfg.id}`
      );
      return;
    }

    const guild = client.guilds.cache.get(lfg.guildId);
    if (!guild) {
      console.warn(
        `[LFG Update] Guild ${lfg.guildId} not found in cache for LFG ${lfg.id}`
      );
      return;
    }

    const channel = await client.channels.fetch(lfg.announcementChannelId);
    if (!channel || !channel.isTextBased()) {
      console.warn(
        `[LFG Update] Announcement channel ${lfg.announcementChannelId} not found or not text for LFG ${lfg.id}`
      );
      return;
    }

    const message = await channel.messages.fetch(lfg.announcementMessageId);
    if (!message) {
      console.warn(
        `[LFG Update] Announcement message ${lfg.announcementMessageId} not found for LFG ${lfg.id}`
      );
      return;
    }

    const config = await LFGService.instance.getGuildConfig(guild.id);
    const pingRoleId = config?.pingRoleId;
    const basePingContent = pingRoleId
      ? `<@&${pingRoleId}>`
      : `<@&${guild.roles.everyone.id}>`;

    const membersNeeded = lfg.squadSize - lfg.members.length;
    const isFull = membersNeeded <= 0;
    const embed = message.embeds[0]
      ? EmbedBuilder.from(message.embeds[0])
      : new EmbedBuilder();

    embed
      .setTitle(
        isFull
          ? `Squad Full: ${lfg.map} (${lfg.difficulty})`
          : `LF${membersNeeded} for ${lfg.map} (${lfg.difficulty})`
      )
      .setColor(isFull ? "#FF0000" : "#00FF00")
      .setFields(
        { name: "Mode", value: lfg.mode, inline: true },
        { name: "Map", value: lfg.map, inline: true },
        { name: "Difficulty", value: lfg.difficulty, inline: true },
        { name: "Ranked Status", value: lfg.rankedStatus, inline: true },
        { name: "Objective Type", value: lfg.objectiveType, inline: true },
        { name: "Loadout Type", value: lfg.loadoutType, inline: true },
        {
          name: "Needed Classes",
          value: lfg.neededClasses?.join(", ") || "None specified",
          inline: false,
        },
        {
          name: "Voice Channel",
          value: lfg.voiceChannelId ? `<#${lfg.voiceChannelId}>` : "None",
          inline: false,
        },
        {
          name: `Squad Members (${lfg.members.length}/${lfg.squadSize})`,
          value:
            lfg.members.length > 0
              ? lfg.members.map((m) => `<@${m.id}>`).join("\n")
              : "Empty",
          inline: false,
        }
      )
      .setTimestamp(lfg.createdAt ? new Date(lfg.createdAt) : new Date());

    const joinButton = new ButtonBuilder()
      .setCustomId(`lfg-join-${lfg.id}`)
      .setLabel("Join Squad")
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFull);

    const leaveButton = new ButtonBuilder()
      .setCustomId(`lfg-leave-${lfg.id}`)
      .setLabel("Leave Squad")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      joinButton,
      leaveButton
    );

    await message.edit({
      content: isFull
        ? `~~${basePingContent} New LFG request!~~\n**This squad is now full!**`
        : message.content,
      embeds: [embed],
      components: [row],
    });
    console.log(`[LFG DEBUG] Updated announcement for LFG ${lfg.id}`);
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      (error.code === RESTJSONErrorCodes.UnknownMessage ||
        error.code === RESTJSONErrorCodes.UnknownChannel)
    ) {
      console.warn(
        `[LFG Update] Failed to update announcement for LFG ${lfg.id}: ${error.message} (Code: ${error.code}). Might be deleted.`
      );
    } else {
      console.error(
        `[LFG Update] Error updating LFG announcement for ${lfg.id}:`,
        error
      );
    }
  }
}

async function handleCloseConfirmLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  if (!interaction.guildId || !interaction.guild) return;

  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

  if (!lfg) {
    return interaction.update({
      content: "This LFG request no longer exists or was already closed.",
      components: [],
    });
  }

  if (lfg.status === "closed") {
    return interaction.update({
      content: "This LFG request is already closed.",
      components: [],
    });
  }

  if (interaction.user.id !== lfg.ownerId) {
    return interaction.reply({
      content: "Only the owner can confirm closing this LFG request.",
      ephemeral: true,
    });
  }

  try {
    await interaction.update({
      content: "⏳ Closing your LFG request...",
      components: [],
    });

    await lfgService.closeLFG(lfgId);

    if (lfg.announcementChannelId && lfg.announcementMessageId) {
      try {
        const channel = await client.channels.fetch(lfg.announcementChannelId);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(
            lfg.announcementMessageId
          );
          if (message) {
            const config = await LFGService.instance.getGuildConfig(
              interaction.guildId
            );
            const pingRoleId = config?.pingRoleId;
            const basePingContent = pingRoleId
              ? `<@&${pingRoleId}>`
              : `<@&${interaction.guild.roles.everyone.id}>`;

            const closedEmbed = message.embeds[0]
              ? EmbedBuilder.from(message.embeds[0])
              : new EmbedBuilder();

            closedEmbed
              .setTitle(`CLOSED: ${lfg.map} (${lfg.difficulty})`)
              .setColor("#808080")
              .setDescription(
                `This LFG request by <@${lfg.ownerId}> is now closed.`
              );

            await message.edit({
              content: `~~${basePingContent} LFG Request~~\n**This LFG request has been closed by the owner.**`,
              embeds: [closedEmbed],
              components: [],
            });
            console.log(
              `[LFG DEBUG] Updated announcement to closed for LFG ${lfg.id}`
            );
          }
        }
      } catch (error) {
        console.error(
          `[LFG Close] Error updating announcement for ${lfg.id}:`,
          error
        );
      }
    }

    if (lfg.voiceChannelId) {
      try {
        const channel = await client.channels.fetch(lfg.voiceChannelId);
        if (channel && channel.type === ChannelType.GuildVoice) {
          await channel.delete(`LFG request ${lfg.id} closed by owner`);
          console.log(
            `[LFG DEBUG] Deleted voice channel ${lfg.voiceChannelId} for LFG ${lfg.id}`
          );
        }
      } catch (error) {
        if (
          error instanceof DiscordAPIError &&
          error.code === RESTJSONErrorCodes.UnknownChannel
        ) {
          console.warn(
            `[LFG Close] Voice channel ${lfg.voiceChannelId} for LFG ${lfg.id} already deleted.`
          );
        } else {
          console.error(
            `[LFG Close] Error deleting voice channel ${lfg.voiceChannelId} for LFG ${lfg.id}:`,
            error
          );
        }
      }
    }

    await interaction.followUp({
      content:
        "✅ Your LFG request has been closed successfully. The announcement message has been updated, and the voice channel (if created) has been deleted.",
      ephemeral: true,
    });
  } catch (error) {
    console.error(`[LFG Close] Error closing LFG ${lfgId}:`, error);
    await interaction
      .followUp({
        content: "❌ An error occurred while closing your LFG request.",
        ephemeral: true,
      })
      .catch(console.error);
  }
}

async function handleJoinLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  if (!interaction.guild) return;

  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

  if (lfg && !lfg.guildId && interaction.guildId) {
    lfg.guildId = interaction.guildId;
  }

  if (!lfg) {
    return interaction.reply({
      content: "This LFG request no longer exists.",
      ephemeral: true,
    });
  }
  if (lfg.status !== "active") {
    return interaction.reply({
      content: "This LFG request is no longer active.",
      ephemeral: true,
    });
  }

  if (lfg.members.some((m) => m.id === interaction.user.id)) {
    return interaction.reply({
      content: `You are already part of this squad.${
        lfg.voiceChannelId
          ? `\nJoin the voice channel: <#${lfg.voiceChannelId}>`
          : ""
      }`,
      ephemeral: true,
    });
  }

  if (lfg.members.length >= lfg.squadSize) {
    return interaction.reply({
      content: "This squad is already full.",
      ephemeral: true,
    });
  }

  const updatedLFG = await lfgService.joinSquad(
    lfgId,
    interaction.user.id,
    interaction.user.tag,
    interaction.guild.id
  );

  if (!updatedLFG) {
    return interaction.reply({
      content: "An error occurred while joining the squad.",
      ephemeral: true,
    });
  }

  await updateLFGAnnouncement(updatedLFG, client);

  await interaction.reply({
    content: `You've joined the squad for ${updatedLFG.map} (${
      updatedLFG.difficulty
    })!\n${
      updatedLFG.voiceChannelId
        ? `Join the voice channel: <#${updatedLFG.voiceChannelId}>`
        : ""
    }`,
    ephemeral: true,
  });

  const owner = interaction.guild?.members.cache.get(updatedLFG.ownerId);
  if (owner && owner.id !== interaction.user.id) {
    try {
      await owner.send(
        `➕ ${interaction.user.tag} has joined your squad for ${updatedLFG.map}!`
      );
    } catch (error) {
      console.log(`Could not DM squad owner ${updatedLFG.ownerId}:`, error);
    }
  }
}

async function handleLeaveLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  if (!interaction.guild) return;

  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

  if (lfg && !lfg.guildId && interaction.guildId) {
    lfg.guildId = interaction.guildId;
  }

  if (!lfg) {
    return interaction.reply({
      content: "This LFG request no longer exists.",
      ephemeral: true,
    });
  }

  if (lfg.status !== "active") {
    return interaction.reply({
      content: "This LFG request is no longer active.",
      ephemeral: true,
    });
  }

  if (!lfg.members.some((m) => m.id === interaction.user.id)) {
    return interaction.reply({
      content: "You are not part of this squad.",
      ephemeral: true,
    });
  }

  if (lfg.ownerId === interaction.user.id) {
    console.log(
      `[LFG DEBUG] Owner ${interaction.user.tag} clicked Leave on LFG ${lfgId}, triggering close confirmation.`
    );
    const confirmButtons = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: "Confirm Close",
            custom_id: `lfg-close-confirm-${lfg.id}`,
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
      content: `❓ As the owner, leaving will close the LFG request. Are you sure you want to close your LFG for ${lfg.map} (${lfg.difficulty})?`,
      components: confirmButtons,
      ephemeral: true,
    });
    return;
  }

  const updatedLFG = await lfgService.leaveSquad(lfgId, interaction.user.id);

  if (!updatedLFG) {
    return interaction.reply({
      content:
        "An error occurred while leaving the squad, or you were not in it.",
      ephemeral: true,
    });
  }

  await updateLFGAnnouncement(updatedLFG, client);

  await interaction.reply({
    content: `You've left the squad for ${lfg.map} (${lfg.difficulty}).`,
    ephemeral: true,
  });

  const owner = interaction.guild?.members.cache.get(updatedLFG.ownerId);
  if (owner) {
    try {
      await owner.send(
        `➖ ${interaction.user.tag} has left your squad for ${lfg.map}.`
      );
    } catch (error) {
      console.log(`Could not DM squad owner ${updatedLFG.ownerId}:`, error);
    }
  }
}

async function handleCloseExistingLFG(
  interaction: ButtonInteraction,
  lfgId: string
) {
  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

  if (!lfg) {
    await interaction.update({
      content: "This LFG request no longer exists.",
      components: [],
    });
    return;
  }

  if (interaction.user.id !== lfg.ownerId) {
    await interaction.reply({
      content: "Only the owner can close this LFG.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.update({
      content: "⏳ Closing your existing LFG request...",
      components: [],
    });
    await lfgService.closeLFG(lfgId);

    await interaction.followUp({
      content:
        "✅ Your existing LFG request has been marked as closed. You can now create a new one using `/lfg create` again.\n*(Note: Associated VC/announcement may need manual cleanup or will be handled by the `/lfg close` command)*",
      ephemeral: true,
    });
  } catch (error) {
    console.error(
      `Error closing existing LFG ${lfgId} via shortcut button:`,
      error
    );
    await interaction
      .followUp({
        content:
          "❌ An error occurred while closing your existing LFG request.",
        ephemeral: true,
      })
      .catch(console.error);
  }
}
