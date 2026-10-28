# MECSc course-enquiry chatbot (browser-only)

Floating chat bubble + full-page chat for the MECSc Malaysian Cleaning Proficiency Course (MCPC 1-4).
Trilingual: Bahasa Malaysia / English / 中文.

- Live full page: https://mecsc-training.github.io/chatbot/
- Widget script: https://mecsc-training.github.io/chatbot/widget.js

## Add to a website (one line, before `</body>`)

```html
<script src="https://mecsc-training.github.io/chatbot/widget.js" defer></script>
```

Default mode runs **entirely in the visitor's browser**: FAQ/keyword answers, no server, no API key,
no network calls, nothing stored (no cookies, no localStorage). The facts (fees, dates, venue, HRD Corp,
MyHIJAU, contact) are in `src/chat.js`.

Optional attributes: `data-title`, `data-color` (default `#1e40af`), `data-bottom` (px from bottom, default 90
so it clears a WhatsApp button), `data-right` (default 20).

## Switch to server / AI mode later

Deploy the server from `mecsc-training/mecsc-ai-sales-agent` (Express or Cloudflare Worker, set `AI_API_KEY` there,
never in this repo) and add `data-server`:

```html
<script src="https://mecsc-training.github.io/chatbot/widget.js" data-server="https://YOUR-CHAT-SERVER" defer></script>
```

The widget then POSTs `{message, history}` to `<server>/api/chat`. If the server is unreachable it falls back to the
local in-browser answer.

## Update the answers

Edit `src/chat.js` (keep it in sync with the server repo's `lib/chat.js`), then rebuild and commit `widget.js`:

```
npm install
npm run build
```

GitHub Pages serves the `main` branch root. No secrets belong in this repository.
