import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generate a vector embedding for text using Google Gemini's text-embedding-004 model
 * Returns a 768-dimension vector
 * @param text The text to embed
 * @returns A number array representing the text embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });

    // Current SDKs expose `embeddings[0]`; retain the singular shape for
    // compatibility with providers/SDK versions that return `embedding`.
    const embedding = (response as typeof response & {
      embedding?: { values?: number[] };
    }).embedding?.values ?? response.embeddings?.[0]?.values;
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('No embedding returned from API, using fallback');
      return new Array(768).fill(0);
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback: return zero-vector of dimension 768 on error
    return new Array(768).fill(0);
  }
}
