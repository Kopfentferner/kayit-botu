require("dotenv").config(); // 1. EKLENDİ: Tokeni okuması için şart
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const express = require("express");

// 🌐 WEB SERVER
const app = express();
app.get("/", (req, res) => {
  res.send("Bot çalışıyor 🚀");
});
app.listen(3000, () => {
  console.log("🌍 Web server aktif");
});

// 🤖 DISCORD CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔴 ROL ID’LERİN
const KAYITLI_ROL_ID = "1253327741063794771";
const KAYITSIZ_ROL_ID = "1253313874342711337";

const PREFIX = "!";

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "kayıt") {
    // Yetki Kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ Yetkin yok.");
    }

    // 2. DÜZELTME: Kayıt edilecek kişiyi belirle (Etiketlenen kişi)
    const uye = message.mentions.members.first(); 
    
    // Argümanları düzeltiyoruz (Etiket 0. index olduğu için isim 1, yaş 2 olur)
    // Kullanım: !kayıt @kullanıcı İsim Yaş
    const isim = args[1]; 
    const yas = args[2];

    if (!uye || !isim || !yas) {
      return message.reply("❗ Kullanım: `!kayıt @Kullanıcı İsim Yaş`");
    }

    try {
      // 3. DÜZELTME: 'message.member' yerine 'uye' değişkenini kullanıyoruz
      await uye.setNickname(`${isim} | ${yas}`);
      await uye.roles.add(KAYITLI_ROL_ID);
      await uye.roles.remove(KAYITSIZ_ROL_ID);

      message.reply(`✅ **${uye.user.username}** başarıyla **${isim} | ${yas}** olarak kaydedildi.`);
    } catch (err) {
      console.error(err);
      message.reply("❌ Kayıt sırasında hata oluştu. (Botun rolü, verilecek rolden daha yukarıda olmalı!)");
    }
  }
});

client.login(process.env.TOKEN);