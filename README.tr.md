<!-- 🇬🇧 English version: README.md -->

# Vektra Intelligence Library

İnternetteki işine yarayan her aracı/bilgiyi **toplayan, anlayan ve sana sunan**
açık-kaynak bir sistem. İki parça: **kurulumsuz panel** (bugün çift tıkla çalışır) +
**otomatik motor** (kendi sunucunda kendi kendine çalışır).

> İngilizce için: **[README.md](README.md)** · Lisans: **MIT** · Kurulum: **[docs/INSTALL.md](docs/INSTALL.md)**
>
> 🏗️ Bir **VektraDev** açık-kaynak ürünüdür — kendi sunucunda barındır, fork'la, kendine göre uyarla.

## 🖱️ Tek çatı — Vektra Komuta Merkezi (kurulum yok)

**`intel/dashboard.html`** → çift tıkla. Tek panelde her şey:
- **Kütüphane** — araç kataloğu (offline çalışır, internet gerekmez)
- **İstihbarat** — motorun topladığı, puanlanmış canlı bulgular (Supabase'den)
- **Sor** — kütüphanene doğal dille soru → kaynaklı, sentezlenmiş cevap (embeddings + Haiku, n8n webhook)
- **Ayarlar** — Supabase bağlantısı + **Sor webhook URL'in** (hepsi tarayıcında saklanır)
- **Nasıl Çalışır** — sistemi sıfırdan anlatan görsel rehber

> Panel kimseye özel değil: tüm bağlantı bilgileri **Ayarlar** sekmesinden girilir,
> kodu ellemeden kendi Supabase + n8n'ine bağlarsın.

## 🤖 Otomatik motor (sunucunda kendi kendine)

Her sabah internetten toplar, **yapay zekayla okuyup özetler ve puanlar**, sonucu
dashboard'a (+ opsiyonel WhatsApp'a) koyar. Ücretsiz omurga (GitHub/HN/YouTube…)
+ Claude Haiku (beyin) + Gemini (embedding).

**Kurmak için:** `vektra-engine.n8n.json`'ı n8n'e **Import** et veya
`00-meta/engine-node.js`'i bir Code node'a yapıştır, `CONFIG`'e anahtarlarını gir,
**Active** yap. Adım adım: **[docs/INSTALL.md](docs/INSTALL.md)**.

Sonuçları görmek için: `intel/dashboard.html` → **Ayarlar**'a Supabase URL + anon
anahtarını gir → **İstihbarat** sekmesi canlı dolar (skor, özet, "neden önemli", YENİ, ⭐).

## ♻️ Kendini büyüten döngü
Motor yüksek-puanlı **YENİ** araçları doğrudan kütüphaneye ekler (kapı: ilgi ≥ 80 +
güvenli tür + geçerli aşama). Daha düşük adayları `00-meta/inbox-sync.py` ile inceleme
için `99-inbox/`'a taslak olarak çıkarırsın:

```bash
python 00-meta/inbox-sync.py     # adayları 99-inbox/ taslaklarına çevirir
```

> ⚠️ `99-inbox/`'tan **asla** otomatik onaylama — skill'ler gizli komut taşıyabilir, önce oku.
> Kütüphane zamanla **kendi kendine zenginleşir** ama insan kapısından geçerek.

## 🔌 Her projede kullan (MCP)
`00-meta/vektra-mcp.py` saf-Python bir MCP sunucusu. Global kaydedince **her Claude
projesinde** `vektra_ask` aracıyla merkezî kütüphaneye sorarsın — kütüphaneyi kopyalamadan.

## Yapı
- `SKILL.md` — Claude için yönlendirici (registry'yi nasıl sorgulayacağı).
- `registry.csv` / `registry.json` — kaynakların makine-okur indeksi (stage × type × domain).
- `00-meta/` — şema, profil, beyin promptları, modül kaydı, motor & MCP & kurulum.
- `01-…09-` — aşamaya göre kaynak kartları. `99-inbox/` — otomatik taslaklar (insan onayı).

## Mimari özet
```
Kaynaklar (ücretsiz omurga + opt-in Apify) → n8n (sabah) → Derin Oku → Beyin
(Claude Haiku: özet/puan/etiket/💰) → Embed (Gemini 768) → Supabase
→ Dashboard + WhatsApp + MCP → değerli YENİ → kütüphane (oto) / 99-inbox (insan)
```

## Maliyet
Omurga $0 · Supabase/n8n ücretsiz/ucuz katmanlar · Claude Haiku + Gemini ayda
~**$3–8** · Apify (opsiyonel) haftada kuruşlar. Ayrıntı: [`00-meta/modules.yaml`](00-meta/modules.yaml).

## VektraDev hakkında
**Vektra**, **VektraDev**'in açık-kaynak bir ürünüdür — geliştiriciler ve küçük ekipler için pratik
AI + otomasyon araçları. Felsefe: önce kendi sunucunda barındır, veri ve anahtarların sende kalsın,
araçları kendine göre uyarla. Fork'la, `CONFIG.profile`'ı işine göre değiştir, yayına al.

## Katkı & Lisans
Katkı: **[CONTRIBUTING.md](CONTRIBUTING.md)** · Lisans: **[MIT](LICENSE)** · © VektraDev.
