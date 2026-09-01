import { GoogleGenAI } from '@google/genai';
import { queryOllamaTeacher } from '@/services/ollamaService';
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
if (!apiKey) console.warn("VITE_GEMINI_API_KEY is empty or undefined in import.meta.env");
const ai = new GoogleGenAI({ apiKey });

const SOCRATIC_OPENING_FALLBACK =
  "Let's explore this together. Before we begin, what is one idea or example you already connect with this topic?";

/**
 * Suggested visual representation for a concept
 */
export interface SuggestedVisual {
  type: 'equation' | 'diagram' | 'timeline' | 'code' | 'flowchart';
  title: string;
  content: string;
  explanation: string;
}

export interface TeachingTurnResponse {
  teacherMessage: string;
  suggestedVisual?: SuggestedVisual;
}

/** Structured response used by the classroom teaching loop. */
export interface TeachingResponse extends TeachingTurnResponse {
  text: string;
  visual?: SuggestedVisual;
  nextAction: 'explain' | 'ask_question' | 'evaluate' | 'next_concept';
  confidence?: number; // 0-1, how confident the AI is in student's understanding
  misconceptionDetected?: string;
}

function createFallbackResponse(message: string, subject: SubjectType = 'General'): TeachingResponse {
  const visual = subjectVisualFallback(subject);

  return {
    teacherMessage: message,
    suggestedVisual: visual,
    text: message,
    visual,
    nextAction: 'ask_question',
    confidence: 0,
  };
}

function subjectVisualFallback(subject: SubjectType): SuggestedVisual {
  const visualBySubject: Record<SubjectType, SuggestedVisual> = {
    Mathematics: { type: 'equation', title: 'Step-by-step equation', content: 'Known values → substitution → solve step by step', explanation: 'Work through the equation one operation at a time.' },
    Physics: { type: 'equation', title: 'Physics equation', content: 'Known quantity → governing equation → solved quantity', explanation: 'Use the governing relationship to connect the physical quantities.' },
    Biology: { type: 'flowchart', title: 'Biological process', content: 'Input → cell or organ system process → output', explanation: 'Follow the biological process in order.' },
    History: { type: 'timeline', title: 'Event timeline', content: 'Cause → key event → consequence', explanation: 'Place events in chronological order.' },
    Programming: { type: 'code', title: 'Runnable code example', content: '// input\n// process\n// output', explanation: 'Trace the program from input to output.' },
    General: { type: 'diagram', title: 'Concept map', content: 'Core idea → supporting ideas → application', explanation: 'Connect the central concept to its parts.' },
  };
  return visualBySubject[subject];
}

function normalizeSuggestedVisual(value: unknown, subject: SubjectType = 'General'): SuggestedVisual {
  if (value && typeof value === 'object') {
    const visual = value as Partial<SuggestedVisual> & { description?: string };
    const validTypes: SuggestedVisual['type'][] = ['equation', 'diagram', 'timeline', 'code', 'flowchart'];
    if (validTypes.includes(visual.type as SuggestedVisual['type']) && typeof visual.content === 'string') {
      const requestedType = visual.type as SuggestedVisual['type'];
      const preferredTypes: Record<SubjectType, SuggestedVisual['type'][]> = {
        Mathematics: ['equation'],
        Physics: ['equation', 'diagram', 'flowchart'],
        Biology: ['flowchart', 'diagram'],
        History: ['timeline'],
        Programming: ['code'],
        General: ['diagram', 'flowchart'],
      };
      if (!preferredTypes[subject].includes(requestedType)) {
        return subjectVisualFallback(subject);
      }
      return {
        type: requestedType,
        title: visual.title?.trim() || `${subject} visual guide`,
        content: visual.content,
        explanation: visual.explanation?.trim() || visual.description?.trim() || 'Use this visual to connect the key steps and relationships.',
      };
    }
  }

  return subjectVisualFallback(subject);
}

function resolveLanguage(student: Student, preferredLanguage?: Language, userMessage?: string): Language {
  if (preferredLanguage) return preferredLanguage;
  const message = userMessage?.toLowerCase() || '';
  if (/\b(hinglish|roman hindi)\b/.test(message)) return 'Hinglish';
  if (/\b(hindi|देवनागरी)\b/.test(message)) return 'Hindi';
  if (/\b(english|अंग्रेजी)\b/.test(message)) return 'English';
  return student.language;
}

