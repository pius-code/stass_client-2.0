import { initializeWhatsApp } from "./whatsapp.js";
import client from "./core/whatsapp";
import { Groq_LLMHandler } from "./handler/groq.js";
import { Gemini_LLMHandler } from "./handler/gemini.js";
import { clearUserHistory } from "./utils/redis.js";
import { connectMCPClient } from "./core/fastmcp.js";

await connectMCPClient();
initializeWhatsApp();

client.on("message", async (message) => {
  console.log(message.from);
  // change thse number to your  whatsapp number/whatsapp id/group id to test, you can also remove the if condition to allow anyone to use the bot, but be careful with spamming and costs if you are using a paid model, anytime someone sends a message the id is printed un console so you can just copy and use that.
  if (message.from === "exampleID@lid") {
    if (message.body.toLowerCase() === "clear") {
      await clearUserHistory(message.from);
      message.reply("Your conversation history has been cleared.");
      return;
    }
    console.log("Received message from specified number:", message.body);
    const response = Groq_LLMHandler(message);
    // uncomment if you prefer using gemini, but make sure to update the system prompt in prompts/sys_pro.ts to be more suitable for a general assistant rather than an academic one(use a paid gemini version, the free ones doesnt work well)
    // const response = Gemini_LLMHandler(message);
  }
});
