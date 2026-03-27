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

// 🔥 Anti crash
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
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 🔍 Fast Search
async function search(query) {
  try {
    const res = await play.search(query, { limit: 1 });
    return res?.[0] || null;
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

  try {
    const song = await search(query);
    if (!song) return message.reply("❌ No results found");

    message.reply(`🔍 Found: **${song.title}**`);

    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // 🔄 Debug
    connection.on("stateChange", (o, n) => {
      console.log(`Voice: ${o.status} → ${n.status}`);
    });

    // 🔥 Retry connection
    let connected = false;
    for (let i = 0; i < 5; i++) {
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15000);
        connected = true;
        break;
      } catch {
        console.log(`Retry ${i + 1}`);
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    if (!connected) {
      connection.destroy();
      return message.reply("❌ Voice connection failed");
    }

    // 🎵 Stream (محسّن)
    let stream;
    try {
      stream = await play.stream(song.url, {
        discordPlayerCompatibility: true,
        quality: 2
      });
    } catch (err) {
      console.log("Stream error:", err);
      connection.destroy();
      return message.reply("❌ Failed to get audio");
    }

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });

    resource.volume.setVolume(0.7);

    const player = createAudioPlayer();
    connection.subscribe(player);

    player.play(resource);

    message.reply(`🎶 Now Playing: **${song.title}**`);

    let ended = false;

    player.on(AudioPlayerStatus.Idle, () => {
      if (ended) return;
      ended = true;

      setTimeout(() => {
        connection.destroy();
      }, 2000);
    });

    player.on("error", (err) => {
      console.log("Player error:", err);
      connection.destroy();
      message.reply("❌ Player error");
    });

  } catch (err) {
    console.log("Fatal:", err);
    message.reply("❌ Unexpected error");
  }
});

client.login(process.env.TOKEN);
