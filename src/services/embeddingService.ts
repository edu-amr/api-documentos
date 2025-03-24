import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/config';
import { DocumentChunk } from '../types';

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export async function createEmbeddings(chunks: DocumentChunk[]): Promise<void> {
  const index = pinecone.index(config.pinecone.index);
  
  // Processar em lotes para não sobrecarregar a API
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    // Obter embeddings do Claude API
    const embeddingResponses = await Promise.all(
      batch.map(async (chunk) => {
        try {
          const response = await openai.embeddings.create({
            model: config.openai.model,
            input: chunk.text,
          });
          return {
            id: chunk.id,
            embedding: response.data[0].embedding,
            metadata: chunk.metadata,
          };
        } catch (error) {
          console.error(`Erro ao criar embedding para o chunk ${chunk.id}:`, error);
          throw error;
        }
      })
    );
    
    // Inserir no Pinecone com o texto incluído nos metadados
    await index.upsert(
      embeddingResponses.map((item) => ({
        id: item.id,
        values: item.embedding,
        metadata: {
          ...item.metadata,
          text: batch.find(chunk => chunk.id === item.id)?.text || ''
        },
      }))
    );
  }
}

export async function searchSimilarDocuments(query: string, documentId?: string, limit: number = 5): Promise<DocumentChunk[]> {
  try {
    const index = pinecone.index(config.pinecone.index);
    
    // Gerar embedding para a consulta
    const embeddingResponse = await openai.embeddings.create({
      model: config.openai.model,
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Parâmetros de busca
    const searchParams: any = {
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
    };
    
    // Adicionar filtro por documentId se fornecido
    if (documentId) {
      searchParams.filter = {
        documentId: { $eq: documentId }
      };
    }
    
    // Executar a busca
    const results = await index.query(searchParams);
    
    // Mapear resultados para DocumentChunk
    return results.matches.map((match) => ({
      id: match.id,
      text: (match.metadata as any).text || '',
      metadata: {
        documentId: (match.metadata as any).documentId,
        fileName: (match.metadata as any).fileName,
        fileType: (match.metadata as any).fileType,
        chunkIndex: (match.metadata as any).chunkIndex,
        pageNumber: (match.metadata as any).pageNumber,
      },
    }));
  } catch (error) {
    console.error('Erro ao buscar documentos similares:', error);
    throw error;
  }
}