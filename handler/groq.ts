// don't get confused by the name groq used here, initially i was using groq provider but after realizing it accepts openAI compatible endpoint i just used it for any other provider that accepts openAI end points and felt lazy to rename after each provider

import { AIclient, AIclient4, QwenClient } from "../core/groq";
import WAWebJS from "whatsapp-web.js";
import { getSystemPrompt } from "../prompts/sys_pro";
import { getRedisUserHistory, saveUserHistory } from "../utils/redis";
import {
  groq_model,
  openRouter_claude_Sonnet_model,
  openRouter_claude_haiku_model,
  openRouter_gemma4_31b_model,
} from "../model/model";
import { get_tools } from "../mcp_client/mcp_tools";
import { tool_call_result } from "../mcp_client/mcp_tool_call_handler";

function extractMCPResult(result: any): string {
  try {
    const text = result?.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    if (text) {
      try {
        return JSON.stringify(JSON.parse(text));
      } catch {
        return text;
      }
    }
  } catch {}
  return JSON.stringify(result);
}

export const Groq_LLMHandler = async (query: WAWebJS.Message) => {
  const msg = await query.getChat();
  await msg.sendStateTyping();

  try {
    const userId = query.from;
    const userHistory = await getRedisUserHistory(userId);
    const messages = [
      { role: "system", content: getSystemPrompt() },
      ...userHistory,
      { role: "user", content: query.body },
    ];
    const tools = await get_tools();

    let content = await AIclient4.responses.create({
      input: messages,
      model: "openai/gpt-5.4-mini",
      temperature: 1,
      top_p: 1,
      stream: false,
      // reasoning: {
      //   effort: "medium",
      // },
      tool_choice: "auto",
      tools,
    });

    console.log("LLM Response:", JSON.stringify(content, null, 2));

    let functionCalls = content.output.filter(
      (item: any) => item.type === "function_call",
    );

    while (functionCalls.length > 0) {
      const results = await Promise.all(
        functionCalls.map(async (call: any) => {
          const parsedArgs = JSON.parse(call.arguments);
          const result = await tool_call_result(call.name, parsedArgs);
          return { call, result };
        }),
      );

      for (const { call, result } of results) {
        // Push the function call itself so the model sees its own invocation
        messages.push(call);
        // Push the result in the format the Responses API expects
        const outputItem = {
          type: "function_call_output",
          call_id: call.call_id,
          output: extractMCPResult(result),
        };
        messages.push(outputItem);
        // Also persist to Redis history in a readable form for future sessions
        // await addSingleMessageToHistory(
        //   userId,
        //   "user",
        //   `Tool ${call.name} called with ${call.arguments} returned: ${extractMCPResult(result)}`,
        // );
      }

      content = await AIclient4.responses.create({
        input: messages,
        model: "openai/gpt-5.4-mini",
        temperature: 1,
        top_p: 1,
        stream: false,
        // reasoning: {
        //   effort: "medium",
        // },
        tool_choice: "auto",
        tools,
      });

      functionCalls = content.output.filter(
        (item: any) => item.type === "function_call",
      );
    }

    // Push the final assistant text message to your thread
    messages.push({ role: "assistant", content: content.output_text });

    query.reply(content.output_text);
    msg.clearState();
    await saveUserHistory(userId, messages);
    return content.output_text;
  } catch (error) {
    query.reply("An error occurred while processing your request.");
    console.error("Error in LLMHandler:", error);
  }
};
