import { generateEmbedding } from './embeddingService';

export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  extractedText: string;
  chunks: DocumentChunk[];
}

const textFileExtensions = new Set(['txt', 'md', 'json', 'csv']);

function getFileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function sanitizeText(text: string): string {
  return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

function metadataFallback(file: File): string {
  const fileType = file.type || getFileExtension(file) || 'unknown';
  return `Document ${file.name} (${fileType}, ${file.size} bytes) contains no readable text.`;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file as text'));
    reader.readAsText(file);
  });
}

/**
 * Split text into chunks with optional overlap
 * @param text The text to chunk
 * @param chunkSize Number of characters per chunk (default: 500)
 * @param overlap Number of characters to overlap between chunks (default: 100)
 * @returns Array of text chunks
 */
export function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start position by chunkSize minus overlap
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Extract printable browser-readable text from a file. PDF binaries do not expose
 * their page text through browser APIs, but are safely represented by metadata.
 * @param file The file to extract text from
 * @returns Extracted text content
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const extension = getFileExtension(file);
    // `File.text()` is browser-native and works consistently for text documents.
    // FileReader remains only as a compatibility fallback for older browsers.
    let rawText: string;
    try {
      rawText = await file.text();
    } catch {
      rawText = await readFileAsText(file);
    }

    const sanitizedText = sanitizeText(rawText);
    // Avoid embedding raw PDF/office binary noise while keeping processing non-throwing.
    if ((extension === 'pdf' || !textFileExtensions.has(extension)) && sanitizedText.length < 20) {
      return metadataFallback(file);
    }
    return sanitizedText.length >= 20 ? sanitizedText : metadataFallback(file);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return metadataFallback(file);
  }
}

/**
 * Process a document: extract text, create chunks, and generate embeddings
 * @param file The file to process
 * @returns Processed document with chunks and embeddings
 */
export async function processDocument(file: File): Promise<ProcessedDocument> {
  try {
    // Extract text from file
    const extractedText = await extractTextFromFile(file);

    // Chunk the text
    const textChunks = chunkText(extractedText, 500, 100);

    if (textChunks.length === 0) {
      throw new Error('Text chunking produced no results');
    }

    // Generate embeddings for each chunk
    const chunks: DocumentChunk[] = [];
    for (let i = 0; i < textChunks.length; i++) {
      const embedding = await generateEmbedding(textChunks[i]);
      chunks.push({
        id: `chunk_${Date.now()}_${i}`,
        text: textChunks[i],
        embedding,
      });
    }

    const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';

    return {
      id: `document_${Date.now()}`,
      fileName: file.name,
      fileType,
      sizeBytes: file.size,
      extractedText,
      chunks,
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