function languageInstruction(language: Language): string {
  switch (language) {
    case 'Hindi':
      return 'Respond in clear, natural Devanagari Hindi. Keep unavoidable technical terms, formulas, code, and standard abbreviations in their original readable form.';
    case 'Hinglish':
      return 'Respond in a natural Romanized Hindi and English blend, for example: "Dekho, iska simple matlab ye hai ki..." Keep technical terms, formulas, and code readable.';
    default:
      return 'Respond in formal but accessible English using a clear Socratic teaching style.';
  }
}

function subjectVisualInstruction(subject: SubjectType): string {
  switch (subject) {
    case 'Mathematics':
      return 'Prefer equation visuals with readable LaTeX/plain-text formulas and step-by-step derivations.';
    case 'Physics':
      return 'Return an equation visual whenever a governing relationship applies; use a diagram or flowchart only when the concept cannot be represented meaningfully by an equation.';
    case 'Biology':
      return 'Prefer labeled component trees, relationship diagrams, and ordered biological process flows.';
    case 'History':
      return 'Prefer chronological timelines with dates, event sequences, and concise cause/effect labels.';
    case 'Programming':
      return 'Prefer clean formatted code with language labels and a simulated output terminal when useful.';
    default:
      return 'Prefer a clear concept diagram or flowchart that shows relationships between ideas.';
  }
}

/**
 * Build system prompt for Socratic teaching methodology
 */
