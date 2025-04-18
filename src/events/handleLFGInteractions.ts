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
} from "discord.js";
import { LFGService } from "../services/lfgService";
import {
  ClassTypeSchema,
  DifficultySchema,
  LoadoutTypeSchema,
  MapSchema,
  ObjectiveTypeSchema,
  RankedStatusSchema,
  type LFGCreateParams,
  type LFGSchema,
} from "../types/lfg";

// Store user selections during the LFG creation process
const userSelections = new Map<string, Partial<LFGCreateParams>>();

// Export the function to create initial selection menus
export function createInitialLFGSelectionMenus() {
  // Create map selection menu
  const mapOptions = MapSchema.options.map((map) =>
    new StringSelectMenuOptionBuilder().setLabel(map).setValue(map)
  );

  const mapSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("lfg-map-select")
    .setPlaceholder("Select a map")
    .addOptions(mapOptions);

  const mapRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    mapSelectMenu
  );

  // Create difficulty selection menu
  const difficultyOptions = DifficultySchema.options.map((difficulty) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(difficulty)
      .setValue(difficulty)
  );

  const difficultySelectMenu = new StringSelectMenuBuilder()
    .setCustomId("lfg-difficulty-select")
    .setPlaceholder("Select difficulty")
    .addOptions(difficultyOptions);

  const difficultyRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      difficultySelectMenu
    );

  // Create ranked status selection menu
  const rankedOptions = RankedStatusSchema.options.map((status) =>
    new StringSelectMenuOptionBuilder().setLabel(status).setValue(status)
  );

  const rankedSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("lfg-ranked-select")
    .setPlaceholder("Select ranked status")
    .addOptions(rankedOptions);

  const rankedRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      rankedSelectMenu
    );

  return [mapRow, difficultyRow, rankedRow];
}

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction, client: Client) {
    if (!interaction.guild) return;

    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("lfg-close-existing-")) {
        const lfgId = interaction.customId.replace("lfg-close-existing-", "");
        await handleCloseExistingLFG(interaction, lfgId);
      } else if (interaction.customId === "lfg-cancel-creation") {
        await interaction.update({
          content: "LFG creation cancelled.",
          components: [],
        });
      } else if (interaction.customId.startsWith("lfg-close-confirm-")) {
        const lfgId = interaction.customId.replace("lfg-close-confirm-", "");
        await handleCloseConfirmLFG(interaction, lfgId, client);
      } else if (interaction.customId === "lfg-close-cancel") {
        await interaction.update({
          content: "LFG closure cancelled.",
          components: [],
        });
      } else if (interaction.customId.startsWith("lfg-join-")) {
        const lfgId = interaction.customId.replace("lfg-join-", "");
        await handleJoinLFG(interaction, lfgId, client);
      } else if (interaction.customId.startsWith("lfg-leave-")) {
        const lfgId = interaction.customId.replace("lfg-leave-", "");
        await handleLeaveLFG(interaction, lfgId, client);
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

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "lfg-map-select") {
        await handleMapSelection(interaction);
      } else if (interaction.customId === "lfg-difficulty-select") {
        await handleDifficultySelection(interaction);
      } else if (interaction.customId === "lfg-ranked-select") {
        await handleRankedSelection(interaction);
      } else if (interaction.customId === "lfg-objective-select") {
        await handleObjectiveSelection(interaction);
      } else if (interaction.customId === "lfg-loadout-select") {
        await handleLoadoutSelection(interaction);
      } else if (interaction.customId === "lfg-classes-select") {
        await handleClassesSelection(interaction);
      }
    }
  },
};

async function handleMapSelection(interaction: StringSelectMenuInteraction) {
  const map = interaction.values[0];

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  userSelection.map = map as
    | "Zero Dam"
    | "Layali Grove"
    | "Space City"
    | "Brakkesh"
    | undefined;
  userSelections.set(interaction.user.id, userSelection);

  // Check if we have all selections from the first step
  await checkAndUpdateFirstStep(interaction);
}

