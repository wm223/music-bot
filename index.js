const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require("@discordjs/voice");

const play = require("play-dl");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Bot Running"));
app.listen(3000, () => console.log("🌐 Web server running"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const queues = new Map();

client.once("ready", () => {
  console.log(`🔥 ${client.user.tag} is online`);
});

// 🎵 PLAY
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args[0];

  const voice = msg.member.voice.channel;

  if (cmd === "p") {
    if (!voice) return msg.reply("❌ ادخل روم صوتي");

    const query = args.slice(1).join(" ");

    const result = await play.search(query, { limit: 1 });
    if (!result.length) return msg.reply("❌ ما لقيت");

    const song = result[0];

    let queue = queues.get(msg.guild.id);

    if (!queue) {
      queue = {
        songs: [],
        player: createAudioPlayer(),
        connection: null,
        loop: false,
        volume: 0.5
      };
      queues.set(msg.guild.id, queue);
    }

    queue.songs.push(song);

    const embed = new EmbedBuilder()
      .setTitle("🎶 Added to Queue")
      .setDescription(song.title)
      .setColor("Blue");

    msg.reply({ embeds: [embed] });

    if (!queue.connection) {
      try {
        const connection = joinVoiceChannel({
          channelId: voice.id,
          guildId: msg.guild.id,
          adapterCreator: msg.guild.voiceAdapterCreator
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 20000);

        queue.connection = connection;
        connection.subscribe(queue.player);

        playSong(msg.guild.id);
      } catch {
        return msg.reply("❌ Voice error");
      }
    }
  }

  // SKIP
  if (cmd === "skip") {
    const queue = queues.get(msg.guild.id);
    if (!queue) return;
    queue.player.stop();
    msg.reply("⏭ Skipped");
  }

  // STOP
  if (cmd === "stop") {
    const queue = queues.get(msg.guild.id);
    if (!queue) return;

    queue.songs = [];
    queue.player.stop();
    queue.connection.destroy();
    queues.delete(msg.guild.id);

    msg.reply("🛑 Stopped");
  }

  // QUEUE
  if (cmd === "q") {
    const queue = queues.get(msg.guild.id);
    if (!queue || !queue.songs.length)
      return msg.reply("❌ Empty");

    msg.reply(
      queue.songs.map((s, i) => `${i + 1}. ${s.title}`).join("\n")
    );
  }

  // LOOP
  if (cmd === "loop") {
    const queue = queues.get(msg.guild.id);
    if (!queue) return;

    queue.loop = !queue.loop;
    msg.reply(`🔁 Loop: ${queue.loop}`);
  }

  // VOLUME
  if (cmd === "vol") {
    const queue = queues.get(msg.guild.id);
    if (!queue) return;

    const v = Number(args[1]);
    if (isNaN(v) || v < 0 || v > 1)
      return msg.reply("❌ من 0 إلى 1");

    queue.volume = v;
    msg.reply(`🔊 Volume: ${v}`);
  }
});

// 🎧 تشغيل
async function playSong(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  const song = queue.songs[0];
  if (!song) {
    queue.connection.destroy();
    queues.delete(guildId);
    return;
  }

  try {
    const stream = await play.stream(song.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });

    resource.volume.setVolume(queue.volume);

    queue.player.play(resource);

    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (!queue.loop) queue.songs.shift();
      playSong(guildId);
    });

  } catch {
    queue.songs.shift();
    playSong(guildId);
  }
}

client.login(process.env.TOKEN);
