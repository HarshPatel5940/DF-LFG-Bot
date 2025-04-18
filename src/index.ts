import { Client, Events } from "discord.js";
import config from "./config";
import { LFGService } from "./services/lfgService";
import {
  getCommands,
  loadCommands,
  loadEvents,
  registerSlashCommands,
} from "./utils";
import { initDbCollections } from "./utils/database";

async function initialiseBot() {
  const client = new Client({
    intents: [32767],
  });

  try {
    await loadCommands();
    await loadEvents(client, getCommands());
    await initDbCollections();
    await registerSlashCommands();

    // Initialize LFG service
    LFGService.instance; // This will initialize the singleton

    // Register the event handler with the client parameter
    client.on(Events.InteractionCreate, async (interaction) => {
      try {
        // For LFG interactions
        const lfgHandler = require("./events/handleLFGInteractions").default;
        await lfgHandler.execute(interaction, client);

        // Your existing interaction code...
      } catch (error) {
        console.error("Error handling interaction:", error);
      }
    });

    await client.login(config.BOT_TOKEN);
  } catch (err) {
    console.log(err);
  }
}

initialiseBot();