async function handleDifficultySelection(
  interaction: StringSelectMenuInteraction
) {
  const difficulty = interaction.values[0];

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  userSelection.difficulty = difficulty as "Easy" | "Normal" | undefined;
  userSelections.set(interaction.user.id, userSelection);

  // Check if we have all selections from the first step
  await checkAndUpdateFirstStep(interaction);
}

async function handleRankedSelection(interaction: StringSelectMenuInteraction) {
  const rankedStatus = interaction.values[0];

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  userSelection.rankedStatus = rankedStatus as
    | "Ranked"
    | "Not Ranked"
    | undefined;
  userSelections.set(interaction.user.id, userSelection);

  // Check if we have all selections from the first step
  await checkAndUpdateFirstStep(interaction);
}

async function checkAndUpdateFirstStep(
  interaction: StringSelectMenuInteraction
) {
  const userSelection = userSelections.get(interaction.user.id) || {};

  // Only proceed if all three fields are filled
  if (
    userSelection.map &&
    userSelection.difficulty &&
    userSelection.rankedStatus
  ) {
    // Create objective type selection menu
    const objectiveOptions = ClassTypeSchema.options.map((objective) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(objective)
        .setValue(objective)
    );

    const objectiveSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("lfg-objective-select")
      .setPlaceholder("Select objective type")
      .addOptions(objectiveOptions);

    const objectiveRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        objectiveSelectMenu
      );

    // Create loadout type selection menu
    const loadoutOptions = ClassTypeSchema.options.map((loadout) =>
      new StringSelectMenuOptionBuilder().setLabel(loadout).setValue(loadout)
    );

    const loadoutSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("lfg-loadout-select")
      .setPlaceholder("Select loadout type")
      .addOptions(loadoutOptions);

    const loadoutRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        loadoutSelectMenu
      );

    await interaction.update({
      content: `Step 2/3: Select objective and loadout types for your LFG request:\n\nCurrent selections:\n- Map: ${userSelection.map}\n- Difficulty: ${userSelection.difficulty}\n- Ranked Status: ${userSelection.rankedStatus}`,
      components: [objectiveRow, loadoutRow],
    });
  }
}

async function handleObjectiveSelection(
  interaction: StringSelectMenuInteraction
) {
  const objectiveType = interaction.values[0];

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  if (objectiveType === "Hotspots" || objectiveType === "Scavenge") {
    userSelection.objectiveType = objectiveType;
  }
  userSelections.set(interaction.user.id, userSelection);

  // Check if we have all selections from the second step
  await checkAndUpdateSecondStep(interaction);
}

async function handleLoadoutSelection(
  interaction: StringSelectMenuInteraction
) {
  const loadoutType = interaction.values[0];

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  if (
    loadoutType === "Fully Armed" ||
    loadoutType === "Scavenger Hunt" ||
    loadoutType === "Risk it for the Biscuit"
  ) {
    userSelection.loadoutType = loadoutType;
  }
  userSelections.set(interaction.user.id, userSelection);

  // Check if we have all selections from the second step
  await checkAndUpdateSecondStep(interaction);
}

async function checkAndUpdateSecondStep(
  interaction: StringSelectMenuInteraction
) {
  const userSelection = userSelections.get(interaction.user.id) || {};

  // Only proceed if both fields are filled
  if (userSelection.objectiveType && userSelection.loadoutType) {
    // Create needed classes selection menu
    const classOptions = ClassTypeSchema.options.map((classType) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(classType)
        .setValue(classType)
    );

    const classSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("lfg-classes-select")
      .setPlaceholder("Select needed classes (up to 2)")
      .setMinValues(0)
      .setMaxValues(2)
      .addOptions(classOptions);

    const classRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        classSelectMenu
      );

    await interaction.update({
      content: `Step 3/3: Select needed classes for your LFG request (up to 2):\n\nCurrent selections:\n- Map: ${userSelection.map}\n- Difficulty: ${userSelection.difficulty}\n- Ranked Status: ${userSelection.rankedStatus}\n- Objective Type: ${userSelection.objectiveType}\n- Loadout Type: ${userSelection.loadoutType}`,
      components: [classRow],
    });
  }
}

