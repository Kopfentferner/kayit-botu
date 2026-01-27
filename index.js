require("dotenv").config(); // .env dosyasını okumak için şart
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// 🌐 WEB SERVER (Render için)
const app = express();
app.get("/", (req, res) => res.send("Bot 7/24 Aktif! 🚀"));
app.listen(3000, () => console.log("🌍 Web server aktif"));

// 🤖 DISCORD CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔴 AYARLAR (ID'lerini kontrol et)
const KAYITLI_ROL_ID = "1253327741063794771";
const KAYITSIZ_ROL_ID = "1253313874342711337";
const PREFIX = "!";

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "kayıt") {
    const isim = args[0];
    const yas = args[1];

    // İsim veya yaş eksikse uyar
    if (!isim || !yas) {
      return message.reply("❗ Kullanım: `!kayıt İsim Yaş` (Örn: `!kayıt Ahmet 18`)");
    }

    try {
      // Kullanıcının ismini değiştir (İsim | Yaş formatı)
      await message.member.setNickname(`${isim} | ${yas}`);
      
      // Rolleri güncelle
      await message.member.roles.add(KAYITLI_ROL_ID);
      await message.member.roles.remove(KAYITSIZ_ROL_ID);

      message.reply(`✅ Kayıt işlemin başarıyla tamamlandı, hoş geldin **${isim}**!`);
    } catch (err) {
      console.error(err);
      message.reply("❌ Kayıt sırasında bir hata oluştu. (Botun rolü senin rolünden üstte olmalı!)");
    }
  }
});

client.login(process.env.TOKEN);