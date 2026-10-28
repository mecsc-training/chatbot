/*
 * MECSc chat bubble widget (browser-only by default).
 *
 *   <script src="https://mecsc-training.github.io/chatbot/widget.js" defer></script>
 *
 * Default: answers are produced locally in the visitor's browser (FAQ matcher,
 * Bahasa Malaysia / English / Chinese). No server, no API key, no network
 * calls, nothing stored (no cookies, no localStorage).
 *
 * Server/AI mode: add data-server="https://your-chat-server" and the widget
 * POSTs {message, history} to <server>/api/chat exactly like the original widget.
 *
 * Optional attributes:
 *   data-server  server base URL (enables server/AI mode)
 *   data-title   header title            (default "MECSc Course Enquiry")
 *   data-color   theme colour            (default #1e40af)
 *   data-bottom  bubble offset from bottom in px (default 90, clears WhatsApp button)
 *   data-right   bubble offset from right in px  (default 20)
 *   data-bubble="false"  do not draw the bubble (only expose window.MECSCChat)
 */
var chat = require('./chat.js');

var MAX = chat.MAX_MESSAGE_CHARS || 500;

// Small public API (used by the full-page index.html, also handy for tests).
window.MECSCChat = {
  ask: function (message, history) {
    return chat.handleChat({ message: message, history: history || [], env: {} }).then(function (r) {
      return r.ok ? r.reply : (r.error || 'Sorry, something went wrong.');
    });
  },
  detectLanguage: chat.detectLanguage
};

