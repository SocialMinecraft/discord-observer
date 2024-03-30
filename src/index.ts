// this is a good guide:
// https://dev.to/fellipeutaka/creating-your-first-discord-bot-using-typescript-1eh6
import {Client, VoiceState} from "discord.js";
import { config } from "./config";
import {connect, NatsConnection} from "nats";
var protobuf = require("protobufjs");

let nc: NatsConnection;
let talking :string[] = [];

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages", "GuildMembers", "GuildVoiceStates", "MessageContent"],
});

client.on("guildMemberAdd", async (data) => {
    protobuf.load("./proto/discord_member.proto", (err: any, root: any) => {
        if (err)
            throw err;

        // Obtain a message type
        const msg = root.lookupType("DiscordMemberJoined");

        let payload = {
            guildId: data.guild.id,
            memberId: data.id,
            username: data.user.username,
        };
        const errMsg = msg.verify(payload);
        if (errMsg) {
            console.log(errMsg);
            return;
        }
        const message = msg.create(payload);
        const buffer = msg.encode(message).finish();
        nc.publish("discord.member.joined", buffer);
    });
});

client.on("guildMemberRemove", async (data) => {
    protobuf.load("./proto/discord_member.proto", (err: any, root: any) => {
        if (err)
            throw err;

        // Obtain a message type
        const msg = root.lookupType("DiscordMemberLeft");

        let payload = {
            guildId: data.guild.id,
            memberId: data.id,
            username: data.user.username,
        };
        const errMsg = msg.verify(payload);
        if (errMsg) {
            console.log(errMsg);
            return;
        }
        const message = msg.create(payload);
        const buffer = msg.encode(message).finish();
        nc.publish("discord.member.left", buffer);
    });
});

client.on("voiceStateUpdate", async (oldState, data ) => {
    const user_id = data.id;
    const channel_id = data.channelId;
    //console.log(user_id, channel_id);

    if (talking.includes(user_id) && channel_id == null) {
        // user is no longer talking.
        talking = talking.filter(id => id != user_id);
        //console.log("stop");
        leaveVoiceChatMsg(data);

    }
    if (!talking.includes(user_id) && channel_id != null) {
        // user has started talking
        talking.push(user_id);
        //console.log("start");
        enterVoiceChatMsg(data);
    }

});

client.on("messageCreate", async (data) => {
    protobuf.load("./proto/discord_message.proto", (err: any, root: any) => {
        if (err)
            throw err;

        // Obtain a message type
        const msg = root.lookupType("DiscordMessageSent");

        let payload = {
            guildId: data.guildId,
            memberId: data.id,
            username: data.member?.nickname || data.member?.user.username,
            channelId: data.channelId,
            message: data.content,
        };
        const errMsg = msg.verify(payload);
        if (errMsg) {
            console.log(errMsg);
            return;
        }
        const message = msg.create(payload);
        const buffer = msg.encode(message).finish();
        nc.publish("discord.message.sent", buffer);
    });
});

client.once("ready", () => {
    console.log("Discord bot is ready! 🤖");
});

const start = async () => {
    // Connect to nats
    try {
        nc = await connect({
            servers: config.NATS_URL,
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    // connect to disocrd
    client.login(config.DISCORD_TOKEN);
}
start();


function enterVoiceChatMsg(data: VoiceState) {
    protobuf.load("./proto/discord_voice.proto", (err: any, root: any) => {
        if (err)
            throw err;

        // Obtain a message type
        const DiscordVoiceEntered = root.lookupType("DiscordVoiceEntered");

        let payload = {
            guildId: data.guild.id,
            memberId: data.id,
            username: data.member?.nickname || data.member?.user.username,
            channelId: data.channelId,
        };

        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        const errMsg = DiscordVoiceEntered.verify(payload);
        if (errMsg) {
            console.log(errMsg);
            return;
        }

        // Create a new message
        const message = DiscordVoiceEntered.create(payload); // or use .fromObject if conversion is necessary

        // Encode a message to an Uint8Array (browser) or Buffer (node)
        const buffer = DiscordVoiceEntered.encode(message).finish();

        //console.log(message);
        //console.log(buffer);
        //console.log(DiscordVoiceEntered.decode(buffer));
        nc.publish("discord.voice.entered", buffer);
    });
}

function leaveVoiceChatMsg(data: VoiceState) {
    protobuf.load("./proto/discord_voice.proto", (err: any, root: any) => {
        if (err)
            throw err;

        // Obtain a message type
        const msg = root.lookupType("DiscordVoiceLeft");

        let payload = {
            guildId: data.guild.id,
            memberId: data.id,
            username: data.member?.nickname || data.member?.user.username,
        };

        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        const errMsg = msg.verify(payload);
        if (errMsg) {
            console.log(errMsg);
            return;
        }

        // Create a new message
        const message = msg.create(payload); // or use .fromObject if conversion is necessary

        // Encode a message to an Uint8Array (browser) or Buffer (node)
        const buffer = msg.encode(message).finish();

        //console.log(message);
        //console.log(buffer);
        //console.log(msg.decode(buffer));
        nc.publish("discord.voice.left", buffer);
    });
}