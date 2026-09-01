import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface ExtractedConcept {
  id: string;
  name: string;
  type: 'concept' | 'formula' | 'definition' | 'example';
  description: string;
}

export interface MaterialAnalysisResult {
  subject: string;
  topic: string;
  subtopics: string[];
  concepts: ExtractedConcept[];
  realLifeAnalogy: string;
  summary: string;
  commonMisconception: string;
  isUnclear: boolean;
  unclearReason?: string;
}

// Convert File to Base64 Inline Data
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeUploadedMaterial(file: File): Promise<MaterialAnalysisResult> {
  try {
    const imagePart = await fileToGenerativePart(file);

    const prompt = `Analyze this study material image carefully.
    If the image is completely unreadable, blurry, or missing relevant educational content, set "isUnclear": true and describe why in "unclearReason".
    
    Otherwise, extract and identify the core educational concepts. Return strictly valid JSON in this structure:
    {
      "isUnclear": false,
      "subject": "Main Subject (e.g., Biology, Physics, Computer Science)",
      "topic": "Specific Topic Name",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "concepts": [
        { "id": "1", "name": "Concept Name", "type": "concept", "description": "Short explanation" }
      ],
      "realLifeAnalogy": "A clear, intuitive analogy explaining the topic",
      "summary": "Concise overview of the material",
      "commonMisconception": "A common student misunderstanding regarding this topic"
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Multimodal extraction error:', error);
    throw new Error('Failed to analyze uploaded image material. Please try a clearer image.');
  }
}