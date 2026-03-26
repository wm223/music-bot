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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// 🔥 Anti crash system
process.on("unhandledRejection", (err) => {
  console.log("Unhandled error:", err);
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ⚡ Fast search helper
async function searchSong(query) {
  const res = await play.search(query, { limit: 1 });
  return res.length ? res[0] : null;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith("p ")) return;

  const query = message.content.slice(2);
  const voice = message.member.voice.channel;

  if (!voice) return message.reply("❌ Join a voice channel first");

  try {
    // ⚡ FAST SEARCH (optimized)
    const song = await searchSong(query);
    if (!song) return message.reply("❌ No song found");

    message.reply(`🔍 Found: **${song.title}**`);

    // 🎧 Join voice
    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    // 🔥 Stable voice retry system
    let ready = false;

    for (let i = 0; i < 3; i++) {
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15000);
        ready = true;
        break;
      } catch {
        console.log(`Voice retry ${i + 1}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!ready) {
      connection.destroy();
      return message.reply("❌ Voice connection failed");
    }

    // 🎵 Stream audio
    const stream = await play.stream(song.url, {
      discordPlayerCompatibility: true
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
    message.reply("❌ Error playing song");
  }
});

client.login(process.env.TOKEN);