function buildSystemPrompt(
  student: Student,
  lesson: Lesson,
  currentConcept: Concept,
  retrievedContext?: string[],
  preferredLanguage: Language = student.language
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
- Preferred Language: ${languageMap[preferredLanguage]}
- Teaching Style Preference: ${teachingStyleMap[student.teachingStyle]}
- Learning Goal: ${student.goal}

## Current Lesson Context
- Lesson: ${lesson.title}
- Topic: ${lesson.topic}
- Current Concept: ${currentConcept.name}
- Subject visual guidance: ${subjectVisualInstruction(lesson.subject)}
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
- ${languageInstruction(preferredLanguage)}
- Continue using the full lesson context, concept progression, and previous conversation even if the student changes language mid-conversation.
- Tailor complexity to ${student.level} level.
- When suggesting visuals, choose types appropriate to the concept.
- Always encourage critical thinking; avoid just giving answers.
- If the student struggles, offer a simpler entry point before retreating to the current explanation.
- If the student shows mastery, probe deeper or suggest moving forward.

## Required Rich Visual
ALWAYS include a complete suggestedVisual object. It must be specific to the current concept, not a generic placeholder.
- Tailor the visual to the ACTIVE subject, current concept, and the learner's latest response. Do not reuse examples from another topic.
- Mathematics and Physics: return type "equation" with a relevant LaTeX/plain-text equation and a step-by-step derivation. Example: {"type":"equation","content":"\\Delta E = h\\nu","explanation":"Energy-frequency relationship"}.
- Computer Science, Coding, and Programming: return type "code" with a ready-to-run snippet and expected execution output. Example: {"type":"code","content":"def binary_search(items, target): ...\\n# Expected output: index or -1","explanation":"O(log n) lookup"}.
- History and Social Studies: return type "timeline" with chronological, dated events. Example: {"type":"timeline","content":"1914: Outbreak | 1917: US Entry | 1918: Armistice","explanation":"Key progression of the conflict"}.
- Biology and other science/process topics: return type "flowchart" using clean arrows or line-separated stages. Example: {"type":"flowchart","content":"Input -> Process -> Output","explanation":"How material or energy moves through the system"}.
- Use diagrams only for spatial relationships that cannot be communicated more clearly as an equation, timeline, code example, or process flow.
Use only these types:
- 'equation': Mathematical formulas or algebraic expressions
- 'diagram': Visual representations (flowcharts, system diagrams)
- 'timeline': Historical sequences or process flows
- 'code': Programming examples or pseudocode
- 'flowchart': Decision trees or process flows
- Keep equations, code, numbers, and diagram structure language-neutral. Use short readable labels; use English technical terms in parentheses when a translated label could be unclear.

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
    "title": "Short, descriptive visual title",
    "content": "Visual content (LaTeX, description, pseudocode, or ASCII art)",
    "explanation": "What this visual teaches and how to read it"
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
  chatHistory: ChatMessage[] = [],
  userMessage?: string,
  retrievedContext?: string[],
  language?: Language
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

    const activeLanguage = resolveLanguage(student, language, userMessage);

    // Build the system prompt with pedagogical context
    const systemPrompt = buildSystemPrompt(student, lesson, currentConcept, retrievedContext, activeLanguage);

    // Build conversation history for context
    const safeChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
    const conversationHistory = safeChatHistory
      .slice(-10) // Keep last 10 messages for context window
      .map((msg) => ({
        role: msg.role === 'teacher' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      }));

    // Add current user message if provided
    const submittedMessage = userMessage?.trim();
    const currentUserInput = submittedMessage
      || "The learner clicked Continue without a written answer. Give a short Socratic bridge and ask one focused question about the current concept.";

    // Attempt the local Ollama teacher first for low-latency Socratic turns.
    try {
      const ollamaResponse = await queryOllamaTeacher(userMessage || currentUserInput, systemPrompt);
      const teacherMessage = ollamaResponse.teacherMessage?.trim() || SOCRATIC_OPENING_FALLBACK;
      const suggestedVisual = normalizeSuggestedVisual(ollamaResponse.suggestedVisual, lesson.subject);
      return {
        teacherMessage,
        suggestedVisual,
        text: teacherMessage,
        visual: suggestedVisual,
        nextAction: 'ask_question',
        confidence: 0.5,
      };
    } catch (error) {
      console.log('Ollama offline, using Gemini fallback');
      console.warn('Ollama teacher request failed:', error);
    }

    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    // Gemini is used only when the local provider is unavailable.
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nActive response language: ${activeLanguage}\n\nConversation History:\n${conversationHistory.map((message) => `${message.role}: ${message.content}`).join('\n')}\n\nUser Input: ${currentUserInput}`,
        config: {
          temperature: 0.5,
        },
      });
    } catch (error) {
      console.error("Gemini Classroom API Error:", error);
      return createFallbackResponse(SOCRATIC_OPENING_FALLBACK, lesson.subject);
    }

    // Parse the response
    const responseText = response.text?.trim();
    let parsedResponse: TeachingResponse;

    if (responseText) {
      try {
        const jsonData = JSON.parse(responseText) as Partial<TeachingResponse>;
        const teacherMessage = jsonData.teacherMessage || jsonData.text || '';
        const suggestedVisual = normalizeSuggestedVisual(jsonData.suggestedVisual || jsonData.visual, lesson.subject);
        parsedResponse = {
          teacherMessage,
          suggestedVisual,
          text: teacherMessage,
          visual: suggestedVisual,
          nextAction: jsonData.nextAction || 'explain',
          confidence: jsonData.confidence !== undefined ? jsonData.confidence : 0.5,
          misconceptionDetected: jsonData.misconceptionDetected || undefined,
        };
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError, 'Raw response:', responseText);
        parsedResponse = createFallbackResponse(
          'I received an unclear response. Could you tell me what you understand about this concept so far?',
          lesson.subject
        );
      }
    } else {
      parsedResponse = createFallbackResponse(
        'I did not receive a response. Could you tell me what you already know about this concept?',
        lesson.subject
      );
    }

    // Validate teacherMessage
    if (!parsedResponse.teacherMessage || parsedResponse.teacherMessage.trim().length === 0) {
      parsedResponse.teacherMessage = 'That\'s an interesting thought! Let me ask you a clarifying question to better understand your perspective.';
    }
    parsedResponse.text = parsedResponse.teacherMessage;
    parsedResponse.suggestedVisual = normalizeSuggestedVisual(parsedResponse.suggestedVisual, lesson.subject);
    parsedResponse.visual = parsedResponse.suggestedVisual;

    // Ensure nextAction is valid
    if (!['explain', 'ask_question', 'evaluate', 'next_concept'].includes(parsedResponse.nextAction)) {
      parsedResponse.nextAction = 'ask_question';
    }

    return parsedResponse;
  } catch (error) {
    console.error("Gemini Classroom API Error:", error);
    return createFallbackResponse(SOCRATIC_OPENING_FALLBACK, lesson?.subject || 'General');
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
