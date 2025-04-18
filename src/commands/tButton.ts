import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Command } from "../interface";
import type { TemplateSchemaType } from "../types/templates";
import { MyCache } from "../utils/cache";
import db from "../utils/database";

export default {
  data: new SlashCommandBuilder()
    .setName("template-button")
    .setDescription("Manage buttons for templates")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a button to a template")
        .addStringOption(option =>
          option
            .setName("template-id")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a button from a template")
        .addStringOption(option =>
          option
            .setName("template-id")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addStringOption(option =>
          option
            .setName("button-id")
            .setDescription("ID of the button to remove")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all buttons on a template")
        .addStringOption(option =>
          option
            .setName("template-id")
            .setDescription("ID or name of the template")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "template-id") {
      const focusedValue = focusedOption.value.toLowerCase();
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
    } else if (focusedOption.name === "button-id") {
      const templateId = interaction.options.getString("template-id");
      if (!templateId) {
        return interaction.respond([]);
      }

      const template = await (await db())
        .collection<TemplateSchemaType>("templates")
        .findOne({ id: templateId });

      if (!template || !template.buttonArr || template.buttonArr.length === 0) {
        return interaction.respond([]);
      }

      const focusedValue = focusedOption.value.toLowerCase();
      const filteredButtons = template.buttonArr.filter(
        button =>
          button.buttonID.toLowerCase().includes(focusedValue) ||
          button.buttonLabel.toLowerCase().includes(focusedValue),
      );

      await interaction.respond(
        filteredButtons.map(button => ({
          name: `${button.buttonLabel} (${button.buttonID})`,
          value: button.buttonID,
        })),
      );
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const templateId = interaction.options.getString("template-id", true);

    if (subcommand === "add") {
      await handleAddButton(interaction, templateId);
    } else if (subcommand === "remove") {
      const buttonId = interaction.options.getString("button-id", true);
      await handleRemoveButton(interaction, templateId, buttonId);
    } else if (subcommand === "list") {
      await handleListButtons(interaction, templateId);
    }
  },
} as Command;

async function handleAddButton(
  interaction: ChatInputCommandInteraction,
  templateId: string,
) {
  const template = await (await db())
    .collection<TemplateSchemaType>("templates")
    .findOne({ id: templateId });

  if (!template) {
    return interaction.reply({
      content: "⚠️ Template not found!",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`button-add-${templateId}`)
    .setTitle(`Add Button to ${template.name}`);

  const labelInput = new TextInputBuilder()
    .setCustomId("buttonLabel")
    .setLabel("Button Label (shown on the button)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(50);

  const typeInput = new TextInputBuilder()
    .setCustomId("buttonType")
    .setLabel("Button Type (primary, secondary, danger)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("primary")
    .setRequired(true)
    .setValue("primary");

  const contentInput = new TextInputBuilder()
    .setCustomId("buttonReplyContent")
    .setLabel("Reply Content (sent when button is clicked)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1500);

  const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    labelInput,
  );

  const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    typeInput,
  );
  const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    contentInput,
  );

  modal.addComponents(row1, row2, row3);
  await interaction.showModal(modal);
}

async function handleRemoveButton(
  interaction: ChatInputCommandInteraction,
  templateId: string,
  buttonId: string,
) {
  try {
    const template = await (await db())
      .collection<TemplateSchemaType>("templates")
      .findOne({ id: templateId });

    if (!template) {
      return interaction.reply({
        content: "⚠️ Template not found!",
        ephemeral: true,
      });
    }

    if (
      !template.buttonArr ||
      !template.buttonArr.find(b => b.buttonID === buttonId)
    ) {
      return interaction.reply({
        content: "⚠️ Button not found on this template!",
        ephemeral: true,
      });
    }

    const updatedButtons = template.buttonArr.filter(
      b => b.buttonID !== buttonId,
    );

    await (await db()).collection<TemplateSchemaType>("templates").updateOne(
      { id: templateId },
      {
        $set: {
          buttonArr: updatedButtons,
          updatedAt: new Date(),
        },
      },
    );

    MyCache.del("templates");

    await interaction.reply({
      content: `✅ Button removed from template **${template.name}**!`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error removing button:", error);
    await interaction.reply({
      content: "⚠️ An error occurred while removing the button.",
      ephemeral: true,
    });
  }
}

async function handleListButtons(
  interaction: ChatInputCommandInteraction,
  templateId: string,
) {
  try {
    const template = await (await db())
      .collection<TemplateSchemaType>("templates")
      .findOne({ id: templateId });

    if (!template) {
      return interaction.reply({
        content: "⚠️ Template not found!",
        ephemeral: true,
      });
    }

    if (!template.buttonArr || template.buttonArr.length === 0) {
      return interaction.reply({
        content: `Template **${template.name}** has no buttons.`,
        ephemeral: true,
      });
    }

    const buttonList = template.buttonArr
      .map((button, index) => {
        return `${index + 1}. **${button.buttonLabel}** (ID: \`${button.buttonID}\`, Type: \`${button.buttonType}\`)`;
      })
      .join("\n");

    const message = `# Buttons for "${template.name}"\n${buttonList}`;

    const previewRow = new ActionRowBuilder<ButtonBuilder>();

    for (const button of template.buttonArr) {
      const buttonStyle =
        button.buttonType === "primary"
          ? ButtonStyle.Primary
          : button.buttonType === "secondary"
            ? ButtonStyle.Secondary
            : ButtonStyle.Danger;

      previewRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`preview-button-${button.buttonID}`)
          .setLabel(button.buttonLabel)
          .setStyle(buttonStyle)
          .setDisabled(true),
      );

      if (previewRow.components.length >= 5) break;
    }

    await interaction.reply({
      content: message,
      components: [previewRow],
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error listing buttons:", error);
    await interaction.reply({
      content: "⚠️ An error occurred while listing buttons.",
      ephemeral: true,
    });
  }
}
