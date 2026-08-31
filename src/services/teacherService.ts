import { GoogleGenAI, Type, Schema } from '@google/genai';
import type {
  Student,
  Lesson,
  ChatMessage,
  Concept,
  SubjectType,
  TeachingStyle,
  Language,
} from '@/models';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Suggested visual representation for a concept
 */
export interface SuggestedVisual {
  type: 'equation' | 'diagram' | 'timeline' | 'code' | 'flowchart';
  content: string;
  description?: string;
}

/**
 * Structured response from the teaching turn
 */
export interface TeachingResponse {
  teacherMessage: string;
  suggestedVisual?: SuggestedVisual;
  nextAction: 'explain' | 'ask_question' | 'evaluate' | 'next_concept';
  confidence?: number; // 0-1, how confident the AI is in student's understanding
  misconceptionDetected?: string;
}

/**
 * Gemini schema for structured teaching response
 */
const teachingResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    teacherMessage: {
      type: Type.STRING,
      description: 'The teacher\'s response using Socratic methodology',
    },
    suggestedVisual: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['equation', 'diagram', 'timeline', 'code', 'flowchart'],
        },
        content: {
          type: Type.STRING,
          description: 'Content or LaTeX/code for the visual',
        },
        description: {
          type: Type.STRING,
          description: 'Brief description of the visual',
        },
      },
    },
    nextAction: {
      type: Type.STRING,
      enum: ['explain', 'ask_question', 'evaluate', 'next_concept'],
      description: 'Next teaching action to take',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score (0-1) in student\'s understanding',
    },
    misconceptionDetected: {
      type: Type.STRING,
      description: 'If present, description of detected misconception',
    },
  },
  required: ['teacherMessage', 'nextAction'],
};

/**
 * Build system prompt for Socratic teaching methodology
 */
function buildSystemPrompt(
  student: Student,
  lesson: Lesson,
  currentConcept: Concept,
  retrievedContext?: string[]
): string {
  const languageMap: Record<Language, string> = {
    English: 'English',
    Hindi: 'Hindi (with English technical terms)',
    Hinglish: 'Hinglish (mix of Hindi and English)',
  };

  const teachingStyleMap: Record<TeachingStyle, string> = {
    Socratic: 'Use probing questions to guide discovery (Socratic method)',
    Direct: 'Provide direct explanations with examples',
    Storytelling: 'Frame concepts within engaging narratives',
    Visual: 'Emphasize visual representations and diagrams',
  };

  const levelMap: Record<Student['level'], string> = {
    Beginner: 'very simple, foundational explanations with everyday analogies',
    Intermediate: 'balanced explanations with relevant examples',
    Advanced: 'in-depth explanations with nuanced details and connections to advanced topics',
  };

  const contextStr = retrievedContext && retrievedContext.length > 0
    ? `\nRelevant document context:\n${retrievedContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')}`
    : '';

  return `You are an expert Socratic AI Teacher. Your role is to guide students to deeper understanding through structured questioning, not by simply providing answers.

## Student Profile
- Name: ${student.name}
- Learning Level: ${student.level}
- Preferred Language: ${languageMap[student.language]}
- Teaching Style Preference: ${teachingStyleMap[student.teachingStyle]}
- Learning Goal: ${student.goal}

## Current Lesson Context
- Lesson: ${lesson.title}
- Topic: ${lesson.topic}
- Current Concept: ${currentConcept.name}
- Concept Description: ${currentConcept.description}
- Difficulty Level: ${currentConcept.difficulty}/5
- Estimated Time: ${currentConcept.estimatedMinutes} minutes

## Teaching Methodology: SOCRATIC METHOD
You MUST follow this 5-stage process:
1. **Understand**: Ask clarifying questions to assess current knowledge
2. **Plan**: Identify knowledge gaps and misconceptions
3. **Explain**: Provide ${levelMap[student.level]} explanations
4. **Demonstrate**: Use concrete, relatable examples
5. **Question**: Ask thought-provoking conceptual questions

## Response Guidelines
- NEVER act like a generic chatbot. Every response must be pedagogically intentional.
- Use language that is ${languageMap[student.language]}.
- Tailor complexity to ${student.level} level.
- When suggesting visuals, choose types appropriate to the concept.
- Always encourage critical thinking; avoid just giving answers.
- If the student struggles, offer a simpler entry point before retreating to the current explanation.
- If the student shows mastery, probe deeper or suggest moving forward.

## Visual Suggestions
When appropriate, suggest visuals using these types:
- 'equation': Mathematical formulas or algebraic expressions
- 'diagram': Visual representations (flowcharts, system diagrams)
- 'timeline': Historical sequences or process flows
- 'code': Programming examples or pseudocode
- 'flowchart': Decision trees or process flows

## Misconception Handling
If you detect a misconception:
1. Acknowledge what the student attempted
2. Gently redirect with a contrasting example
3. Ask a follow-up question to verify new understanding

## Document Context
${contextStr || 'No additional document context provided.'}

## Output Format
Respond ALWAYS with a valid JSON object matching this structure:
{
  "teacherMessage": "Your Socratic response (1-3 paragraphs, engaging and pedagogically sound)",
  "suggestedVisual": {
    "type": "equation|diagram|timeline|code|flowchart",
    "content": "Visual content (LaTeX, description, pseudocode, or ASCII art)",
    "description": "What this visual teaches"
  },
  "nextAction": "explain|ask_question|evaluate|next_concept",
  "confidence": 0.0-1.0,
  "misconceptionDetected": "null or string describing misconception"
}

Always provide the response as valid JSON. No markdown code blocks, just pure JSON.`;
}

