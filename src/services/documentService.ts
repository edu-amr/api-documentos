import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequest, ChatResponse, DocumentChunk } from '../types';
import { chunkText, parseDocument } from '../utils/documentParser';
import { OpenAIService } from './openaiService';
import { createEmbeddings, searchSimilarDocuments } from './embeddingService';

// Diretório para armazenar documentos temporários
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Garantir que o diretório de uploads exista
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class DocumentService {
  private openAIService: OpenAIService;
  
  constructor() {
    this.openAIService = new OpenAIService();
  }
  
  async processDocument(file: Express.Multer.File): Promise<string> {
    try {
      const documentId = uuidv4();
      const filePath = path.join(UPLOAD_DIR, file.filename);
      
      // Parsear o documento
      const { text, fileType } = await parseDocument(filePath);
      
      // Dividir em chunks
      const textChunks = chunkText(text);
      
      // Criar DocumentChunks
      const documentChunks: DocumentChunk[] = textChunks.map((chunkText, index) => ({
        id: `${documentId}-chunk-${index}`,
        text: chunkText,
        metadata: {
          documentId,
          fileName: file.originalname,
          fileType,
          chunkIndex: index,
        }
      }));
      
      // Criar embeddings e armazenar no Pinecone
      await createEmbeddings(documentChunks);
      
      // Opcional: rpcional: remover o arquivoi/  fs.un//linkSync(filePath);
      
      return documentId;
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      throw new Error(`Falha ao processar documento: ${(error as Error).message}`);
    }
  }
  
  async chatWithDocument(chatRequest: ChatRequest): Promise<ChatResponse> {
    try {
      const { documentId, query, previousMessages = [] } = chatRequest;
      
      // Buscar chunks relevantes
      const relevantChunks = await searchSimilarDocuments(query, documentId, 5);
      
      if (relevantChunks.length === 0 || relevantChunks.every(chunk => !chunk.text)) {
        return {
          answer: "Não encontrei nenhuma informação relevante nos documentos fornecidos para responder à sua pergunta.",
          sources: []
        };
      }
      
      // Recuperar o texto completo para cada chunk (implementação simplificada)
      // Em um sistema real, você armazenaria os textos em um banco de dados
      const chunksWithText: DocumentChunk[] = relevantChunks;
      
      // Gerar resposta usando Claude
      const answer = await this.openAIService.generateResponse(query, chunksWithText, previousMessages);
      
      return {
        answer,
        sources: chunksWithText
      };
    } catch (error) {
      console.error('Erro ao chatear com documento:', error);
      throw new Error(`Falha ao chatear com documento: ${(error as Error).message}`);
    }
  }
}