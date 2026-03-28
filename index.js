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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("p ")) return;

  const query = message.content.slice(2);
  const voice = message.member.voice.channel;

  if (!voice) return message.reply("Join VC");

  try {
    const result = await play.search(query, { limit: 1 });
    if (!result.length) return message.reply("No result");

    const song = result[0];

    const connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    // 🔥 FIX ABORT ERROR (strong retry)
    let connected = false;
    for (let i = 0; i < 7; i++) {
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10000);
        connected = true;
        break;
      } catch {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!connected) {
      connection.destroy();
      return message.reply("Voice failed");
    }

    const stream = await play.stream(song.url, {
      discordPlayerCompatibility: true
    });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    player.play(resource);

    message.reply(`🎶 ${song.title}`);

    player.on(AudioPlayerStatus.Idle, () => {
      setTimeout(() => connection.destroy(), 3000);
    });

    player.on("error", (err) => {
      console.log(err);
      connection.destroy();
    });

  } catch (err) {
    console.log(err);
    message.reply("Error");
  }
});

client.login(process.env.TOKEN);
