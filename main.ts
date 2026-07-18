import { Groq_LLMHandler } from "./handler/groq.js";
import { clearUserHistory } from "./utils/redis.js";
import { connectMCPClient } from "./core/fastmcp.js";
import { app } from "./core/express.js";
import { init_and_handle_server } from "./core/express.js";
import "./utils/express.js";
import { sendMessage, sendTypingIndicator } from "./whatsapp.js";
import { whatsappMessageIds } from "./utils/whatsapp.js";

await connectMCPClient();
init_and_handle_server();

app.post("/api/v1/webhook_whatsapp", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    res.sendStatus(200);
    return;
  }
  res.sendStatus(200);
  if (whatsappMessageIds.has(message.id)) {
    return;
  } else {
    whatsappMessageIds.add(message.id);
    setTimeout(() => whatsappMessageIds.delete(message.id), 1000 * 60 * 60 * 4);
    sendTypingIndicator(message.id);
  }

  try {
    if (message.text.body.toLowerCase() === "clear") {
      await clearUserHistory(message.from);
      sendMessage(message.from, "conversation cleared");
      return;
    }
    if (message.type === "audio" || message.type === "ptt") {
      const audio = await message.downloadMedia();
      const transcribeRes = await fetch(
        "http://localhost:8080/api/v1/asha/twi_transcribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: audio.data }),
        },
      );
      const { text } = await transcribeRes.json();
      (message as any).body = text;

      const twiText = await Groq_LLMHandler(message);
      // if (twiText) {
      //   const speechRes = await fetch("http://localhost:8080/speech", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ text: twiText }),
      //   });
      //   const { audio: audioB64 } = await speechRes.json();
      //   await sendVoiceNote(message.from, audioB64);
      // }
      return;
    }
    Groq_LLMHandler(message);
  } catch (error) {
    console.error("Error handling message:", error);
    sendMessage(
      message.from,
      "An error occurred while processing your request.",
    );
  }
});
