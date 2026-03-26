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

      // 🔥 join voice (fixed)
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30000);
      } catch (error) {
        connection.destroy();
        console.log("Voice connection failed:", error);
        return message.reply("❌ Could not join voice channel");
      }

      // 🔥 fix YouTube issues
      await play.setToken({
        youtube: {
          cookie: process.env.YT_COOKIE || ""
        }
      });

      // search
      const result = await play.search(query, { limit: 1 });
      if (!result.length) return message.reply("No results.");

      // stream
      const stream = await play.stream(result[0].url);

      if (!stream || !stream.stream) {
        return message.reply("❌ Failed to get stream");
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      const player = createAudioPlayer();

      connection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Playing, () => {
        console.log("Playing audio...");
      });

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on("error", (err) => {
        console.error("PLAYER ERROR:", err);
      });

      message.reply(`🎶 Playing: **${result[0].title}**`);

    } catch (err) {
      console.error("ERROR:", err);
      message.reply("❌ Error playing song");
    }
  }
});

client.login(process.env.TOKEN)
  .then(() => console.log("Login success"))
  .catch(err => console.error("Login failed:", err));