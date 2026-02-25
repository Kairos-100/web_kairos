import * as pdfjs from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
 * Gets embeddings for a text string using Gemini.
 */
export async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the latest 2026 model: gemini-embedding-001
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
        content: { parts: [{ text }] },
        // Match the 768 dimensions in our Supabase SQL
        outputDimensionality: 768
    });
    return result.embedding.values;
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
    // If no apiKey, we can't do real embeddings, but we'll try to find one
    const key = apiKey || localStorage.getItem('kairos_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
        console.warn('No se encontró API Key para generar embeddings reales. Saltando ingesta.');
        return;
    }

    try {
        console.log(`Iniciando ingesta para ${sourceType}: ${sourceId}`);

        const text = await extractTextFromPDF(pdfUrl);
        if (!text) return;

        // Limpiar secciones previas para evitar duplicados
        await supabase
            .from('document_sections')
            .delete()
            .eq('source_id', sourceId);

        const chunks = chunkText(text);

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk, key);

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
    } catch (err) {
        console.error('Error in ingestDocument:', err);
        throw err;
    }
}

/**
 * Retrieval: Find relevant chunks for a question.
 */
export async function getRelevantContext(query: string, apiKey: string): Promise<string> {
    try {
        const queryEmbedding = await getEmbedding(query, apiKey);

        const { data: sections, error } = await supabase.rpc('match_document_sections', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5
        });

        if (error) throw error;

        return sections
            .map((s: any) => `[Origen: ${s.source_type} ${s.source_id}]\n${s.content}`)
            .join('\n\n---\n\n');
    } catch (err) {
        console.error('Error getting context:', err);
        return '';
    }
}

/**
 * Generation: Chat with Gemini using RAG context.
 */
export async function generateAiResponse(query: string, apiKey: string): Promise<string> {
    const context = await getRelevantContext(query, apiKey);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Eres Kairos AI, un asistente experto en el conocimiento compartido de la organización Kairos. 
Tu objetivo es responder preguntas basándote ÚNICAMENTE en el contexto proporcionado abajo.
Si el contexto no contiene la información necesaria, dilo amablemente, pero no inventes nada.

CONTEXTO DE LOS DOCUMENTOS DE KAIROS:
${context}

PREGUNTA DEL USUARIO:
${query}

Responde de forma profesional, clara y en español. Cita los documentos si es posible.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Runs a full batch ingestion of all existing documents in Supabase.
 */
export async function runLegacyIngestion(onProgress?: (msg: string) => void) {
    const key = localStorage.getItem('kairos_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
        if (onProgress) onProgress('Error: No se encontró Gemini API Key. Por favor, introdúcela en el chat de IA primero.');
        return;
    }

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
                await ingestDocument(essay.id, 'essay', essay.pdf_url, key);
            }
        }

        for (const metric of metrics || []) {
            if (metric.cv_pdf_url) {
                if (onProgress) onProgress(`Indexando CV: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.cv_pdf_url, key);
            }
            if (metric.sharing_pdf_url) {
                if (onProgress) onProgress(`Indexando Sharing: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.sharing_pdf_url, key);
            }
            if (metric.cp_pdf_url) {
                if (onProgress) onProgress(`Indexando CP: ${metric.id}...`);
                await ingestDocument(metric.id, 'metric', metric.cp_pdf_url, key);
            }
        }

        if (onProgress) onProgress(`¡Éxito! Base de conocimiento actualizada.`);
    } catch (err: any) {
        console.error('Error en runLegacyIngestion:', err);
        if (onProgress) onProgress(`Error: ${err.message}`);
        throw err;
    }
}
