import axios from "axios";
const PHONE_NUMBER_ID = process.env.PHONE_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNABORTED",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postWithRetry(
  url: string,
  data: object,
  maxRetries: number = 2,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      const isRetryable =
        axios.isAxiosError(error) &&
        !error.response &&
        error.code &&
        RETRYABLE_CODES.has(error.code);

      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }
      await sleep(1000 * 2 ** attempt);
    }
  }
}

export async function sendTypingIndicator(message_id: string) {
  try {
    const response = await postWithRetry(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message_id,
        typing_indicator: {
          type: "text",
        },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Failed to send typing indicator:", {
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("Failed to send typing indicator:", error);
    }
  }
}

export async function sendMessage(
  to: string,
  body: string,
  previewUrl: boolean = false,
) {
  try {
    const response = await postWithRetry(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: previewUrl,
          body: body,
        },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Failed to send message:", {
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("Failed to send message:", error);
    }
  }
}
