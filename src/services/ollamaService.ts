export interface OllamaVisualPayload {
  type: 'diagram' | 'equation' | 'flowchart' | 'code' | 'timeline';
  title: string;
  content: string;
  explanation: string;
}

export interface OllamaTeacherResponse {
  teacherMessage: string;
  suggestedVisual?: OllamaVisualPayload;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const FAST_MODEL = 'qwen2.5:1.5b';

export async function queryOllamaTeacher(
  prompt: string,
  systemInstruction: string,
  model = FAST_MODEL
): Promise<OllamaTeacherResponse> {
  const fullPrompt = `${systemInstruction}\n\nReturn JSON only:\n{\n  "teacherMessage": "Concise teacher response and focused question",\n  "suggestedVisual": { "type": "flowchart", "title": "Title", "content": "Step 1 -> Step 2", "explanation": "Brief description" }\n}\n\nStudent: ${prompt}`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        format: 'json',
        options: {
          num_predict: 250,
          temperature: 0.4,
          top_k: 20,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed: OllamaTeacherResponse = JSON.parse(data.response);

    return {
      teacherMessage: parsed.teacherMessage || "Let's explore this together. What are your initial thoughts?",
      suggestedVisual: parsed.suggestedVisual,
    };
  } catch (error) {
    console.warn('Ollama slow or offline, falling back to Gemini:', error);
    throw error;
  }
}