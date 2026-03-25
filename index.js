const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus
} = require("@discordjs/voice");

const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ping command
  if (message.content === "ping") {
    return message.reply("Pong 🏓");
  }

  // play command
  if (message.content.startsWith("p ")) {
    try {
      const query = message.content.slice(2).trim();
      if (!query) return message.reply("Please provide a song name.");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply("Join a voice channel first.");

      // search youtube
      const search = await ytSearch(query);
      const video = search.videos[0];
      if (!video) return message.reply("No results found.");

      // join voice
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 20000);

      // stream audio
      const stream = ytdl(video.url, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25
      });

      const resource = createAudioResource(stream);

      const player = createAudioPlayer();

      connection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on("error", (err) => {
        console.error("PLAYER ERROR:", err);
      });

      message.reply(`Now playing: **${video.title}** 🎶`);

    } catch (err) {
      console.error("ERROR:", err);
      message.reply("Error playing the song.");
    }
  }
});

client.login(process.env.TOKEN)
  .then(() => console.log("Login success"))
  .catch(err => console.error("Login failed:", err));