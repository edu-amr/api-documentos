import multer from 'multer';
import path from 'path';
import { AppError } from '../utils/errorHandler';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para tipos de arquivos permitidos
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFileTypes = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`Tipo de arquivo não suportado. Tipos permitidos: ${allowedFileTypes.join(', ')}`, 400));
  }
};

// Configuração do middleware Multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB
  }
});