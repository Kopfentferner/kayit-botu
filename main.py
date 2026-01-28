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

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
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

    @discord.ui.button(
        label="Başvuruyu Kapat & Sil",
        style=discord.ButtonStyle.danger,
        emoji="🔒",
        custom_id="btn_kapat_unique"
    )
    async def kapat(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("⏳ Kanal 5 saniye içinde siliniyor...", ephemeral=True)
        await asyncio.sleep(5)
        await interaction.channel.delete()

# -------------------- 📝 FORMLAR (MODALS) --------------------
class AdminBasvuruModal(discord.ui.Modal, title="Admin Başvuru Formu"):
    isim_yas = discord.ui.TextInput(label="İsim / Yaş", placeholder="Örn: Ahmet / 20", required=True)
    sure = discord.ui.TextInput(label="Sunucudaki Süreniz", placeholder="Örn: 3 Ay", required=True)
    bilgi = discord.ui.TextInput(label="Adminlik bilginiz var mı?", style=discord.TextStyle.paragraph, required=True)
    steam = discord.ui.TextInput(label="Steam Profil Linki", placeholder="https://steamcommunity.com/id/...", required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await basvuru_kanali_olustur(interaction, "admin", {
            "İsim / Yaş": self.isim_yas.value,
            "Sunucu Süresi": self.sure.value,
            "Admin Bilgisi": self.bilgi.value,
            "Steam": self.steam.value
        })

class VIPBasvuruModal(discord.ui.Modal, title="VIP Başvuru Formu"):
    isim = discord.ui.TextInput(label="İsim", placeholder="İsminiz", required=True)
    yas = discord.ui.TextInput(label="Yaş", placeholder="Yaşınız", required=True)
    neden = discord.ui.TextInput(label="Neden VIP olmak istiyorsunuz?", style=discord.TextStyle.paragraph, required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await basvuru_kanali_olustur(interaction, "vip", {
            "İsim": self.isim.value,
            "Yaş": self.yas.value,
            "Başvuru Nedeni": self.neden.value
        })

# -------------------- 📂 KANAL OLUŞTURMA --------------------
async def basvuru_kanali_olustur(interaction, tur, alanlar):
    guild = interaction.guild
    category = discord.utils.get(guild.categories, name=BASVURULAR_KATEGORI_ADI)

    if not category:
        return await interaction.response.send_message(f"❌ `{BASVURULAR_KATEGORI_ADI}` kategorisi bulunamadı!", ephemeral=True)

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
    for k, v in alanlar.items(): embed.add_field(name=k, value=v, inline=False)
    
    await channel.send(content=" ".join([f"<@&{r}>" for r in YETKILI_ROLLER]), embed=embed, view=TicketKapatView())
    await interaction.response.send_message(f"✅ Başvuru kanalın oluşturuldu: {channel.mention}", ephemeral=True)

# -------------------- 🔘 ANA PANEL --------------------
class AnaMenu(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Admin Başvuru", style=discord.ButtonStyle.success, emoji="🛡️", custom_id="admin_apply_btn")
    async def admin(self, interaction: discord.Interaction, button: discord.ui.Button):
        # BURASI DÜZELTİLDİ: Modal artık tetikleniyor.
        await interaction.response.send_modal(AdminBasvuruModal())

    @discord.ui.button(label="VIP Başvuru", style=discord.ButtonStyle.primary, emoji="💎", custom_id="vip_apply_btn")
    async def vip(self, interaction: discord.Interaction, button: discord.ui.Button):
        # BURASI DÜZELTİLDİ: Modal artık tetikleniyor.
        await interaction.response.send_modal(VIPBasvuruModal())

# -------------------- ⚙️ KOMUTLAR VE EVENTLER --------------------
@bot.event
async def on_ready():
    bot.add_view(AnaMenu()) # Bot kapanıp açılsa da butonlar çalışır
    bot.add_view(TicketKapatView())
    print(f'✅ {bot.user} Aktif!')

@bot.command()
@commands.has_permissions(administrator=True)
async def panel(ctx):
    embed = discord.Embed(title="Başvuru Paneli", description="Başvurmak istediğiniz kategoriyi seçiniz.", color=discord.Color.gold())
    await ctx.send(embed=embed, view=AnaMenu())

@bot.command(name="kayıt", aliases=["kayit", "register"])
@commands.has_any_role(*YETKILI_ROLLER)
async def kayit(ctx, üye: discord.Member, *, isim_yas: str):
    try:
        await üye.edit(nick=isim_yas)
        await üye.add_roles(ctx.guild.get_role(KAYITLI_ROL_ID))
        await üye.remove_roles(ctx.guild.get_role(KAYITSIZ_ROL_ID))
        await ctx.send(f"✅ {üye.mention} başarıyla kaydedildi.")
    except Exception as e:
        await ctx.send(f"❌ Hata: {e}")

# -------------------- 🚀 ÇALIŞTIR --------------------
keep_alive()
bot.run(TOKEN)