import ExcelJS from 'exceljs';
import fs from 'fs';
import mammoth from 'mammoth';
import path from 'path';
import pdf from 'pdf-parse';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

function cleanText(text: string): string {
  // Remove caracteres de controle e formatação indesejados
  let cleanedText = text.replace(/[\r\f\b\u000b]/g, '');
  
  // Normaliza quebras de linha
  cleanedText = cleanedText.replace(/\n+/g, '\n');
  
  // Remove espaços em branco extras
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  
  return cleanedText;
}

export async function parseDocument(filePath: string): Promise<{ text: string, fileType: string }> {
  const fileType = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    switch (fileType) {
      case '.pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(pdfBuffer);
        text = pdfData.text;
        break;
      case '.docx':
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
        break;
      case '.xlsx':
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        workbook.eachSheet((worksheet) => {
          worksheet.eachRow((row) => {
            const rowValues = row.values as any[];
            // Skip first empty cell in each row
            for (let i = 1; i < rowValues.length; i++) {
              if (rowValues[i] !== undefined) {
                text += rowValues[i] + ' ';
              }
            }
            text += '\n';
          });
          text += '\n---\n';
        });
        break;
      case '.pptx':
        try {
          const pptxBuffer = fs.readFileSync(filePath);
          text = await getTextFromPPTX(pptxBuffer);
        } catch (err: any) {
          throw new Error(`Failed to parse PPTX file: ${err.message}`);
        }
        break;
      case '.txt':
        text = fs.readFileSync(filePath, 'utf-8');
        break;
      default:
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
    }

    // Limpa o texto antes de retornar
    text = cleanText(text);
    return { text, fileType: fileType.substring(1) }; // Remove o ponto do fileType
  } catch (error) {
    throw new Error(`Erro ao analisar o documento: ${(error as Error).message}`);
  }
}

async function getTextFromPPTX(buffer: Buffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);

    const aNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
    let text = '';
    
    let slideIndex = 1;
    while (true) {
      const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
      
      if (!slideFile) break;
      
      const slideXmlStr = await slideFile.async('text');
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');
      
      text += getTextFromNodes(xmlDoc, "t", aNamespace) + ' ';
      
      slideIndex++;
    }

    return text.trim();
  } catch (err) {
    console.error('Error extracting text from PPTX:', err);
    return '';
  }
}

function getTextFromNodes(node: Document, tagName: string, namespaceURI: string): string {
  let text = '';
  const textNodes = node.getElementsByTagNameNS(namespaceURI, tagName);
  for (let i = 0; i < textNodes.length; i++) {
    text += textNodes[i].textContent + ' ';
  }
  return text.trim();
}

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  
  // Divisão simplificada por parágrafos ou períodos
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += paragraph + '\n\n';
    } else {
      // Se o parágrafo for maior que maxChunkSize, divida-o em sentenças
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= maxChunkSize) {
            currentChunk += sentence + ' ';
          } else {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = '';
            }
            
            // Se uma única sentença for maior que maxChunkSize, divida-a
            if (sentence.length > maxChunkSize) {
              let remainingSentence = sentence;
              while (remainingSentence.length > 0) {
                const chunk = remainingSentence.substring(0, maxChunkSize);
                chunks.push(chunk.trim());
                remainingSentence = remainingSentence.substring(maxChunkSize);
              }
            } else {
              currentChunk = sentence + ' ';
            }
          }
        }
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph + '\n\n';
      }
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}