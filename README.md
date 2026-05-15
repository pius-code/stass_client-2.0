# stass_client 2.0

An unofficial WhatsApp client that lets you connect MCP (Model Context Protocol) tools to an LLM and interact with it over WhatsApp.

The difference between 1.0 and 2.0 is that 2.0 has explicit support for MCP clients, while 1.0 relied on the LLM provider's built-in MCP server support. This version also handles MCP OAuth authentication.

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

### 3. Configure your allowed WhatsApp number

In `main.ts`, replace `"exampleID@lid"` with your own WhatsApp ID. Every incoming message prints its ID to the console, so you can just copy it from there. You can also remove the `if` check entirely to allow anyone to use the bot — just be careful about costs if you're on a paid model.

### 4. Set your MCP server URL

Set `MCP_URL` in your `.env` to point to your MCP server (e.g. `http://127.0.0.1:8080/mcp`).

### 5. Run

```bash
npm run dev
```

A QR code will appear in your terminal. Scan it with your phone via **WhatsApp > Linked Devices > Link a Device**. Once authenticated, the bot is live.

---

## LLM Providers

The main handler is `handler/groq.ts` — despite the name, it works with **any OpenAI-compatible endpoint**. All available clients are defined in `core/groq.ts`:

| Client | Provider | Notes |
|---|---|---|
| `AIclient` | [Groq](https://console.groq.com) | Fast inference, set `GROQ_API_KEY` |
| `AIclient4` | [OpenRouter](https://openrouter.ai) | Recommended — access to many models including Claude, set `OPEN_ROUTER_KEY` |
| `AIclient3` | Google Gemini (OpenAI-compatible endpoint) | Set `GEMINI_API_KEY` |
| `AIclient2` | Google Gemini (native SDK) | Set `GEMINI_API_KEY` |
| `ollamaClient` | Local Ollama | Untested |
| `anthropicClient` | Anthropic direct | **Do not use** — see note below |

**Note on Anthropic:** The handler uses the Responses API (`/responses` endpoint) which Anthropic does not support directly. Don't use `anthropicClient`. Instead, use `AIclient4` (OpenRouter) and set the model to any Claude model from `model/model.ts` — e.g. `openRouter_claude_Sonnet_model` or `openRouter_claude_haiku_model`.

**Note on Gemini:** `Gemini_LLMHandler` in `handler/gemini.ts` exists but hasn't been fully tested. Use a paid Gemini model if you try it — the free tier doesn't work well. You may also want to update the system prompt in `prompts/sys_pro.ts` to something more suitable.

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

- [ ] Migrate to official WhatsApp Business API
- [ ] Add support for media (images and audio)
