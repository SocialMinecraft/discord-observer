// this is a good guide:
// https://dev.to/fellipeutaka/creating-your-first-discord-bot-using-typescript-1eh6
import { Client } from "discord.js";
import { config } from "./config";

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("ready", () => {
    console.log("Discord bot is ready! 🤖");
});

client.login(config.DISCORD_TOKEN);