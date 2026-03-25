const { Client, GatewayIntentBits } = require("discord.js");
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus
} = require("@discordjs/voice");

const play = require("play-dl");
const ytSearch = require("yt-search");

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

  // ping
  if (message.content === "ping") {
    message.reply("Pong! 🏓");
  }

  // play command
  if (message.content.startsWith("p ")) {
    try {
      const query = message.content.slice(2);
      if (!query) return message.reply("Please provide a song name.");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply("Join a voice channel first.");

      const search = await ytSearch(query);
      const video = search.videos[0];
      if (!video) return message.reply("No results found.");

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 20000);

      const stream = await play.stream(video.url);

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
        console.error("Player error:", err.message);
      });

      message.reply(`Now playing: **${video.title}**`);
    } catch (err) {
      console.error(err);
      message.reply("Error playing the song.");
    }
  }
});

client.login(process.env.TOKEN)
  .then(() => console.log("Login success"))
  .catch(err => console.error("Login failed:", err));
