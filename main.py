import discord
from discord.ext import commands
import asyncio
import os
from flask import Flask
from threading import Thread

# -------------------- 🌐 RENDER 7/24 --------------------
app = Flask('')

@app.route('/')
def home():
    return "Bot Aktif 🚀"

def run():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    Thread(target=run).start()

# -------------------- 🔧 AYARLAR --------------------
TOKEN = os.getenv("TOKEN")

# KRİTİK NOKTA: Intentler açık olmalı
intents = discord.Intents.default()
intents.message_content = True  # Mesajları okuyabilmesi için
intents.members = True          # Rol verme/isim değiştirme için

bot = commands.Bot(command_prefix=".", intents=intents)

BASVURULAR_KATEGORI_ADI = "Başvurular"
YETKILI_ROLLER = [
    1253285883826929810,
    1465050726576427263,
    1465056480871845949
]

KAYITSIZ_ROL_ID = 1253313874342711337 
KAYITLI_ROL_ID = 1253327741063794771

# -------------------- 🔒 TICKET KAPATMA --------------------
class TicketKapatView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Başvuruyu Kapat & Sil", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="btn_kapat")
    async def kapat(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("⏳ Kanal siliniyor...", ephemeral=True)
        await asyncio.sleep(3)
        await interaction.channel.delete()

# -------------------- 📝 MODALLAR (FORMLAR) --------------------
class AdminBasvuruModal(discord.ui.Modal, title="Admin Başvuru Formu"):
    isim = discord.ui.TextInput(label="İsim / Yaş", required=True)
    deneyim = discord.ui.TextInput(label="Adminlik Deneyimi", style=discord.TextStyle.paragraph, required=True)
    steam = discord.ui.TextInput(label="Steam Linki", required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await basvuru_kanali_olustur(interaction, "admin", {
            "İsim / Yaş": self.isim.value,
            "Deneyim": self.deneyim.value,
            "Steam": self.steam.value
        })

class VIPBasvuruModal(discord.ui.Modal, title="VIP Başvuru Formu"):
    isim = discord.ui.TextInput(label="İsim / Yaş", required=True)
    neden = discord.ui.TextInput(label="Neden VIP?", style=discord.TextStyle.paragraph, required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await basvuru_kanali_olustur(interaction, "vip", {
            "İsim / Yaş": self.isim.value,
            "Neden": self.neden.value
        })

# -------------------- 📂 KANAL OLUŞTURMA --------------------
async def basvuru_kanali_olustur(interaction, tur, veriler):
    guild = interaction.guild
    category = discord.utils.get(guild.categories, name=BASVURULAR_KATEGORI_ADI)

    if not category:
        return await interaction.response.send_message("❌ Kategori bulunamadı!", ephemeral=True)

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(read_messages=False),
        interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True),
        guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True)
    }
    for rid in YETKILI_ROLLER:
        role = guild.get_role(rid)
        if role: overwrites[role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

    channel = await guild.create_text_channel(name=f"{tur}-{interaction.user.name}", category=category, overwrites=overwrites)
    
    embed = discord.Embed(title=f"📌 Yeni {tur.upper()} Başvurusu", color=discord.Color.blue())
    for k, v in veriler.items(): embed.add_field(name=k, value=v, inline=False)
    
    await channel.send(content=" ".join([f"<@&{r}>" for r in YETKILI_ROLLER]), embed=embed, view=TicketKapatView())
    await interaction.response.send_message(f"✅ Başvuru kanalın oluşturuldu: {channel.mention}", ephemeral=True)

# -------------------- 🔘 ANA PANEL --------------------
class AnaMenu(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Admin Başvuru", style=discord.ButtonStyle.success, emoji="🛡️", custom_id="btn_adm")
    async def admin(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(AdminBasvuruModal())

    @discord.ui.button(label="VIP Başvuru", style=discord.ButtonStyle.primary, emoji="💎", custom_id="btn_vip")
    async def vip(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(VIPBasvuruModal())

# -------------------- ⚙️ KOMUTLAR --------------------
@bot.event
async def on_ready():
    bot.add_view(AnaMenu())
    bot.add_view(TicketKapatView())
    print(f'✅ {bot.user} AKTİF!')

@bot.command()
@commands.has_permissions(administrator=True)
async def panel(ctx):
    embed = discord.Embed(title="Başvuru Merkezi", description="Butonlara basarak başvurabilirsiniz.", color=discord.Color.gold())
    await ctx.send(embed=embed, view=AnaMenu())

@bot.command(name="kayıt")
@commands.has_any_role(*YETKILI_ROLLER)
async def kayit(ctx, üye: discord.Member, *, isim_yas: str):
    try:
        await üye.edit(nick=isim_yas)
        await üye.add_roles(ctx.guild.get_role(KAYITLI_ROL_ID))
        await üye.remove_roles(ctx.guild.get_role(KAYITSIZ_ROL_ID))
        await ctx.send(f"✅ {üye.mention} başarıyla kaydedildi.")
    except Exception as e:
        await ctx.send(f"❌ Hata oluştu: {e}")

# -------------------- 🚀 ÇALIŞTIRMA --------------------
keep_alive()
if TOKEN:
    bot.run(TOKEN)