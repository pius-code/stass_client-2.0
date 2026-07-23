# stass_client 2.0

A WhatsApp client that lets you connect MCP (Model Context Protocol) tools to an LLM and interact with it over WhatsApp — built on the official **WhatsApp Business Platform (Cloud API)**, not browser automation.

The difference between 1.0 and 2.0 is that 2.0 has explicit support for MCP clients, while 1.0 relied on the LLM provider's built-in MCP server support. This version also handles MCP OAuth authentication.

> **Migration note:** This project originally ran on `whatsapp-web.js` (unofficial Puppeteer-based WhatsApp automation). It has since been migrated to the official WhatsApp Cloud API — messages now arrive via webhook instead of a logged-in browser session. See [WABA Setup](#waba-setup) below.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

### 3. Set your MCP server URL

Set `MCP_URL` in your `.env` to point to your MCP server (e.g. `http://127.0.0.1:8080/mcp`).

### 4. Run

```bash
npm run dev
```

This starts the Express server (default port `3000`), which is what the WhatsApp Cloud API webhook will call. See [WABA Setup](#waba-setup) to actually connect a WhatsApp number to it.

---

## WABA Setup

This app receives messages via a webhook rather than a logged-in WhatsApp session, so you need a WhatsApp Business Account (WABA) set up in Meta's developer platform.

1. **Create a Meta app + WABA** at [developers.facebook.com](https://developers.facebook.com) and add the WhatsApp product. For development/testing, Meta gives you a free test phone number — no business verification required, but you can only message up to 5 manually-added, OTP-verified recipient numbers.
2. **Set `PHONE_ID` and `ACCESS_TOKEN`** in `.env` from the app's API Setup page.
   - The Quickstart-page access token is **temporary** (expires quickly). For anything longer-lived, generate a **System User access token** in Meta Business Settings instead — it can be issued with no expiration.
3. **Expose your local server publicly** (Meta needs to reach it) — e.g. with [ngrok](https://ngrok.com):
   ```bash
   ngrok http 3000
   ```
   Note: ngrok's free tier gives you a new URL every restart, so you'll need to re-register the webhook URL in Meta's dashboard each time unless you use a static domain.
4. **Register the webhook** in the Meta app dashboard, pointing to:
   - Callback URL: `https://<your-public-url>/api/v1/webhook_whatsapp`
   - Verify token: must match the `verify_token` constant in `utils/express.ts` (currently hardcoded there, not in `.env`)
   - Subscribe to the `messages` field.
5. Send a WhatsApp message to your test number — it should hit the webhook, get logged, and processed by `Groq_LLMHandler`.

**Known gap:** audio/voice-note messages (`message.downloadMedia()` in `main.ts`) still assume the old `whatsapp-web.js` media API and aren't wired up for the Cloud API's media-ID download flow yet (see Todos).

---

## LLM Providers

The main handler is `handler/groq.ts` — despite the name, it works with **any OpenAI-compatible endpoint**. All available clients are defined in `core/groq.ts`:

| Client            | Provider                                   | Notes                                                                       |
| ----------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| `AIclient`        | [Groq](https://console.groq.com)           | Fast inference, set `GROQ_API_KEY`                                          |
| `AIclient4`       | [OpenRouter](https://openrouter.ai)        | Recommended — access to many models including Claude, set `OPEN_ROUTER_KEY` |
| `AIclient3`       | Google Gemini (OpenAI-compatible endpoint) | Set `GEMINI_API_KEY`                                                        |
| `AIclient2`       | Google Gemini (native SDK)                 | Set `GEMINI_API_KEY`                                                        |
| `ollamaClient`    | Local Ollama                               | Untested                                                                    |
| `anthropicClient` | Anthropic direct                           | **Do not use** — see note below                                             |

**Note on Anthropic:** The handler uses the Responses API (`/responses` endpoint) which Anthropic does not support directly. Don't use `anthropicClient`. Instead, use `AIclient4` (OpenRouter) and set the model to any Claude model from `model/model.ts` — e.g. `openRouter_claude_Sonnet_model` or `openRouter_claude_haiku_model`.

**Note on Gemini:** if you use `AIclient3`/`AIclient2`, use a paid Gemini model — the free tier doesn't work well. You may also want to update the system prompt in `prompts/sys_pro.ts` to something more suitable.

Model IDs for all providers are in `model/model.ts`.

---

## MCP & Authentication

On startup, the client connects to your MCP server. If the server requires OAuth, a browser window will open automatically for you to authenticate. After that, the tools your MCP server exposes are available to the LLM.

---

## Long Conversations

Once a conversation reaches 70 messages, the client automatically makes an API call to summarize the older messages and continues normally — so context is preserved without hitting token limits. You can adjust the threshold or change the summarization model in `utils/redis.ts`.

---

## Changing the System Prompt

The system prompt is in `prompts/sys_pro.ts`. The one currently there was written for a specific IoT assistant task (ASHA) — swap it out for whatever suits your use case.

---

## Using `chat.completions` Instead of `responses`

The main handler uses the Responses API. If you want to switch to `chat.completions`, note that the tool format is different. There's already a helper function `get_tools_2` in `mcp_client/mcp_tools` that converts MCP tools into the `chat.completions` format — you'd only need to update the looping logic in the handler.

---

## Clearing Conversation History

Send the message `clear` to the bot and it will wipe your conversation history from Redis.

---

## Todos

- [ ] Wire up audio/voice-note handling for the Cloud API's media-ID download flow (`main.ts`'s `message.downloadMedia()` is still a `whatsapp-web.js`-era stub)
- [ ] Move the webhook verify token in `utils/express.ts` into `.env` instead of hardcoding it
- [ ] Get a non-expiring System User access token for `ACCESS_TOKEN` instead of the temporary Quickstart token

HOW TO SELECT A MODEL

1. the following criteria is worth considering when selecting a model for your LLM client:

- you can have user image input, so you need a model that can handle image input.
- you can have web search so you need a model that can handle web search.
