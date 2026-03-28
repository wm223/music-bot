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

// 🌐 keep alive server (Render requirement)
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000, () => console.log("🌐 Web server running"));

// 💥 prevent crashes
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

// 🔍 search
async function searchSong(query) {
  try {
    const res = await play.search(query, { limit: 1 });
    return res?.[0];
  } catch (e) {
    console.log("Search error:", e);
    return null;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("p ")) return;

  const query = message.content.slice(2);
  const voice = message.member.voice.channel;

  if (!voice) return message.reply("❌ ادخل روم صوتي أول");

  const song = await searchSong(query);
  if (!song) return message.reply("❌ ما لقيت شيء");

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

    // 🔥 IMPORTANT: stability boost
    connection.on("stateChange", (o, n) => {
      console.log(`[VOICE] ${o.status} → ${n.status}`);
    });

    connection.on("error", (err) => {
      console.log("Voice error:", err);
    });

    await entersState(
      connection,
      VoiceConnectionStatus.Ready,
      35000 // ⬅️ أقصى وقت للاستقرار
    );

  } catch (err) {
    console.log("Join failed:", err);
    if (connection) connection.destroy();
    return message.reply("❌ فشل دخول الروم (شبكة السيرفر ضعيفة)");
  }

  // 🎧 stream safe mode
  let stream;
  try {
    stream = await play.stream(song.url);
  } catch (err) {
    console.log("Stream error:", err);
    connection.destroy();
    return message.reply("❌ مشكلة في تشغيل الصوت");
  }

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
    inlineVolume: true
  });

  resource.volume.setVolume(0.5);

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  connection.subscribe(player);

  player.play(resource);

  message.reply(`🎶 Now Playing: **${song.title}**`);

  // 🧠 cleanup system
  const cleanup = () => {
    try {
      connection.destroy();
    } catch {}
  };

  player.on(AudioPlayerStatus.Idle, cleanup);

  player.on("error", (err) => {
    console.log("Player error:", err);
    cleanup();
  });

  connection.on("stateChange", (oldS, newS) => {
    if (newS.status === "destroyed") cleanup();
  });
});

client.login(process.env.TOKEN);
