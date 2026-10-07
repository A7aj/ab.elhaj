import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = (typeof process !== 'undefined' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) || '';
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  return new GoogleGenAI();
}

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-3.8-flash";
export const GEMINI_MODELS_CASCADE = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.8-flash"];
