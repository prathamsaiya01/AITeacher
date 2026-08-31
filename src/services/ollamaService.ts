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
const DEFAULT_MODEL = 'deepseek-r1:8b'; // Or 'llama3.2'

export async function queryOllamaTeacher(
  prompt: string,
  systemInstruction: string,
  model = DEFAULT_MODEL
): Promise<OllamaTeacherResponse> {
  const fullPrompt = `${systemInstruction}\n\nIMPORTANT: Respond ONLY with valid JSON in this exact structure, with no extra text or markdown formatting:\n{\n  "teacherMessage": "Your Socratic explanation and follow-up question here",\n  "suggestedVisual": {\n    "type": "flowchart",\n    "title": "Visual Title",\n    "content": "Step 1 -> Step 2 -> Step 3",\n    "explanation": "Brief explanation"\n  }\n}\n\nStudent Prompt: ${prompt}`;

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
        format: 'json', // Forces Ollama to output strict JSON
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed: OllamaTeacherResponse = JSON.parse(data.response);

    return {
      teacherMessage: parsed.teacherMessage || "Let's explore this step by step. What are your initial thoughts?",
      suggestedVisual: parsed.suggestedVisual,
    };
  } catch (error) {
    console.warn('Ollama Service Unavailable or Error:', error);
    throw error; // Rethrow to allow fallback to Gemini in teacherService.ts
  }
}