(function () {
  if (window.__mecscWidgetLoaded) return;
  window.__mecscWidgetLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  function attr(n, d) { var v = script && script.getAttribute(n); return v ? v : d; }
  if (attr('data-bubble', '') === 'false') return;

  var server = attr('data-server', '').replace(/\/+$/, '');
  var title = attr('data-title', 'MECSc Course Enquiry');
  var color = attr('data-color', '#1e40af');
  var bottom = parseInt(attr('data-bottom', '90'), 10); if (isNaN(bottom)) bottom = 90;
  var right = parseInt(attr('data-right', '20'), 10); if (isNaN(right)) right = 20;
  var history = [];
  var busy = false;

  var host = document.createElement('div');
  host.id = 'mecsc-chat-widget';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC","PingFang SC","Microsoft YaHei",Arial,sans-serif}' +
    '.bubble{position:fixed;right:' + right + 'px;bottom:' + bottom + 'px;width:56px;height:56px;border-radius:50%;border:0;padding:0;margin:0;cursor:pointer;background:' + color + ';color:#fff;font-size:26px;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:2147483646;display:flex;align-items:center;justify-content:center}' +
    '.bubble:focus-visible,.head button:focus-visible,.chips button:focus-visible,form button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}' +
    '.panel{position:fixed;right:' + right + 'px;bottom:' + (bottom + 68) + 'px;width:370px;max-width:calc(100vw - 16px);height:520px;max-height:calc(100vh - ' + (bottom + 84) + 'px);min-height:280px;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;z-index:2147483647}' +
    '.panel.open{display:flex}' +
    '.head{background:' + color + ';color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:15px}' +
    '.head button{background:none;border:0;color:#fff;font-size:26px;cursor:pointer;line-height:1;padding:0 4px}' +
    '.msgs{flex:1;overflow-y:auto;padding:12px;background:#f3f4f6;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}' +
    '.m{max-width:88%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}' +
    '.m.bot{background:#fff;color:#1f2937;align-self:flex-start;border:1px solid #e5e7eb}' +
    '.m.user{background:' + color + ';color:#fff;align-self:flex-end}' +
    '.m a{color:inherit;text-decoration:underline}' +
    '.m.bot a{color:' + color + '}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px;background:#f3f4f6}' +
    '.chips button{border:1px solid ' + color + ';background:#fff;color:' + color + ';border-radius:14px;padding:5px 11px;font-size:13px;cursor:pointer}' +
    'form{display:flex;gap:6px;padding:10px;border-top:1px solid #e5e7eb;background:#fff;margin:0}' +
    'input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:9px 10px;font-size:14px;min-width:0;background:#fff;color:#111827}' +
    'form button{background:' + color + ';color:#fff;border:0;border-radius:8px;padding:0 14px;font-size:14px;cursor:pointer}' +
    'form button:disabled,input:disabled{opacity:.6;cursor:default}' +
    '@media (max-width:520px){' +
    '.panel{right:8px;left:8px;bottom:8px;width:auto;max-width:none;height:calc(100vh - 16px);height:calc(100dvh - 16px);max-height:640px;border-radius:12px}' +
    'input{font-size:16px}' +
    '.bubble.hide{display:none}' +
    '}' +
    '</style>' +
    '<button class="bubble" type="button" aria-label="Chat with MECSc" aria-expanded="false">\uD83D\uDCAC</button>' +
    '<div class="panel" role="dialog" aria-label="' + title.replace(/["<>&]/g, '') + '">' +
    '<div class="head"><span></span><button type="button" aria-label="Close">\u00D7</button></div>' +
    '<div class="msgs" aria-live="polite"></div><div class="chips"></div>' +
    '<form><input type="text" maxlength="' + MAX + '" placeholder="Type / Taip / \u8BF7\u8F93\u5165..." autocomplete="off" aria-label="Message"><button type="submit">Send</button></form>' +
    '</div>';

  function q(sel) { return root.querySelector(sel); }
  var bubble = q('.bubble'), panel = q('.panel'), msgs = q('.msgs'), chips = q('.chips');
  var form = q('form'), input = q('input'), sendBtn = q('form button');
  q('.head span').textContent = title;

  function linkify(el, text) {
    String(text).split(/(https?:\/\/[^\s]+)/g).forEach(function (part) {
      if (/^https?:\/\//.test(part)) {
        var m = part.match(/^(.*?)([.,;:!?)\uFF0C\u3002\uFF09]*)$/);
        var a = document.createElement('a');
        a.href = m[1]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
        el.appendChild(a);
        if (m[2]) el.appendChild(document.createTextNode(m[2]));
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function add(role, text) {
    var d = document.createElement('div');
    d.className = 'm ' + role;
    linkify(d, text);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  add('bot', 'Hello! \uD83D\uDC4B I\'m the MECSc course assistant. Ask me about MCPC 1 to 4 fees, dates, venue and registration.\nHelo! Tanya saya tentang yuran, tarikh dan pendaftaran kursus.\n\u60A8\u597D\uFF01\u6B22\u8FCE\u8BE2\u95EE\u8BFE\u7A0B\u5B66\u8D39\u3001\u65E5\u671F\u548C\u62A5\u540D\u3002');

  [['Fees', 'How much are the MCPC courses?'], ['Dates', 'What are the 2026 course dates?'],
   ['HRD Corp', 'Can I claim with HRD Corp?'],
   ['Yuran', 'Berapa yuran kursus MCPC?'], ['\u5730\u70B9', '\u4E0A\u8BFE\u5730\u70B9\u5728\u54EA\u91CC\uFF1F']].forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = c[0];
    b.addEventListener('click', function () { send(c[1]); });
    chips.appendChild(b);
  });

  var FAIL = 'Sorry, I could not connect. Please WhatsApp 014-641 9310 or email training@mecsc.com.my.';

  function remember(text, reply) {
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    if (history.length > 8) history = history.slice(-8);
  }

  function localAnswer(text) {
    return chat.handleChat({ message: text, history: history.slice(-8), env: {} }).then(function (r) {
      return r.ok ? r.reply : (r.error || 'Sorry, something went wrong.');
    });
  }

  function serverAnswer(text) {
    return fetch(server + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-8) })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (x.ok && x.d && x.d.success) return x.d.response;
        throw new Error((x.d && x.d.error) || 'bad response');
      });
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > MAX) text = text.slice(0, MAX);
    busy = true; input.value = ''; input.disabled = true; sendBtn.disabled = true; chips.style.display = 'none';
    add('user', text);
    var wait = add('bot', '...');
    var p = server ? serverAnswer(text).catch(function () { return localAnswer(text); }) : localAnswer(text);
    p.then(function (reply) {
      wait.textContent = ''; linkify(wait, reply); remember(text, reply);
    }).catch(function () {
      wait.textContent = FAIL;
    }).then(function () {
      busy = false; input.disabled = false; sendBtn.disabled = false; msgs.scrollTop = msgs.scrollHeight; input.focus();
    });
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    bubble.classList.toggle('hide', open);
    bubble.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) input.focus();
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  bubble.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
  q('.head button').addEventListener('click', function () { setOpen(false); bubble.focus(); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

  function mount() { document.body.appendChild(host); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
