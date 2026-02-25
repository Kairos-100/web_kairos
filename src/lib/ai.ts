import * as pdfjs from 'pdfjs-dist';
import { supabase } from './supabase';

// Configure the worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/**
 * Extracts all text from a PDF file (Blob or URL).
 */
export async function extractTextFromPDF(source: string | Blob): Promise<string> {
    try {
        let loadingTask;
        if (typeof source === 'string') {
            loadingTask = pdfjs.getDocument(source);
        } else {
            const arrayBuffer = await source.arrayBuffer();
            loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        }

        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + ' ';
        }

        return fullText.trim();
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('No se pudo extraer el texto del PDF.');
    }
}

/**
 * Splits text into overlapping chunks for RAG.
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.substring(start, end));
        start += chunkSize - overlap;
    }

    return chunks;
}

/**
 * Ingests a single document (Essay or Metric) into the AI knowledge base.
 */
export async function ingestDocument(
    sourceId: string,
    sourceType: 'essay' | 'metric',
    pdfUrl: string,
    apiKey?: string
) {
    try {
        console.log(`Iniciando ingesta para ${sourceType}: ${sourceId}`);

        const text = await extractTextFromPDF(pdfUrl);
        if (!text) {
            console.warn('Documento vacío o sin texto extraíble.');
            return;
        }

        const chunks = chunkText(text);

        for (const chunk of chunks) {
            // MOCK VECTOR - Replace with real Embedding API call later
            const embedding = new Array(1536).fill(0).map(() => Math.random());

            const { error } = await supabase
                .from('document_sections')
                .insert({
                    source_id: sourceId,
                    source_type: sourceType,
                    content: chunk,
                    embedding: embedding
                });

            if (error) throw error;
        }

        console.log(`Ingesta completada!`);
        // @ts-ignore
        const _k = apiKey;
    } catch (err) {
        console.error('Error in ingestDocument:', err);
        throw err;
    }
}

/**
 * Runs a full batch ingestion of all existing documents in Supabase.
 */
export async function runLegacyIngestion(onProgress?: (msg: string) => void) {
    try {
        if (onProgress) onProgress('Buscando documentos existentes...');

        const { data: essays, error: eError } = await supabase
            .from('essays')
            .select('id, pdf_url')
            .not('pdf_url', 'is', null);

        if (eError) throw eError;

        const { data: metrics, error: mError } = await supabase
            .from('metrics')
            .select('id, cv_pdf_url, sharing_pdf_url, cp_pdf_url');

        if (mError) throw mError;

        if (onProgress) onProgress(`Encontradas ${essays?.length || 0} tesis y ${metrics?.length || 0} registros de métricas.`);

        for (const essay of essays || []) {
            if (essay.pdf_url) {
                if (onProgress) onProgress(`Indexando Tesis: ${essay.id}...`);
                await ingestDocument(essay.id, 'essay', essay.pdf_url);
            }
        }

        for (const metric of metrics || []) {
            if (metric.cv_pdf_url) {
                if (onProgress) onProgress(`Indexando CV: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.cv_pdf_url);
            }
            if (metric.sharing_pdf_url) {
                if (onProgress) onProgress(`Indexando Sharing: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.sharing_pdf_url);
            }
            if (metric.cp_pdf_url) {
                if (onProgress) onProgress(`Indexando CP: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.cp_pdf_url);
            }
        }

        if (onProgress) onProgress(`¡Éxito! Base de conocimiento actualizada.`);
    } catch (err: any) {
        console.error('Error en runLegacyIngestion:', err);
        if (onProgress) onProgress(`Error: ${err.message}`);
        throw err;
    }
}
