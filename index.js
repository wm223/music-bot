if (message.content.startsWith("p ")) {
  try {
    const args = message.content.split(" ").slice(1).join(" ");
    if (!args) return message.reply("❗ name of song");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("❗enter the room");

    const searchResult = await ytSearch(args);
    const video = searchResult.videos[0];
    if (!video) return message.reply("❌ I couldn't find the song");

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const stream = await play.stream(video.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    message.reply(`🎶 Starting up: **${video.title}**`);
  } catch (err) {
    console.error(err);
    message.reply("❌ There is a problem");
  }
}
