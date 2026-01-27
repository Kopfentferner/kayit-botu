require("dotenv").config();
const { 
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, 
  EmbedBuilder, InteractionType, ChannelType, PermissionFlagsBits 
} = require("discord.js");
const express = require("express");

// 🌐 WEB SERVER
const app = express();
app.get("/", (req, res) => res.send("Bot Aktif! 🚀"));
app.listen(3000, () => console.log("🌍 Web server aktif"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔴 AYARLAR
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

  // 1. Kendi Kendini Kayıt Etme
  if (command === "kayıt") {
    const isim = args[0];
    const yas = args[1];
    if (!isim || !yas) return message.reply("❗ Kullanım: `!kayıt İsim Yaş` ");

    try {
      await message.member.setNickname(`${isim} | ${yas}`);
      await message.member.roles.add(KAYITLI_ROL_ID);
      await message.member.roles.remove(KAYITSIZ_ROL_ID);
      message.reply(`✅ Hoş geldin **${isim}**, kaydın yapıldı!`);
    } catch (err) {
      message.reply("❌ Rol verme yetkim yetmiyor veya isim değiştiremiyorum.");
    }
  }

  // 2. Başvuru Butonunu Kurma
  if (command === "başvuru-kur" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const embed = new EmbedBuilder()
      .setTitle("Admin Başvuru")
      .setDescription("• **Ücretsiz** yetkiye başvurmak için aşağıdaki **butona** tıklayabilirsiniz.\n\n• Çıkan formu **eksiksiz** doldurduktan sonra sizin için **özel bir başvuru kanalı** açılacaktır.")
      .setColor("#00ff00");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_basvuru_btn")
        .setLabel("Admin Başvuru")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// 🖱️ ETKİLEŞİMLER (Buton, Form ve Kanal Açma)
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "admin_basvuru_btn") {
    const modal = new ModalBuilder().setCustomId("admin_basvuru_form").setTitle("Admin Başvuru Formu");

    const inputs = [
      new TextInputBuilder().setCustomId("isim_yas").setLabel("İsim ve Yaşınız").setPlaceholder("Ahmet, 20").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("sunucu_sure").setLabel("Sunucudaki süreniz? (!surem)").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("komut_bilgisi").setLabel("Adminlik komutlarını biliyor musunuz?").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("steam_link").setLabel("Steam Profil Linkiniz").setStyle(TextInputStyle.Short).setRequired(true)
    ];

    inputs.forEach(input => modal.addComponents(new ActionRowBuilder().addComponents(input)));
    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "admin_basvuru_form") {
    const isimYas = interaction.fields.getTextInputValue("isim_yas");
    const sure = interaction.fields.getTextInputValue("sunucu_sure");
    const komutlar = interaction.fields.getTextInputValue("komut_bilgisi");
    const steam = interaction.fields.getTextInputValue("steam_link");

    // 1. Kategoriyi Bul
    const category = interaction.guild.channels.cache.find(c => c.name === "Başvurular" && c.type === ChannelType.GuildCategory);
    if (!category) return interaction.reply({ content: "❌ 'Başvurular' kategorisi bulunamadı!", ephemeral: true });

    // 2. Sıradaki Kanal Numarasını Hesapla
    const basvuruKanallari = interaction.guild.channels.cache.filter(c => c.name.startsWith("basvuru-") && c.parentId === category.id);
    let nextNum = 1;
    if (basvuruKanallari.size > 0) {
      const numbers = basvuruKanallari.map(c => parseInt(c.name.split("-")[1])).filter(n => !isNaN(n));
      if (numbers.length > 0) nextNum = Math.max(...numbers) + 1;
    }

    // 3. Kanalı Oluştur
    const newChannel = await interaction.guild.channels.create({
      name: `basvuru-${nextNum}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }
      ]
    });

    const logEmbed = new EmbedBuilder()
      .setTitle(`Yeni Başvuru: #${nextNum}`)
      .addFields(
        { name: "Aday:", value: `<@${interaction.user.id}>` },
        { name: "İsim/Yaş:", value: isimYas },
        { name: "Süre:", value: sure },
        { name: "Komut Bilgisi:", value: komutlar },
        { name: "Steam:", value: steam }
      )
      .setColor("Blue")
      .setTimestamp();

    await newChannel.send({ content: `@everyone Yeni başvuru geldi!`, embeds: [logEmbed] });
    await interaction.reply({ content: `✅ Başvurunuz alındı! Kanalınız açıldı: <#${newChannel.id}>`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);