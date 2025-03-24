import { Request, Response } from 'express';
import { DocumentService } from '../services/documentService';
import { ChatRequest } from '../types';

const documentService = new DocumentService();

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum arquivo foi enviado'
      });
    }
    const documentId = await documentService.processDocument(req.file);
    
    res.status(200).json({
      status: 'success',
      data: {
        documentId,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: (error as Error).message
    });
  }
};

export const chatWithDocument = async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;
    
    if (!chatRequest.query) {
      return res.status(400).json({
        status: 'error',
        message: 'A consulta não pode estar vazia'
      });
    }
    
    const response = await documentService.chatWithDocument(chatRequest);
    
    res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: (error as Error).message
    });
  }
};