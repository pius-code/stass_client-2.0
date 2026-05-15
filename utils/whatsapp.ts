import { client } from "../core/whatsapp.ts";
import WAWebJS from "whatsapp-web.js";
const { MessageMedia } = WAWebJS;

export const sendMedia = async (
  to: string,
  media: string,
  options?: { caption?: string; filename?: string },
) => {
  try {
    let response = await fetch(media, { redirect: "follow" });

    // Google Drive returns an HTML confirmation page instead of the file for large files.
    // If we detect HTML, parse out the real download URL and fetch again.
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      console.log("[sendMedia] Got HTML, first 2000 chars:\n", html.slice(0, 2000));
      const match =
        html.match(/href="(\/uc\?export=download[^"]+)"/) ||
        html.match(/href="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
      if (!match) throw new Error("Got HTML from server but couldn't find a download link in it.");
      const rawUrl = match[1].replace(/&amp;/g, "&");
      const realUrl = rawUrl.startsWith("http") ? rawUrl : "https://drive.google.com" + rawUrl;
      response = await fetch(realUrl, { redirect: "follow" });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimetype = options?.filename?.endsWith(".pdf")
      ? "application/pdf"
      : response.headers.get("content-type") ?? "application/octet-stream";
    const mediax = new MessageMedia(mimetype, base64, options?.filename);
    await client.sendMessage(to, mediax, { caption: options?.caption });
  } catch (error) {
    console.error(`Failed to send media from ${media}:`, error);
    await client.sendMessage(
      to,
      "Sorry, couldn't load that image. Please try again!",
    );
  }
};

export async function sendMessage(to: string, message: string) {
  if (!client) throw new Error("WhatsApp client not initialized");

  try {
    await client.sendMessage(to, message);
    console.log(`✉️ Sent message to ${to}`);
  } catch (error) {
    console.error(
      "Error sending message:",
      "error instanceof Error ? error.message : error",
      error,
    );
  }
}
