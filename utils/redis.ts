import redis from "../core/redis_client";
import { AIclient } from "../core/groq";
import { groq_model } from "../model/model";

const HISTORY_TTL_SECONDS = 86400;
const TRIM_THRESHOLD = 65;
const TRIM_KEEP_RECENT = 10;
// Catches image-heavy conversations that stay under TRIM_THRESHOLD messages
// but already carry megabytes of base64 image data.
const SIZE_TRIM_THRESHOLD_BYTES = 300 * 1024;

export async function getRedisUserHistory(userId: string) {
  if (!redis) return [];
  const raw = await redis.lrange(userId, 0, -1);
  return raw.map((entry) => JSON.parse(entry));
}

export async function clearUserHistory(userId: string) {
  if (!redis) return { success: false, message: "Redis not available" };

  await redis.del(userId);
  console.log(`Cleared conversation for user: ${userId}`);
  return { success: true, message: "Conversation cleared" };
}

function stringifyContentForSummary(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) =>
        part.type === "input_image" ? "[image attached]" : (part.text ?? ""),
      )
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

async function summarizeConversation(entries: any[]): Promise<string> {
  const readable = entries
    .map((m: any) => {
      if (m.role === "user")
        return `User: ${stringifyContentForSummary(m.content)}`;
      if (m.role === "assistant")
        return `Assistant: ${stringifyContentForSummary(m.content)}`;
      if (m.type === "function_call")
        return `[Tool called: ${m.name}(${m.arguments})]`;
      if (m.type === "function_call_output")
        return `[Tool result: ${m.output}]`;
      return null;
    })
    .filter(Boolean)
    .join("\n");

  const response = await AIclient.chat.completions.create({
    model: groq_model,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation concisely. Capture key facts, actions taken, device states, and any context needed for future exchanges:\n\n${readable}`,
      },
    ],
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content ?? "No summary available.";
}

async function trimHistoryIfNeeded(userId: string) {
  if (!redis) return;

  const [length, sizeBytes] = await Promise.all([
    redis.llen(userId),
    // MEMORY USAGE samples the key rather than transferring its contents;
    // falls back to 0 (count-only trimming) on older Redis without support.
    redis.memory("USAGE", userId).catch(() => 0),
  ]);

  if (length < TRIM_THRESHOLD && (sizeBytes ?? 0) < SIZE_TRIM_THRESHOLD_BYTES) {
    return;
  }

  const history = await getRedisUserHistory(userId);
  const toSummarize = history.slice(0, -TRIM_KEEP_RECENT);
  let recent = history.slice(-TRIM_KEEP_RECENT);

  // Trim leading orphaned function_call/function_call_output entries so
  // the history always starts with a user message (Gemini requirement).
  while (recent.length > 0 && recent[0].role !== "user") {
    recent = recent.slice(1);
  }

  const summary = await summarizeConversation(toSummarize);

  const compactHistory = [
    {
      role: "user",
      content: `[Earlier conversation summary:\n${summary}]`,
    },
    {
      role: "assistant",
      content: "Got it, I have context from our earlier conversation.",
    },
    ...recent,
  ];

  console.log(
    `Summarized history for ${userId}: compressed to ${compactHistory.length} entries`,
  );

  await redis
    .multi()
    .del(userId)
    .rpush(userId, ...compactHistory.map((m) => JSON.stringify(m)))
    .expire(userId, HISTORY_TTL_SECONDS)
    .exec();
}

export async function appendMessagesToHistory(
  userId: string,
  messages: any[],
) {
  if (!redis || messages.length === 0) return;

  await redis
    .multi()
    .rpush(userId, ...messages.map((m) => JSON.stringify(m)))
    .expire(userId, HISTORY_TTL_SECONDS)
    .exec();

  await trimHistoryIfNeeded(userId);
}

export async function addSingleMessageToHistory(
  userId: string,
  role: string,
  content: any,
) {
  await appendMessagesToHistory(userId, [{ role, content }]);
}

// Persists messages that aren't already in Redis history (e.g. tool calls,
// tool results, and the final assistant reply generated this turn).
export async function saveUserHistory(userId: string, newMessages: any[]) {
  const toPersist = newMessages.filter((m) => m.role !== "system");
  await appendMessagesToHistory(userId, toPersist);
}