async function handleClassesSelection(
  interaction: StringSelectMenuInteraction
) {
  const neededClasses = interaction.values;

  // Save the selection
  const userSelection = userSelections.get(interaction.user.id) || {};
  userSelection.neededClasses = neededClasses.filter(
    (
      cls
    ): cls is
      | "Need Recon"
      | "Need Assault"
      | "Need Engineer"
      | "Need Support" =>
      ["Need Recon", "Need Assault", "Need Engineer", "Need Support"].includes(
        cls
      )
  );
  userSelections.set(interaction.user.id, userSelection);

  // Show confirmation
  const selections = userSelections.get(interaction.user.id);

  if (!selections) {
    await interaction.update({
      content: "An error occurred with your selections. Please try again.",
      components: [],
    });
    return;
  }

  // Create confirmation buttons
  const confirmButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("lfg-create-confirm")
      .setLabel("Create LFG Request")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("lfg-create-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.update({
    content: `Please confirm your LFG request:\n\n- Map: ${
      selections.map
    }\n- Difficulty: ${selections.difficulty}\n- Ranked Status: ${
      selections.rankedStatus
    }\n- Objective Type: ${selections.objectiveType}\n- Loadout Type: ${
      selections.loadoutType
    }\n- Needed Classes: ${selections.neededClasses?.join(", ") || "None"}`,
    components: [confirmButtons],
  });
}

async function handleConfirmCreateLFG(
  interaction: ButtonInteraction,
  client: Client
) {
  const selections = userSelections.get(interaction.user.id);

  if (!selections) {
    await interaction.update({
      content: "An error occurred with your selections. Please try again.",
      components: [],
    });
    return;
  }

  try {
    // Create LFG in database
    const lfgService = LFGService.instance;
    const lfg = await lfgService.createLFG(
      interaction.user.id,
      interaction.user.tag,
      selections as LFGCreateParams
    );

    // Create voice channel for the LFG
    await createVoiceChannel(interaction, lfg, client);

    // Send announcement
    await sendLFGAnnouncement(interaction, lfg, client);

    // Clear user selections
    userSelections.delete(interaction.user.id);

    // Respond to user
    await interaction.update({
      content: `✅ Your LFG request has been created! A voice channel has been created and an announcement has been sent.\n\nUse \`/lfg close\` to close this request when you're done.`,
      components: [],
    });
  } catch (error) {
    console.error("Error creating LFG:", error);
    await interaction.update({
      content:
        "An error occurred while creating your LFG request. Please try again.",
      components: [],
    });
  }
}

