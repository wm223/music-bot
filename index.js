const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

const play = require("play-dl");
const express = require("express");

// 🌐 keep alive server (Render fix)
const app = express();
app.get("/", (req, res) => res.send("Bot alive"));
app.listen(3000, () => console.log("🌐 Web server running"));

// 💥 anti crash
process.on("unhandledRejection", console.log);
process.on("uncaughtException", console.log);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

// 🔍 safer search
async function searchSong(query) {
  try {
    const res = await play.search(query, { limit: 1 });
    return res?.[0];
  } catch {
    return null;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("p ")) return;

  const query = message.content.slice(2);
  const voice = message.member.voice.channel;

  if (!voice) return message.reply("❌ Join a voice channel first");

  const song = await searchSong(query);
  if (!song) return message.reply("❌ No results found");

  message.reply(`🔍 Found: **${song.title}**`);

  let connection;

  try {
    connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    connection.rejoinAttempts = 5;

    connection.on("stateChange", (o, n) => {
      console.log(`Voice: ${o.status} → ${n.status}`);
    });

    connection.on("error", (err) => {
      console.log("Voice error:", err);
    });

    // 🔥 MUCH stronger stability timeout
    await entersState(
      connection,
      VoiceConnectionStatus.Ready,
      25000
    );

  } catch (err) {
    console.log("Join failed:", err);
    if (connection) connection.destroy();
    return message.reply("❌ Failed to join voice (unstable network)");
  }

  // 🎧 stream safe mode
  let stream;
  try {
    stream = await play.stream(song.url, {
      discordPlayerCompatibility: true,
      quality: 2
    });
  } catch (err) {
    console.log("Stream error:", err);
    connection.destroy();
    return message.reply("❌ Stream failed");
  }

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  connection.subscribe(player);

  player.play(resource);

  message.reply(`🎶 Now Playing: **${song.title}**`);

  // 🔥 HARD anti-disconnect system
  const keepAlive = setInterval(() => {
    if (!connection) return;
    if (connection.state.status === "ready") {
      connection.ping?.();
    }
  }, 20000);

  player.on(AudioPlayerStatus.Idle, () => {
    clearInterval(keepAlive);
    connection.destroy();
  });

  player.on("error", (err) => {
    console.log("Player error:", err);
    clearInterval(keepAlive);
    connection.destroy();
  });

  connection.on("stateChange", (oldS, newS) => {
    if (newS.status === "destroyed") {
      clearInterval(keepAlive);
    }
  });
});

client.login(process.env.TOKEN);
