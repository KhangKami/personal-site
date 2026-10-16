// ---------- Gửi lời nhắn ----------
const form = document.getElementById('msgForm');
const input = document.getElementById('msgInput');
const status = document.getElementById('msgStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.style.color = '#333';
  status.textContent = 'Đang gửi...';
  try {
    const r = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.value }),
    });
    const data = await r.json();
    if (data.ok) {
      status.style.color = 'green';
      status.textContent = 'Đã gửi! Cảm ơn bạn.';
      input.value = '';
    } else {
      status.style.color = 'crimson';
      status.textContent = data.error || 'Gửi thất bại';
    }
  } catch {
    status.style.color = 'crimson';
    status.textContent = 'Lỗi mạng, thử lại sau';
  }
});

// ---------- Banner chữ chạy ----------
const ticker = document.getElementById('tickerText');

async function loadBanner() {
  try {
    const r = await fetch('/api/banner', { cache: 'no-store' });
    const data = await r.json();
    if (data.text && ticker.textContent !== data.text) {
      ticker.textContent = data.text;
      // chạy lại animation khi chữ đổi
      ticker.style.animation = 'none';
      void ticker.offsetWidth;
      ticker.style.animation = '';
    }
  } catch (err) {
    console.error('Không tải được banner', err);
  }
}

loadBanner();
setInterval(loadBanner, 10000);