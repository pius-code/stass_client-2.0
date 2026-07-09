import { initializeWhatsApp } from "./whatsapp.js";
import client from "./core/whatsapp.js";
import { Groq_LLMHandler } from "./handler/groq.js";
import { clearUserHistory } from "./utils/redis.js";
import { connectMCPClient } from "./core/fastmcp.js";
import { sendVoiceNote } from "./utils/whatsapp.js";

await connectMCPClient();
initializeWhatsApp();

client.on("message", async (message) => {
  console.log(message.from);
  if (message.from === "status@broadcast") return;
  if (message.from === "182553927544969@lid") {
    if (message.body.toLowerCase() === "clear") {
      await clearUserHistory(message.from);
      message.reply("Your conversation history has been cleared.");
      return;
    }
    console.log("Received message from specified number:", message.body);
    if (message.type === "audio" || message.type === "ptt") {
      const audio = await message.downloadMedia();
      const res = await fetch(
        "http://localhost:8080/api/v1/asha/twi_transcribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: audio.data }),
        },
      );
      const { text } = await res.json();
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
    const response = Groq_LLMHandler(message);
  }
});
