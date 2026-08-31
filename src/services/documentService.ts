import { generateEmbedding } from './embeddingService';

export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface ProcessedDocument {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  extractedText: string;
  chunks: DocumentChunk[];
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
 * Extract text from a file (supports PDF and plain text)
 * @param file The file to extract text from
 * @returns Extracted text content
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const fileType = file.type.toLowerCase();

    // Handle PDF files
    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        // Dynamic import to handle optional dependency
        const pdfModule = (await import('pdf-parse')) as any;
        const pdfParse = pdfModule.default || pdfModule;
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = await pdfParse(arrayBuffer);
        return pdfData.text || '';
      } catch (pdfError) {
        console.warn('PDF parsing failed, attempting fallback:', pdfError);
        // Fallback: return empty string if pdf-parse fails
        return '';
      }
    }

    // Handle plain text files
    if (
      fileType === 'text/plain' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md')
    ) {
      return await file.text();
    }

    // For other text-based formats, try reading as text
    if (fileType.startsWith('text/')) {
      return await file.text();
    }

    // Default: try to read as text
    return await file.text();
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    // Chunk the text
    const textChunks = chunkText(extractedText);

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
