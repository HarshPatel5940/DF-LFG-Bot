import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  Events,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";
import { ulid } from "ulid";
import {
  type TemplateSchemaType,
  buttonSchema,
  templateSchema,
} from "../types/templates";
import { MyCache } from "../utils/cache";
import db from "../utils/database";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.guild) return;

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "template-add") {
        await handleAddTemplateSubmit(interaction);
      } else if (interaction.customId.startsWith("template-update-")) {
        const templateId = interaction.customId.replace("template-update-", "");
        await handleUpdateTemplateSubmit(interaction, templateId);
      } else if (interaction.customId.startsWith("button-add-")) {
        const templateId = interaction.customId.replace("button-add-", "");
        await handleAddButtonSubmit(interaction, templateId);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("template-delete-confirm-")) {
        const templateId = interaction.customId.replace(
          "template-delete-confirm-",
          "",
        );
        await handleDeleteTemplateConfirm(interaction, templateId);
      } else if (interaction.customId === "template-delete-cancel") {
        await interaction.update({
          content: "Template deletion cancelled.",
          components: [],
        });
      } else if (interaction.customId.startsWith("template-button-")) {
        const buttonId = interaction.customId.replace("template-button-", "");
        await handleTemplateButtonClick(interaction, buttonId);
      }
    }
  },
};

async function handleAddTemplateSubmit(interaction: ModalSubmitInteraction) {
  const name = interaction.fields.getTextInputValue("name");
  const content = interaction.fields.getTextInputValue("content");

  try {
    const newTemplate = templateSchema.parse({
      name,
      content,
    });

    await (await db())
      .collection<TemplateSchemaType>("templates")
      .insertOne(newTemplate);

    MyCache.del("templates");

    await interaction.reply({
      content: `✅ Template **${name}** created successfully!`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    await interaction.reply({
      content:
        "⚠️ Failed to create template. Please check your inputs and try again.",
      ephemeral: true,
    });
  }
}

async function handleUpdateTemplateSubmit(
  interaction: ModalSubmitInteraction,
  templateId: string,
) {
  const name = interaction.fields.getTextInputValue("name");
  const content = interaction.fields.getTextInputValue("content");

  try {
    const updatedAt = new Date();

    const result = await (await db())
      .collection<TemplateSchemaType>("templates")
      .updateOne({ id: templateId }, { $set: { name, content, updatedAt } });

    if (result.matchedCount === 0) {
      return interaction.reply({
        content: "⚠️ Template not found!",
        ephemeral: true,
      });
    }

    MyCache.del("templates");

    await interaction.reply({
      content: `✅ Template **${name}** updated successfully!`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    await interaction.reply({
      content:
        "⚠️ Failed to update template. Please check your inputs and try again.",
      ephemeral: true,
    });
  }
}

async function handleAddButtonSubmit(
  interaction: ModalSubmitInteraction,
  templateId: string,
) {
  try {
    const buttonID = ulid();
    const buttonLabel = interaction.fields
      .getTextInputValue("buttonLabel")
      .toLowerCase();
    const buttonType = interaction.fields.getTextInputValue("buttonType") as
      | "primary"
      | "secondary"
      | "danger";
    const buttonReplyContent =
      interaction.fields.getTextInputValue("buttonReplyContent");

    const newButton = buttonSchema.parse({
      buttonID,
      buttonLabel,
      buttonType,
      buttonReplyContent,
    });

    const template = await (await db())
      .collection<TemplateSchemaType>("templates")
      .findOne({ id: templateId });

    if (!template) {
      return interaction.reply({
        content: "⚠️ Template not found!",
        ephemeral: true,
      });
    }

    if (template.buttonArr?.some(b => b.buttonID === buttonID)) {
      return interaction.reply({
        content: "⚠️ A button with this ID already exists on this template!",
        ephemeral: true,
      });
    }

    const updatedButtons = [...(template.buttonArr || []), newButton];

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

    const buttonStyle =
      buttonType === "primary"
        ? ButtonStyle.Primary
        : buttonType === "secondary"
          ? ButtonStyle.Secondary
          : ButtonStyle.Danger;

    const previewButton = new ButtonBuilder()
      .setCustomId(`preview-button-${buttonID}`)
      .setLabel(buttonLabel)
      .setStyle(buttonStyle)
      .setDisabled(true);

    const previewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      previewButton,
    );

    await interaction.reply({
      content: `✅ Button **${buttonLabel}** added to template **${template.name}**!`,
      components: [previewRow],
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error adding button:", error);
    let errorMessage =
      "⚠️ Failed to add button. Please check your inputs and try again.";

    if (error instanceof Error) {
      errorMessage += ` Error: ${error.message}`;
    }

    await interaction.reply({
      content: errorMessage,
      ephemeral: true,
    });
  }
}

async function handleDeleteTemplateConfirm(
  interaction: ButtonInteraction,
  templateId: string,
) {
  try {
    const result = await (await db())
      .collection<TemplateSchemaType>("templates")
      .deleteOne({ id: templateId });

    if (result.deletedCount === 0) {
      return interaction.update({
        content: "⚠️ Template not found or already deleted!",
        components: [],
      });
    }

    MyCache.del("templates");

    await interaction.update({
      content: "✅ Template deleted successfully!",
      components: [],
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    await interaction.update({
      content: "⚠️ An error occurred while deleting the template.",
      components: [],
    });
  }
}

async function handleTemplateButtonClick(
  interaction: ButtonInteraction,
  buttonId: string,
) {
  try {
    const templates = await (await db())
      .collection<TemplateSchemaType>("templates")
      .find({})
      .toArray();

    let buttonFound = false;
    let replyContent = "";

    for (const template of templates) {
      if (!template.buttonArr) continue;

      const button = template.buttonArr.find(btn => btn.buttonID === buttonId);
      if (button) {
        replyContent = button.buttonReplyContent;
        buttonFound = true;
        break;
      }
    }

    if (!buttonFound) {
      return interaction.reply({
        content:
          "⚠️ This button's action could not be found. Please contact an administrator.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: replyContent,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error handling button click:", error);
    await interaction.reply({
      content: "⚠️ An error occurred while processing your request.",
      ephemeral: true,
    });
  }
}
