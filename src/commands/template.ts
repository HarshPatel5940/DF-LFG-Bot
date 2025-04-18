import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Command } from "../interface";
import type { ButtonSchemaType, TemplateSchemaType } from "../types/templates";
import { MyCache } from "../utils/cache";
import db from "../utils/database";

export default {
  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("Manage FAQ templates")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("send")
        .setDescription("Send a template to a channel")
        .addStringOption(option =>
          option
            .setName("id-or-name")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel to send the template")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand.setName("add").setDescription("Add a new template"),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("update")
        .setDescription("Update an existing template")
        .addStringOption(option =>
          option
            .setName("id-or-name")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("delete")
        .setDescription("Delete a template")
        .addStringOption(option =>
          option
            .setName("id-or-name")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand.setName("list").setDescription("List all templates"),
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    let templates = MyCache.get("templates") as TemplateSchemaType[];

    if (!templates) {
      templates = await (await db())
        .collection<TemplateSchemaType>("templates")
        .find({})
        .toArray();
      MyCache.set("templates", templates);
    }

    const filtered = templates.filter(
      template =>
        template.id.toLowerCase().includes(focusedValue) ||
        template.name.toLowerCase().includes(focusedValue),
    );

    await interaction.respond(
      filtered.slice(0, 25).map(template => ({
        name: `${template.name} (${template.id})`,
        value: template.id,
      })),
    );
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      await handleAddTemplate(interaction);
    } else if (subcommand === "update") {
      const templateId = interaction.options.getString("id-or-name", true);
      return handleUpdateTemplate(interaction, templateId);
    } else if (subcommand === "delete") {
      const templateId = interaction.options.getString("id-or-name", true);
      return handleDeleteTemplate(interaction, templateId);
    } else if (subcommand === "send") {
      const templateId = interaction.options.getString("id-or-name", true);
      const channel = interaction.options.getChannel("channel", true).id;
      return handleSendTemplate(interaction, templateId, channel);
    } else if (subcommand === "list") {
      return handleListTemplates(interaction);
    }
  },
} as Command;

async function handleAddTemplate(interaction: ChatInputCommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("template-add")
    .setTitle("Create New Template");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Template Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(50);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel("Template Content")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1500);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    nameInput,
  );
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    contentInput,
  );

  modal.addComponents(firstRow, secondRow);
  await interaction.showModal(modal);
}

async function handleUpdateTemplate(
  interaction: ChatInputCommandInteraction,
  templateId: string,
) {
  const templateData = await (await db())
    .collection<TemplateSchemaType>("templates")
    .findOne({ id: templateId });

  if (!templateData) {
    return interaction.reply({
      content: "⚠️ Template not found!",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`template-update-${templateId}`)
    .setTitle("Update Template");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Template Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(50)
    .setValue(templateData.name);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel("Template Content")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1500)
    .setValue(templateData.content);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    nameInput,
  );
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    contentInput,
  );

  modal.addComponents(firstRow, secondRow);
  await interaction.showModal(modal);
}

async function handleDeleteTemplate(
  interaction: ChatInputCommandInteraction,
  templateId: string,
) {
  const templateData = await (await db())
    .collection<TemplateSchemaType>("templates")
    .findOne({ id: templateId });

  if (!templateData) {
    return interaction.reply({
      content: "⚠️ Template not found!",
      ephemeral: true,
    });
  }

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`template-delete-confirm-${templateId}`)
      .setLabel("Confirm Delete")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("template-delete-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: `Are you sure you want to delete the template **${templateData.name}**?`,
    components: [confirmRow],
    ephemeral: true,
  });
}

async function handleSendTemplate(
  interaction: ChatInputCommandInteraction,
  templateId: string,
  channelId: string,
) {
  const templateData = await (await db())
    .collection<TemplateSchemaType>("templates")
    .findOne({ id: templateId });

  if (!templateData) {
    return interaction.reply({
      content: "⚠️ Template not found!",
      ephemeral: true,
    });
  }

  const channel = await interaction.guild?.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "⚠️ You can only send templates to text channels!",
      ephemeral: true,
    });
  }

  try {
    await channel.send({
      content: templateData.content,
      components:
        templateData.buttonArr && templateData.buttonArr.length > 0
          ? [createButtonComponents(templateData.buttonArr)]
          : [],
    });

    await interaction.reply({
      content: `✅ Template **${templateData.name}** sent to <#${channel.id}>!`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error sending template:", error);
    await interaction.reply({
      content: "⚠️ An error occurred while sending the template.",
      ephemeral: true,
    });
  }
}

async function handleListTemplates(interaction: ChatInputCommandInteraction) {
  const templates = await (await db())
    .collection<TemplateSchemaType>("templates")
    .find({})
    .toArray();

  if (templates.length === 0) {
    return interaction.reply({
      content: "No templates found!",
      ephemeral: true,
    });
  }

  const templateList = templates
    .map((template, index) => {
      return `${index + 1}. **${template.name}** (${template.id})`;
    })
    .join("\n");

  const message = `# Available Templates\n${templateList}`;

  await interaction.reply({
    content: message,
    ephemeral: true,
  });
}

function createButtonComponents(buttons: ButtonSchemaType[]) {
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const button of buttons) {
    const buttonStyle =
      button.buttonType === "primary"
        ? ButtonStyle.Primary
        : button.buttonType === "secondary"
          ? ButtonStyle.Secondary
          : ButtonStyle.Danger;

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`template-button-${button.buttonID}`)
        .setLabel(button.buttonLabel)
        .setStyle(buttonStyle),
    );
  }

  return row;
}
