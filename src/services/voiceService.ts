export interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface VoiceOutputOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface VoiceService {
  startListening(options?: VoiceInputOptions): Promise<string>;
  stopListening(): void;
  speak(text: string, options?: VoiceOutputOptions): Promise<void>;
  cancelSpeech(): void;
}

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

class BrowserVoiceService implements VoiceService {
  private recognition: SpeechRecognitionLike | null = null;

  startListening(options: VoiceInputOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const speechWindow = window as SpeechWindow;
      const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (!Recognition) {
        reject(new Error('Speech recognition is not supported in this browser.'));
        return;
      }

      this.stopListening();
      const recognition = new Recognition();
      this.recognition = recognition;
      recognition.lang = options.language || 'en-US';
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? false;
      let transcript = '';

      recognition.onresult = (event) => {
        for (let index = event.results.length - 1; index >= 0; index -= 1) {
          transcript = `${event.results[index][0].transcript} ${transcript}`.trim();
          if (event.results[index].isFinal) break;
        }
      };
      recognition.onerror = () => {
        this.recognition = null;
        reject(new Error('Speech recognition could not access the microphone.'));
      };
      recognition.onend = () => {
        this.recognition = null;
        if (transcript) resolve(transcript);
        else reject(new Error('No speech was detected.'));
      };

      try {
        recognition.start();
      } catch (error) {
        this.recognition = null;
        reject(error instanceof Error ? error : new Error('Unable to start speech recognition.'));
      }
    });
  }

  stopListening(): void {
    this.recognition?.stop();
    this.recognition = null;
  }

  speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis is not supported in this browser.'));
        return;
      }
      if (!text.trim()) {
        resolve();
        return;
      }

      this.cancelSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.language || 'en-US';
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.onstart = () => options.onStart?.();
      utterance.onend = () => {
        options.onEnd?.();
        resolve();
      };
      utterance.onerror = () => {
        options.onEnd?.();
        reject(new Error('Speech playback failed.'));
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  cancelSpeech(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export const voiceService: VoiceService = new BrowserVoiceService();
export const startListening = (options?: VoiceInputOptions) => voiceService.startListening(options);
export const stopListening = () => voiceService.stopListening();
export const speak = (text: string, options?: VoiceOutputOptions) => voiceService.speak(text, options);
export const cancelSpeech = () => voiceService.cancelSpeech();
