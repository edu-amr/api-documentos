export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    fileName: string;
    fileType: string;
    chunkIndex: number;
    pageNumber?: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  documentId?: string;
  query: string;
  previousMessages?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: DocumentChunk[];
}