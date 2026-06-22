// dont let the name groq confuse you

import OpenAI from "openai";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

export const AIclient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const AIclient2 = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const AIclient3 = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const AIclient4 = new OpenAI({
  apiKey: process.env.OPEN_ROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const ollamaClient = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

export const anthropicClient = new OpenAI({
  apiKey: process.env.ANTHROPIC_KEY,
  baseURL: "https://api.anthropic.com/v1",
});

export const QwenClient = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL:
    "https://ws-n5t9fuur0k5rnpm2.ap-southeast-1.maas.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
});
