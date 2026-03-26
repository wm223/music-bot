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

// 🔥 حماية من الكراش
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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("p ")) return;

  const query = message.content.slice(2);
  const voice = message.member.voice.channel;

  if (!voice) return message.reply("❌ Join a voice channel first");

  try {
    // 🔍 search
    const result = await play.search(query, { limit: 1 });
    if (!result.length) return message.reply("❌ No song found");

    const song = result[0];

    message.reply(`🎶 Loading: **${song.title}**`);

    // 🎧 join voice
    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    // 🔥 ثابت جدًا
    await entersState(connection, VoiceConnectionStatus.Ready, 20000);

    const player = createAudioPlayer();

    connection.subscribe(player);

    // 🎵 stream
    const stream = await play.stream(song.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    player.play(resource);

    message.reply(`▶️ Playing: **${song.title}**`);

    // 🔥 أهم تعديل (لا يطلع من الروم إلا لما يوقف اللاعب فعليًا)
    let isPlaying = true;

    player.on(AudioPlayerStatus.Idle, () => {
      if (!isPlaying) return;
      isPlaying = false;

      setTimeout(() => {
        connection.destroy();
      }, 2000); // يعطي وقت قبل الخروج
    });

    // ❌ errors
    player.on("error", (err) => {
      console.log("Player error:", err);
      connection.destroy();
    });

    connection.on("stateChange", (oldS, newS) => {
      console.log(`Voice: ${oldS.status} → ${newS.status}`);
    });

  } catch (err) {
    console.log(err);
    message.reply("❌ Error playing song");
  }
});

client.login(process.env.TOKEN);
