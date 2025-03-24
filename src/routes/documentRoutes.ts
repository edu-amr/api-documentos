import { Router } from 'express';
import { chatWithDocument, uploadDocument } from '../controllers/documentController';
import { upload } from '../middlewares/upload';

const router = Router();

// Rota para upload de documentos
router.post('/upload', upload.single('document'), uploadDocument);

// Rota para chatear com documentos
router.post('/chat', chatWithDocument);

export default router;