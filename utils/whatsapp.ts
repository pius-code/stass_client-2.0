import { client } from "../core/whatsapp.ts";
import WAWebJS from "whatsapp-web.js";
const { MessageMedia } = WAWebJS;

export const sendVoiceNote = async (to: string, audioBase64: string) => {
  const media = new MessageMedia("audio/ogg; codecs=opus", audioBase64);
  await client.sendMessage(to, media, { sendAudioAsVoice: true } as any);
};

export const sendMedia = async (
  to: string,
  mediaUrl: string,
  options?: { caption?: string; filename?: string },
) => {
  try {
    const response = await fetch(mediaUrl, { redirect: "follow" });
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimetype = options?.filename?.endsWith(".pdf")
      ? "application/pdf"
      : response.headers.get("content-type") ?? "application/octet-stream";
    const media = new MessageMedia(mimetype, base64, options?.filename);
    await client.sendMessage(to, media, { caption: options?.caption });
  } catch (error) {
    console.error(`Failed to send media from ${mediaUrl}:`, error);
    await client.sendMessage(to, "Sorry, couldn't load that. Please try again!");
  }
};

export async function sendMessage(to: string, message: string) {
  if (!client) throw new Error("WhatsApp client not initialized");
  try {
    await client.sendMessage(to, message);
  } catch (error) {
    console.error("Error sending message:", error);
  }
}