async function createVoiceChannel(
  interaction: ButtonInteraction,
  lfg: LFGSchema,
  client: Client
) {
  try {
    // Format channel name
    const channelName = `🎮 ${lfg.map.replace(/\s+/g, "-")}-${
      lfg.difficulty
    }-LF${lfg.squadSize - 1}`;

    // Create channel
    const channel = await interaction.guild?.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent:
        interaction.channel?.type === ChannelType.GuildText
          ? interaction.channel.parent
          : undefined,
      permissionOverwrites: [
        {
          id: interaction.guild?.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
      ],
    });

    if (channel) {
      // Update LFG with channel ID
      const lfgService = LFGService.instance;
      await lfgService.updateLFG(lfg.id, { voiceChannelId: channel.id });

      // Move the user to the channel if they're in voice
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      if (member?.voice?.channel) {
        try {
          await member.voice.setChannel(channel);
        } catch (error) {
          console.error("Could not move user to voice channel:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error creating voice channel:", error);
    throw error;
  }
}

async function sendLFGAnnouncement(
  interaction: ButtonInteraction,
  lfg: LFGSchema,
  client: Client
) {
  try {
    // Find the announcement channel (assuming it's called "lfg" or "looking-for-group")
    const announcementChannel = interaction.guild?.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        (channel.name.includes("lfg") ||
          channel.name.includes("looking-for-group"))
    );

    if (!announcementChannel || !announcementChannel.isTextBased()) {
      await interaction.followUp({
        content:
          "Could not find a suitable announcement channel. Please create a channel named 'lfg' or 'looking-for-group'.",
        ephemeral: true,
      });
      return;
    }

    // Create LFG announcement embed
    const embed = new EmbedBuilder()
      .setTitle(
        `LF${lfg.squadSize - lfg.members.length} for ${lfg.map} (${
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
          value: lfg.neededClasses.join(", ") || "None specified",
          inline: false,
        },
        {
          name: "Voice Channel",
          value: lfg.voiceChannelId ? `<#${lfg.voiceChannelId}>` : "None",
          inline: false,
        }
      )
      .setFooter({ text: `Squad ID: ${lfg.id}` })
      .setTimestamp();

    // Create join/leave buttons
    const joinButton = new ButtonBuilder()
      .setCustomId(`lfg-join-${lfg.id}`)
      .setLabel("Join Squad")
      .setStyle(ButtonStyle.Success);

    const leaveButton = new ButtonBuilder()
      .setCustomId(`lfg-leave-${lfg.id}`)
      .setLabel("Leave Squad")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      joinButton,
      leaveButton
    );

    // Send announcement
    const message = await announcementChannel.send({
      content: `<@&${interaction.guild?.roles.everyone.id}> New LFG request!`,
      embeds: [embed],
      components: [row],
    });

    // Update LFG with announcement message ID and channel ID
    const lfgService = LFGService.instance;
    await lfgService.updateLFG(lfg.id, {
      announcementMessageId: message.id,
      announcementChannelId: announcementChannel.id,
    });
  } catch (error) {
    console.error("Error sending LFG announcement:", error);
    throw error;
  }
}

async function handleJoinLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

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
      content: "You are already part of this squad.",
      ephemeral: true,
    });
  }

  if (lfg.members.length >= lfg.squadSize) {
    return interaction.reply({
      content: "This squad is already full.",
      ephemeral: true,
    });
  }

  // Add user to squad
  const updatedLFG = await lfgService.joinSquad(
    lfgId,
    interaction.user.id,
    interaction.user.tag
  );

  if (!updatedLFG) {
    return interaction.reply({
      content: "An error occurred while joining the squad.",
      ephemeral: true,
    });
  }

  // Update announcement message
  await updateLFGAnnouncement(updatedLFG, client);

  // Notify user
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

  // Notify squad owner
  const owner = interaction.guild?.members.cache.get(updatedLFG.ownerId);
  if (owner) {
    try {
      await owner.send(
        `${interaction.user.tag} has joined your squad for ${updatedLFG.map}!`
      );
    } catch (error) {
      console.log("Could not DM squad owner:", error);
    }
  }
}

async function handleLeaveLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

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

  // If owner is leaving, close the LFG
  if (lfg.ownerId === interaction.user.id) {
    await handleCloseConfirmLFG(interaction, lfgId, client);
    return;
  }

  // Remove user from squad
  const updatedLFG = await lfgService.leaveSquad(lfgId, interaction.user.id);

  if (!updatedLFG) {
    return interaction.reply({
      content: "An error occurred while leaving the squad.",
      ephemeral: true,
    });
  }

  // Update announcement message
  await updateLFGAnnouncement(updatedLFG, client);

  // Notify user
  await interaction.reply({
    content: `You've left the squad for ${lfg.map} (${lfg.difficulty}).`,
    ephemeral: true,
  });

  // Notify squad owner
  const owner = interaction.guild?.members.cache.get(updatedLFG.ownerId);
  if (owner) {
    try {
      await owner.send(
        `${interaction.user.tag} has left your squad for ${lfg.map}.`
      );
    } catch (error) {
      console.log("Could not DM squad owner:", error);
    }
  }
}