/**
 * Main teaching loop function - implements AI Teaching Loop for Classroom view
 * Uses Google Gemini with Socratic methodology
 *
 * @param student The student being taught
 * @param lesson The lesson being delivered
 * @param currentConceptIndex Index of the current concept in the lesson
 * @param chatHistory Previous messages in this teaching session
 * @param userMessage Optional - the student's latest response to process
 * @param retrievedContext Optional - relevant document chunks from RAG system
 * @returns Structured teaching response
 */
export async function continueTeachingTurn(
  student: Student,
  lesson: Lesson,
  currentConceptIndex: number,
  chatHistory: ChatMessage[],
  userMessage?: string,
  retrievedContext?: string[]
): Promise<TeachingResponse> {
  try {
    // Validate inputs
    if (!student || !lesson || currentConceptIndex < 0 || currentConceptIndex >= lesson.concepts.length) {
      throw new Error('Invalid student, lesson, or concept index provided');
    }

    const currentConcept = lesson.concepts[currentConceptIndex];
    if (!currentConcept) {
      throw new Error(`Concept at index ${currentConceptIndex} not found`);
    }

    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    // Build the system prompt with pedagogical context
    const systemPrompt = buildSystemPrompt(student, lesson, currentConcept, retrievedContext);

    // Build conversation history for context
    const conversationHistory = chatHistory
      .slice(-10) // Keep last 10 messages for context window
      .map((msg) => ({
        role: msg.role === 'teacher' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      }));

    // Add current user message if provided
    if (userMessage) {
      conversationHistory.push({
        role: 'user' as const,
        content: userMessage,
      });
    } else {
      // If no user message, generate an initial greeting/prompt for the concept
      conversationHistory.push({
        role: 'user' as const,
        content: `I'm ready to learn about "${currentConcept.name}". Please start by understanding what I already know about this topic.`,
      });
    }

    // Call Gemini API with structured output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      contents: conversationHistory,
      config: {
        responseMimeType: 'application/json',
        responseSchema: teachingResponseSchema,
        temperature: 0.7, // Balanced for pedagogical quality
      },
    });

    // Parse the response
    const responseText = response.text || '{}';
    let parsedResponse: TeachingResponse;

    try {
      const jsonData = JSON.parse(responseText);
      parsedResponse = {
        teacherMessage: jsonData.teacherMessage || 'I apologize, but I encountered an error. Please try again.',
        suggestedVisual: jsonData.suggestedVisual || undefined,
        nextAction: jsonData.nextAction || 'explain',
        confidence: jsonData.confidence !== undefined ? jsonData.confidence : 0.5,
        misconceptionDetected: jsonData.misconceptionDetected || undefined,
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError, 'Raw response:', responseText);
      // Fallback to a safe response
      parsedResponse = {
        teacherMessage: responseText || 'Let me rephrase that. Could you tell me what you understand about this concept so far?',
        nextAction: 'ask_question',
        confidence: 0.3,
      };
    }

    // Validate teacherMessage
    if (!parsedResponse.teacherMessage || parsedResponse.teacherMessage.trim().length === 0) {
      parsedResponse.teacherMessage = 'That\'s an interesting thought! Let me ask you a clarifying question to better understand your perspective.';
    }

    // Ensure nextAction is valid
    if (!['explain', 'ask_question', 'evaluate', 'next_concept'].includes(parsedResponse.nextAction)) {
      parsedResponse.nextAction = 'ask_question';
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error in continueTeachingTurn:', error);

    // Fallback response on error
    return {
      teacherMessage: 'I encountered a technical issue. Could you please repeat what you said so I can help you better?',
      nextAction: 'ask_question',
      confidence: 0,
    };
  }
}

/**
 * Helper function to get initial greeting for a concept
 * Initiates the Socratic dialogue without requiring student input
 */
export async function getConceptGreeting(
  student: Student,
  lesson: Lesson,
  conceptIndex: number,
  retrievedContext?: string[]
): Promise<TeachingResponse> {
  return continueTeachingTurn(
    student,
    lesson,
    conceptIndex,
    [], // Empty chat history
    undefined, // No user message
    retrievedContext
  );
}

/**
 * Helper function to evaluate a student's answer and provide feedback
 * Focuses on assessment and misconception detection
 */
export async function evaluateStudentResponse(
  student: Student,
  lesson: Lesson,
  conceptIndex: number,
  studentAnswer: string,
  chatHistory: ChatMessage[],
  retrievedContext?: string[]
): Promise<TeachingResponse> {
  const evaluationPrompt = `The student provided this response: "${studentAnswer}"

Based on their response:
1. Assess accuracy and depth of understanding
2. Detect any misconceptions
3. Provide specific feedback
4. Decide on the next teaching action

Remember to maintain the Socratic approach even in evaluation.`;

  const enhancedHistory: ChatMessage[] = [
    ...chatHistory,
    {
      role: 'student',
      content: evaluationPrompt,
      timestamp: new Date().toISOString(),
    },
  ];

  return continueTeachingTurn(student, lesson, conceptIndex, enhancedHistory, studentAnswer, retrievedContext);
}
