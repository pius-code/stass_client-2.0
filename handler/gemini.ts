// import { AIclient2 } from "../core/groq";
// import WAWebJS from "whatsapp-web.js";
// import { SYSTEM_PROMPT } from "../prompts/sys_pro";
// import {
//   getRedisUserHistory,
//   addNewMessageAndUpdateHistory,
// } from "../utils/redis";
// import { Gemini_model } from "../model/model";
// import { get_tools } from "../mcp_client/mcp_tools";
// import { tool_call_result } from "../mcp_client/mcp_tool_call_handler";

// export const Gemini_LLMHandler = async (query: WAWebJS.Message) => {
//   const msg = await query.getChat();
//   await msg.sendStateTyping();

//   try {
//     const userId = query.from;
//     const userHistory = await getRedisUserHistory(userId);
//     const messages = [
//       { role: "model", content: SYSTEM_PROMPT },
//       ...userHistory,
//       { role: "user", content: query.body },
//     ];
//     const response = await AIclient2.interactions.create({
//       input: messages,
//       model: Gemini_model,
//       stream: false,
//       tools: await get_tools(),
//     });

//     msg.clearState();
//     const content = response;
//     console.log("LLM Response:", JSON.stringify(content, null, 2));

//     // Add proper type checking for content outputs
//     if (content.outputs && content.outputs.length > 0) {
//       const lastOutput = content.outputs[content.outputs.length - 1];

//       // Check if the output has text content
//       let responseText = "No response text available";
//       if ("text" in lastOutput && lastOutput.text) {
//         responseText = lastOutput.text;
//       } else if (
//         "content" in lastOutput &&
//         typeof lastOutput.content === "string"
//       ) {
//         responseText = lastOutput.content;
//       }

//       query.reply(responseText);
//       await addNewMessageAndUpdateHistory(
//         userId,
//         query.body,
//         responseText,
//         "model",
//       );
//     } else {
//       query.reply("No response received from the model.");
//       console.warn("No outputs received from the model");
//     }
//   } catch (error) {
//     query.reply("An error occurred while processing your request.");
//     console.error("Error in LLMHandler:", error);
//   }
// };

import { AIclient2, AIclient3 } from "../core/groq";
import WAWebJS from "whatsapp-web.js";
import { getSystemPrompt } from "../prompts/sys_pro";
import {
  getRedisUserHistory,
  addNewMessageAndUpdateHistory,
  addSingleMessageToHistory,
} from "../utils/redis";
import { Gemini_model } from "../model/model";
import { get_tools, get_tools_2 } from "../mcp_client/mcp_tools";
import { tool_call_result } from "../mcp_client/mcp_tool_call_handler";

export const Gemini_LLMHandler = async (query: WAWebJS.Message) => {
  const msg = await query.getChat();
  await msg.sendStateTyping();

  try {
    const userId = query.from;
    const userHistory = await getRedisUserHistory(userId);
    const messages: any[] = [
      { role: "system", content: getSystemPrompt() },
      ...userHistory,
      { role: "user", content: query.body },
    ];

    let response = await AIclient3.chat.completions.create({
      model: Gemini_model,
      messages,
      tools: (await get_tools_2()) as any,
      tool_choice: "auto",
      temperature: 1,
    });

    let message = response.choices[0].message;

    while (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];

      // Narrow to function tool calls
      if (toolCall.type !== "function" || !toolCall.function) {
        console.warn("Unsupported tool call type:", toolCall.type);
        break;
      }

      const parsedArgs = JSON.parse(toolCall.function.arguments ?? "{}");
      const tool_results = await tool_call_result(
        toolCall.function.name,
        parsedArgs,
      );

      const toolMessage = `Tool ${toolCall.function.name} was called with arguments ${toolCall.function.arguments} and returned ${JSON.stringify(tool_results)}`;

      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [toolCall],
      });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(tool_results),
      });
      await addSingleMessageToHistory(userId, "user", toolMessage);

      response = await AIclient3.chat.completions.create({
        model: Gemini_model,
        messages,
        tools: (await get_tools_2()) as any,
        tool_choice: "auto",
        temperature: 1,
      });

      message = response.choices[0].message;
    }

    const responseText = message.content || "No response";
    query.reply(responseText);
    msg.clearState();
    await addNewMessageAndUpdateHistory(
      userId,
      query.body,
      responseText,
      "assistant",
    );
  } catch (error) {
    query.reply("An error occurred while processing your request.");
    console.error("Error in LLMHandler:", error);
  }
};