async function updateLFGAnnouncement(lfg: LFGSchema, client: Client) {
  try {
    if (!lfg.announcementChannelId || !lfg.announcementMessageId) {
      return;
    }

    const channel = await client.channels.fetch(lfg.announcementChannelId);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const message = await channel.messages.fetch(lfg.announcementMessageId);
    if (!message) {
      return;
    }

    // Updated embed
    const embed = new EmbedBuilder()
      .setTitle(
        `LF${lfg.squadSize - lfg.members.length} for ${lfg.map} (${
          lfg.difficulty
        })`
      )
      .setDescription(`<@${lfg.ownerId}> is looking for teammates!`)
      .setColor(lfg.members.length >= lfg.squadSize ? "#FF0000" : "#00FF00")
      .addFields(
        { name: "Mode", value: lfg.mode, inline: true },
        { name: "Map", value: lfg.map, inline: true },
        { name: "Difficulty", value: lfg.difficulty, inline: true },
        { name: "Ranked Status", value: lfg.rankedStatus, inline: true },
        { name: "Objective Type", value: lfg.objectiveType, inline: true },
        { name: "Loadout Type", value: lfg.loadoutType, inline: true },
        {
          name: "Needed Classes",
          value: lfg.neededClasses.join(", ") || "None specified",
          inline: false,
        },
        {
          name: "Voice Channel",
          value: lfg.voiceChannelId ? `<#${lfg.voiceChannelId}>` : "None",
          inline: false,
        },
        {
          name: "Squad Members",
          value: lfg.members.map((m) => `<@${m.id}>`).join("\n"),
          inline: false,
        }
      )
      .setFooter({ text: `Squad ID: ${lfg.id}` })
      .setTimestamp();

    // Join button is disabled if squad is full
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

    // Update the message
    await message.edit({
      content:
        lfg.members.length >= lfg.squadSize
          ? `~~<@&${message.guild?.roles.everyone.id}> New LFG request!~~\n**This squad is now full!**`
          : `<@&${message.guild?.roles.everyone.id}> New LFG request!`,
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error("Error updating LFG announcement:", error);
  }
}

async function handleCloseExistingLFG(
  interaction: ButtonInteraction,
  lfgId: string
) {
  const lfgService = LFGService.instance;
  await lfgService.closeLFG(lfgId);

  await interaction.update({
    content:
      "Your existing LFG request has been closed. You can now create a new one.",
    components: [],
  });
}

async function handleCloseConfirmLFG(
  interaction: ButtonInteraction,
  lfgId: string,
  client: Client
) {
  const lfgService = LFGService.instance;
  const lfg = await lfgService.getLFGById(lfgId);

  if (!lfg) {
    return interaction.update({
      content: "This LFG request no longer exists.",
      components: [],
    });
  }

  try {
    // Close LFG in database
    await lfgService.closeLFG(lfgId);

    // Update announcement if it exists
    if (lfg.announcementChannelId && lfg.announcementMessageId) {
      try {
        const channel = await client.channels.fetch(lfg.announcementChannelId);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(
            lfg.announcementMessageId
          );
          if (message) {
            await message.edit({
              content: `~~<@&${message.guild?.roles.everyone.id}> New LFG request!~~\n**This LFG request has been closed.**`,
              components: [],
            });
          }
        }
      } catch (error) {
        console.error("Error updating announcement:", error);
      }
    }

    // Delete voice channel if it exists
    if (lfg.voiceChannelId) {
      try {
        const channel = await client.channels.fetch(lfg.voiceChannelId);
        if (channel) {
          await channel.delete("LFG request closed");
        }
      } catch (error) {
        console.error("Error deleting voice channel:", error);
      }
    }

    // Notify user
    await interaction.update({
      content:
        "Your LFG request has been closed successfully. The voice channel has been deleted and the announcement has been updated.",
      components: [],
    });
  } catch (error) {
    console.error("Error closing LFG:", error);
    await interaction.update({
      content: "An error occurred while closing your LFG request.",
      components: [],
    });
  }
}
