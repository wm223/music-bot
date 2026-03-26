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

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 🎧 play command
  if (message.content.startsWith("p ")) {
    try {
      const query = message.content.slice(2).trim();

      if (!query) {
        return message.reply("Write a song name.");
      }

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.reply("Join a voice channel first.");
      }

      // join voice
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 20000);

      // search + stream
      const result = await play.search(query, { limit: 1 });
      if (!result.length) return message.reply("No results.");

      const stream = await play.stream(result[0].url);

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      const player = createAudioPlayer();

      connection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on("error", (err) => {
        console.error(err);
      });

      message.reply(`🎶 Playing: **${result[0].title}**`);

    } catch (err) {
      console.error(err);
      message.reply("❌ Error playing song");
    }
  }
});

client.login(process.env.TOKEN);