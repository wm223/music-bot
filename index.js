const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require("@discordjs/voice");

const play = require("play-dl");

// 🔥 Anti crash (مهم جدًا)
process.on("unhandledRejection", (err) => {
  console.log("UnhandledRejection:", err);
});

process.on("uncaughtException", (err) => {
  console.log("UncaughtException:", err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ⚡ Fast search (optimized)
async function fastSearch(query) {
  try {
    const res = await play.search(query, { limit: 1 });
    return res?.[0] || null;
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

  if (!voice) return message.reply("❌ Join a voice channel first");

  try {
    // 🔍 SEARCH (fast + safe)
    const song = await fastSearch(query);
    if (!song) return message.reply("❌ No results found");

    message.reply(`🔍 Found: **${song.title}**`);

    // 🎧 JOIN VOICE (stable config)
    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    connection.on("stateChange", (o, n) => {
      console.log(`Voice: ${o.status} → ${n.status}`);
    });

    // 🔥 RETRY SYSTEM (Anti AbortError)
    let ok = false;

    for (let i = 0; i < 5; i++) {
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10000);
        ok = true;
        break;
      } catch (e) {
        console.log("Voice retry:", i + 1);
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    if (!ok) {
      connection.destroy();
      return message.reply("❌ Voice connection failed");
    }

    // 🎵 STREAM (stable mode)
    const stream = await play.stream(song.url, {
      discordPlayerCompatibility: true,
      quality: 0
    });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    const player = createAudioPlayer();

    connection.subscribe(player);
    player.play(resource);

    message.reply(`🎶 Now Playing: **${song.title}**`);

    // 🔁 Auto cleanup
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    player.on("error", (err) => {
      console.log("Player error:", err);
      connection.destroy();
    });

  } catch (err) {
    console.log("Fatal error:", err);
    message.reply("❌ Unexpected error occurred");
  }
});

client.login(process.env.TOKEN);
