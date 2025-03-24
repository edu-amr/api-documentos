import OpenAI from 'openai';
import { config } from '../config/config';
import { ChatMessage, DocumentChunk } from '../types';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateResponse(
    query: string,
    relevantChunks: DocumentChunk[],
    previousMessages: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Preparar o contexto de documentos relevantes
      const documentContext = relevantChunks
        .map(chunk => {
          const metadata = chunk.metadata;
          return `Documento: ${metadata.fileName} (${metadata.fileType.toUpperCase()})
            Trecho ${metadata.chunkIndex + 1}${metadata.pageNumber ? `, Página ${metadata.pageNumber}` : ''}:
            ---
            ${chunk.text}
            ---
          `;
        })
        .join('\n\n');

      // Construir mensagens para a API
      const messages = [
        {
          role: 'system',
          content: `Você é um assistente especializado em responder perguntas com base em documentos. 
            Responda à pergunta do usuário usando apenas as informações contidas nos trechos de documentos fornecidos.
            Se a resposta não estiver contida nesses trechos, diga "Não encontrei informações sobre isso nos documentos fornecidos."
            Não invente informações que não estejam presentes nos trechos.
            Você pode citar documentos específicos nas suas respostas quando apropriado.
          `
        },
        {
          role: 'user',
          content: `Aqui estão trechos relevantes dos documentos:
            ${documentContext}
            Com base apenas nesses trechos, responda à minha pergunta: ${query}
          `
        }
      ];

      // Adicionar histórico de conversas se houver
      let formattedMessages: any[] = messages;
      if (previousMessages.length > 0) {
        formattedMessages = [
          messages[0],
          ...previousMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          messages[1]
        ];
      }

      // Chamar a API do Claude
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        max_tokens: 1024,
        messages: formattedMessages,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro ao gerar resposta com Claude:', error);
      throw new Error(`Falha ao gerar resposta: ${(error as Error).message}`);
    }
  }
}