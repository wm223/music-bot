const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ping
  if (message.content === "ping") {
    message.reply("🏓 Pong!");
  }

  // play
  if (message.content.startsWith("p ")) {
    try {
      const args = message.content.split(" ").slice(1).join(" ");
      if (!args) return message.reply("❗ اكتب اسم الأغنية");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply("❗ ادخل روم صوتي أولاً");

      const searchResult = await ytSearch(args);
      const video = searchResult.videos[0];
      if (!video) return message.reply("❌ ما لقيت الأغنية");

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const stream = ytdl(video.url, { filter: "audioonly" });
      const resource = createAudioResource(stream);
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      message.reply(`🎶 جاري تشغيل: **${video.title}**`);
    } catch (err) {
      console.error(err);
      message.reply("❌ حصل خطأ أثناء التشغيل");
    }
  }
});

client.login(process.env.TOKEN)
  .then(() => console.log("Login success"))
  .catch(err => console.error("Login failed:", err));
