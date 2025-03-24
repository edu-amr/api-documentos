import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    index: process.env.PINECONE_INDEX || 'document-chat',
  },
};