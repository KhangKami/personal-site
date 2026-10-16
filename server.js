const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PB_TOKEN = process.env.PUSHBULLET_TOKEN;
const DEFAULT_BANNER = 'Chào mừng bạn đến với trang cá nhân của mình!';

// Tin tin cậy proxy (Cloudflare Tunnel/ngrok) để lấy đúng IP khách
app.set('trust proxy', true);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Gửi lời nhắn từ khách đến điện thoại ----------
// Chống spam: mỗi IP tối đa 1 tin / 10 giây
const lastSent = new Map();
setInterval(() => {
  const limit = Date.now() - 60000;
  for (const [ip, t] of lastSent) if (t < limit) lastSent.delete(ip);
}, 60000).unref();

app.post('/api/message', async (req, res) => {
  const text = String(req.body.message || '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ ok: false, error: 'Tin nhắn trống' });
  if (!PB_TOKEN) return res.status(500).json({ ok: false, error: 'Chưa cấu hình PUSHBULLET_TOKEN' });

  const ip = req.ip;
  const now = Date.now();
  if (now - (lastSent.get(ip) || 0) < 10000) {
    return res.status(429).json({ ok: false, error: 'Bạn gửi quá nhanh, thử lại sau vài giây' });
  }
  lastSent.set(ip, now);

  try {
    const r = await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': PB_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'note',
        title: 'Lời nhắn từ website', // có tiêu đề => không bị nhầm với tin banner của admin
        body: text,
      }),
    });
    if (!r.ok) throw new Error('Pushbullet trả về ' + r.status);
    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ ok: false, error: 'Không gửi được thông báo' });
  }
});

// ---------- Banner: lời nhắn mới nhất của admin ----------
// Quy ước: tin admin gõ tay trong Pushbullet (loại note, KHÔNG có tiêu đề) là nội dung banner
let bannerCache = { text: DEFAULT_BANNER, at: 0 };

app.get('/api/banner', async (req, res) => {
  // Cache 15 giây để không gọi Pushbullet quá nhiều
  if (Date.now() - bannerCache.at > 15000 && PB_TOKEN) {
    try {
      const r = await fetch('https://api.pushbullet.com/v2/pushes?active=true&limit=20', {
        headers: { 'Access-Token': PB_TOKEN },
      });
      if (r.ok) {
        const data = await r.json();
        const latest = (data.pushes || []).find(
          (p) => p.type === 'note' && !p.title && (p.body || '').trim()
        );
        if (latest) {
          bannerCache.text = latest.body.trim().replace(/^banner\s*:\s*/i, '').slice(0, 200);
        }
      } else {
        console.error('Pushbullet banner lỗi', r.status);
      }
    } catch (err) {
      console.error('Lỗi lấy banner:', err.message);
    }
    bannerCache.at = Date.now();
  }
  res.json({ text: bannerCache.text });
});

// ---------- Khởi động & tắt gọn bằng Ctrl+C / docker stop ----------
const server = app.listen(PORT, () => console.log(`Server chạy ở cổng ${PORT}`));
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => server.close(() => process.exit(0)))
);