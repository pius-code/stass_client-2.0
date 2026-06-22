import { initializeWhatsApp } from "./whatsapp.js";
import client from "./core/whatsapp";
import { Groq_LLMHandler } from "./handler/groq.js";
import { clearUserHistory } from "./utils/redis.js";
import { connectMCPClient } from "./core/fastmcp.js";

await connectMCPClient();
initializeWhatsApp();

client.on("message", async (message) => {
  console.log(message.from);
  if (message.from === "182553927544969@lid") {
    if (message.body.toLowerCase() === "clear") {
      await clearUserHistory(message.from);
      message.reply("Your conversation history has been cleared.");
      return;
    }
    console.log("Received message from specified number:", message.body);
    if (message.type === "audio" || message.type === "ptt") {
      const audio = await message.downloadMedia();
      await message.reply("Processing your audio, hold on!");

      const res = await fetch("http://localhost:8081/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: audio.data }),
      });
      const { text } = await res.json();
      (message as any).body = text;

      Groq_LLMHandler(message);
      return;
    }
    const response = Groq_LLMHandler(message);
  }
});
