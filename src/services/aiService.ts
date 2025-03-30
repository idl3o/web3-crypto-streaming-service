/**
 * AI Service
 * Provides interfaces for calling AI APIs like Google's Gemini
 */
import axios from 'axios';

// Types for Gemini API
interface GeminiRequestContent {
  parts: {
    text: string;
  }[];
}

interface GeminiRequest {
  contents: GeminiRequestContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponsePart {
  text: string;
}

interface GeminiResponseContent {
  parts: GeminiResponsePart[];
}

interface GeminiResponse {
  candidates: {
    content: GeminiResponseContent;
  }[];
}

class AiService {
  private geminiApiKey: string;
  private geminiApiVersion: string;
  private geminiModel: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.geminiApiVersion = 'v1beta';
    this.geminiModel = 'gemini-2.0-flash';
  }

  /**
   * Generate text using Google's Gemini API
   * @param prompt The prompt to send to Gemini
   * @param options Configuration options like temperature
   * @returns The generated text response
   */
  async generateWithGemini(
    prompt: string,
    options: { temperature?: number; maxOutputTokens?: number } = {}
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not set');
    }

    const url = `https://generativelanguage.googleapis.com/${this.geminiApiVersion}/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    const payload: GeminiRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: options,
    };

    try {
      const response = await axios.post<GeminiResponse>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data.candidates[0]?.content.parts[0]?.text || '';
    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error('Failed to generate content');
    }
  }
}

export const aiService = new AiService();
export default aiService;
