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

// 🔥 Anti-crash system
process.on("unhandledRejection", err => {
  console.log("Unhandled error:", err);
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

async function playSong(message, query) {
  const voice = message.member.voice.channel;
  if (!voice) return message.reply("Join a voice channel first");

  try {
    const result = await play.search(query, { limit: 1 });
    if (!result.length) return message.reply("No results");

    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    // 🔥 Stability boost
    await entersState(connection, VoiceConnectionStatus.Ready, 30000);

    const stream = await play.stream(result[0].url, {
      discordPlayerCompatibility: true
    });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    const player = createAudioPlayer();

    connection.subscribe(player);
    player.play(resource);

    message.reply(`🎶 Now Playing: **${result[0].title}**`);

    // 🔁 auto cleanup
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    player.on("error", (e) => {
      console.log("Player error:", e);
      connection.destroy();
    });

  } catch (err) {
    console.log("ERROR:", err);
    message.reply("❌ Failed to play song, try again");
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("p ")) {
    const query = message.content.slice(2);
    playSong(message, query);
  }

  if (message.content === "ping") {
    message.reply("🏓 Pong!");
  }
});

client.login(process.env.TOKEN);
