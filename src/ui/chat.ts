// Batch UI desktop: panel chat = log sistem game + pesan pemain (lokal).
// Game kirim via window event 'chat' {from, text, system?: boolean}.
interface ChatMsg {
  from: string;
  text: string;
  system: boolean;
}

const MAX = 40;
const log: ChatMsg[] = [];
let tab: 'all' | 'system' = 'all';

export function initChat() {
  const panel = document.getElementById('chat-panel');
  const box = document.getElementById('chat-log');
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  if (!panel || !box || !input) return;

  const render = () => {
    const items = log.filter((m) => tab === 'all' || m.system);
    box.innerHTML = items
      .map(
        (m) =>
          `<div class="chat-msg${m.system ? ' sys' : ''}"><b>${escapeHtml(m.from)}:</b> ${escapeHtml(m.text)}</div>`
      )
      .join('');
    box.scrollTop = box.scrollHeight;
    panel.querySelectorAll<HTMLButtonElement>('#chat-tabs button').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
  };

  const push = (from: string, text: string, system: boolean) => {
    log.push({ from, text, system });
    if (log.length > MAX) log.splice(0, log.length - MAX);
    render();
  };

  window.addEventListener('chat', ((e: CustomEvent<{ from: string; text: string; system?: boolean }>) => {
    push(e.detail.from || 'System', e.detail.text || '', e.detail.system !== false);
  }) as EventListener);

  panel.querySelectorAll<HTMLButtonElement>('#chat-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      tab = (b.dataset.tab as 'all' | 'system') ?? 'all';
      render();
    });
  });

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    push('Kamu', text, false);
  };
  document.getElementById('chat-send')?.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
    e.stopPropagation();
  });

  push('System', 'Selamat datang di Legends of Padjajaran!', true);
  render();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

/** Dipakai scene untuk umumkan sesuatu ke chat. */
export function announce(text: string, from = 'System') {
  window.dispatchEvent(new CustomEvent('chat', { detail: { from, text, system: true } }));
}
