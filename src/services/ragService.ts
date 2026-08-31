import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddingService';
import type { ProcessedDocument } from './documentService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Store a processed document in Supabase with vector embeddings
 * @param document The processed document to store
 * @returns True if successful, false otherwise
 */
export async function storeDocumentInSupabase(document: ProcessedDocument): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)');
    }

    if (!document.chunks || document.chunks.length === 0) {
      throw new Error('No chunks available to store');
    }

    // Prepare chunk records for insertion
    const chunkRecords = document.chunks.map((chunk) => ({
      content: chunk.text,
      embedding: chunk.embedding,
      metadata: {
        fileName: document.fileName,
        fileType: document.fileType,
        chunkId: chunk.id,
      },
    }));

    // Insert chunks into document_chunks table
    const { error } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    console.log(`Successfully stored ${chunkRecords.length} chunks for ${document.fileName}`);
    return true;
  } catch (error) {
    console.error('Error storing document in Supabase:', error);
    return false;
  }
}

/**
 * Retrieve relevant document chunks from Supabase using vector similarity
 * @param query The search query
 * @param matchCount Number of results to return (default: 3)
 * @param matchThreshold Similarity threshold (0-1, default: 0.5)
 * @returns Array of relevant chunk texts
 */
export async function retrieveRelevantContext(
  query: string,
  matchCount = 3,
  matchThreshold = 0.5
): Promise<string[]> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error('Failed to generate query embedding');
    }

    // Call the match_document_chunks stored function
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      throw new Error(`RPC call error: ${error.message}`);
    }

    // Extract text content from results
    const results = Array.isArray(data) ? data : [];
    const contextTexts = results.map((result: any) => result.content || result.text || '').filter((text: string) => text.length > 0);

    console.log(`Retrieved ${contextTexts.length} relevant chunks for query: "${query}"`);
    return contextTexts;
  } catch (error) {
    console.error('Error retrieving context from Supabase:', error);
    // Return empty array on error instead of throwing
    return [];
  }
}
