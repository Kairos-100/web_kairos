import * as pdfjs from 'pdfjs-dist';
import { supabase } from './supabase';
import OpenAI from 'openai';
import type { Essay, MetricEntry } from '../constants';
import type { ClockifyUserTime, ClockifyProjectSummary } from './clockify';

// Configure the worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/**
 * Robust text sanitation to prevent Unicode and control character errors.
 */
function sanitizeText(text: string): string {
    if (!text) return '';
    // Removes non-printable characters and invalid Unicode control codes
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
}

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

        return sanitizeText(fullText);
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
 * Gets embeddings for a text string using OpenAI.
 */
export async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const sanitizedText = sanitizeText(text);
    if (!sanitizedText) throw new Error('El texto para el embedding está vacío después de la limpieza.');

    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: sanitizedText,
        dimensions: 768 // Mantenemos 768 para compatibilidad con el índice HNSW de Supabase
    });

    return response.data[0].embedding;
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
    const key = apiKey || localStorage.getItem('kairos_openai_key') || import.meta.env.VITE_OPENAI_API_KEY;
    if (!key) {
        console.warn('No se encontró API Key de OpenAI para generar embeddings reales. Saltando ingesta.');
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
 * Generation: Chat with OpenAI using RAG context and Dashboard Metadata.
 */
export async function generateAiResponse(
    query: string,
    apiKey: string,
    dashboardSummary?: string
): Promise<string> {
    const context = await getRelevantContext(query, apiKey);

    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const prompt = `
Eres Kairos AI, un asistente experto en el conocimiento compartido de la organización Kairos. 
Tu objetivo es responder preguntas basándote en el CONTEXTO DE DOCUMENTOS y en el ESTADO DEL DASHBOARD.

${dashboardSummary || ''}

CONTEXTO DE LOS DOCUMENTOS DE KAIROS (RAG):
${context}

PREGUNTA DEL USUARIO:
${query}

INSTRUCCIONES:
1. Prioriza los documentos para preguntas de conocimiento profundo/técnico.
2. Usa el "ESTADO DEL DASHBOARD" para preguntas sobre métricas, rankings, actividad total o resultados.
3. Responde de forma profesional, clara y en español. Cita documentos si es posible.
4. Si la información no está en ninguna de las fuentes, dilo amablemente.
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });

        const textResponse = response.choices[0].message.content;
        if (!textResponse) throw new Error('La IA devolvió una respuesta vacía.');
        return textResponse;
    } catch (err: any) {
        console.error('Error final in generateAiResponse:', err);
        throw new Error(`Error en la generación de OpenAI: ${err.message || 'Error desconocido'}`);
    }
}

/**
 * Generates a text summary of the dashboard data for AI context injection.
 */
export function generateDashboardSummary(
    essays: Essay[],
    metrics: MetricEntry[],
    clockifyData?: {
        users: ClockifyUserTime[];
        projects: ClockifyProjectSummary[];
        totalTime: number;
    } | null
): string {
    const totalEssays = essays.length;
    const totalPoints = essays.reduce((acc, e) => acc + (e.points || 0), 0);
    const moleculas = essays.filter(e => e.type === 'molecula').length;
    const libros = essays.filter(e => e.type === 'libro').length;

    const revenues = metrics.reduce((acc, m) => acc + (Number(m.revenue) || 0), 0);
    const profits = metrics.reduce((acc, m) => acc + (Number(m.profit) || 0), 0);

    const authors = essays.reduce((acc: Record<string, number>, e) => {
        acc[e.author] = (acc[e.author] || 0) + (e.points || 0);
        return acc;
    }, {});

    const topContributor = Object.entries(authors)
        .sort((a, b) => b[1] - a[1])[0];

    const categories = essays.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
    }, {});

    const topCategory = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])[0];

    // Clockify section
    let clockifySummary = '';
    if (clockifyData && clockifyData.totalTime > 0) {
        const totalHours = Math.floor(clockifyData.totalTime / 3600);
        const topProject = clockifyData.projects[0];
        const projectsText = clockifyData.projects.map(p => {
            const h = Math.floor(p.totalTime / 3600);
            const m = Math.floor((p.totalTime % 3600) / 60);
            return `- ${p.projectName}: ${h}h ${m}m`;
        }).join('\n');

        clockifySummary = `
DISTRIBUCIÓN DE TIEMPO (CLOCKIFY ESTA SEMANA):
- Tiempo Total: ${totalHours} horas acumuladas.
- Foco Principal: El proyecto "${topProject?.projectName || 'N/A'}" es el que más tiempo consume.
- Desglose por Proyectos:
${projectsText}
`;
    }

    return `
ESTADO ACTUAL DEL DASHBOARD (RESUMEN EN TIEMPO REAL):
- Actividad: ${totalEssays} aportaciones totales (${moleculas} Moléculas, ${libros} Libros).
- Desempeño: ${totalPoints} puntos acumulados por el equipo.
- Financiero: ${revenues.toLocaleString('es-ES')}€ de Ingresos / ${profits.toLocaleString('es-ES')}€ de Beneficio.
- Liderazgo: El top contributor es ${topContributor ? topContributor[0] : 'N/A'} con ${topContributor ? topContributor[1] : 0} puntos.
- Temas: La categoría más explorada es "${topCategory ? topCategory[0] : 'N/A'}".
- Registros: Hay ${metrics.length} entradas en el historial de métricas.
${clockifySummary}
`;
}

/**
 * Runs a full batch ingestion of all existing documents in Supabase.
 */
export async function runLegacyIngestion(onProgress?: (msg: string) => void) {
    const key = localStorage.getItem('kairos_openai_key') || import.meta.env.VITE_OPENAI_API_KEY;
    if (!key) {
        if (onProgress) onProgress('Error: No se encontró OpenAI API Key. Por favor, introdúcela en el chat de IA primero.');
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
