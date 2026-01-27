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

// 👥 BAŞVURULARI GÖRECEK YETKİLİ ROLLERİ (Buraya 3 rolü de ekle)
const YETKILI_ROLLER = [
  "1253285883826929810", 
  "1465050726576427263", 
  "1465056480871845949"
];

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 1. Kayıt Komutu
  if (command === "kayıt") {
    const isim = args[0];
    const yas = args[1];
    if (!isim || !yas) return message.reply("❗ Kullanım: `!kayıt İsim Yaş` ");
    try {
      await message.member.setNickname(`${isim} | ${yas}`);
      await message.member.roles.add(KAYITLI_ROL_ID);
      await message.member.roles.remove(KAYITSIZ_ROL_ID);
      message.reply(`✅ Kayıt başarılı: **${isim}**`);
    } catch (err) {
      message.reply("❌ Yetki hatası.");
    }
  }

  // 2. Başvuru Kurulumu
  if (command === "başvuru-kur" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const embed = new EmbedBuilder()
      .setTitle("Admin Başvuru")
      .setDescription("• **Ücretsiz** yetkiye başvurmak için aşağıdaki **butona** tıklayabilirsiniz.\n\n• Formu doldurduğunuzda size özel gizli bir kanal açılacaktır.")
      .setColor("#00ff00");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("admin_basvuru_btn").setLabel("Admin Başvuru").setEmoji("📩").setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "admin_basvuru_btn") {
    const modal = new ModalBuilder().setCustomId("admin_basvuru_form").setTitle("Admin Başvuru Formu");
    const inputs = [
      new TextInputBuilder().setCustomId("isim_yas").setLabel("İsim ve Yaşınız").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("sunucu_sure").setLabel("Sunucudaki süreniz?").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("komut_bilgisi").setLabel("Adminlik komutlarını biliyor musunuz?").setStyle(TextInputStyle.Short).setRequired(true),
      new TextInputBuilder().setCustomId("steam_link").setLabel("Steam Profil Linkiniz").setStyle(TextInputStyle.Short).setRequired(true)
    ];
    inputs.forEach(input => modal.addComponents(new ActionRowBuilder().addComponents(input)));
    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "admin_basvuru_form") {
    const category = interaction.guild.channels.cache.find(c => c.name === "Başvurular" && c.type === ChannelType.GuildCategory);
    if (!category) return interaction.reply({ content: "❌ 'Başvurular' kategorisi bulunamadı!", ephemeral: true });

    const basvuruKanallari = interaction.guild.channels.cache.filter(c => c.name.startsWith("basvuru-") && c.parentId === category.id);
    let nextNum = 1;
    if (basvuruKanallari.size > 0) {
      const numbers = basvuruKanallari.map(c => parseInt(c.name.split("-")[1])).filter(n => !isNaN(n));
      if (numbers.length > 0) nextNum = Math.max(...numbers) + 1;
    }

    // 🛡️ İZİN AYARLARI
    const permissions = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Herkese Kapat
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }, // Başvuran Kişi
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }, // Bot
    ];

    // 3 Yetkili Rolünü İzinlere Ekle
    YETKILI_ROLLER.forEach(roleId => {
      permissions.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    });

    const newChannel = await interaction.guild.channels.create({
      name: `basvuru-${nextNum}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: permissions
    });

    const logEmbed = new EmbedBuilder()
      .setTitle(`Yeni Başvuru: #${nextNum}`)
      .addFields(
        { name: "Aday:", value: `<@${interaction.user.id}>` },
        { name: "İsim/Yaş:", value: interaction.fields.getTextInputValue("isim_yas") },
        { name: "Süre:", value: interaction.fields.getTextInputValue("sunucu_sure") },
        { name: "Komut Bilgisi:", value: interaction.fields.getTextInputValue("komut_bilgisi") },
        { name: "Steam:", value: interaction.fields.getTextInputValue("steam_link") }
      )
      .setColor("Blue")
      .setTimestamp();

    const yetkiliEtiket = YETKILI_ROLLER.map(id => `<@&${id}>`).join(" ");
    await newChannel.send({ content: `${yetkiliEtiket} Yeni başvuru geldi!`, embeds: [logEmbed] });
    await interaction.reply({ content: `✅ Kanalınız açıldı: <#${newChannel.id}>`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);