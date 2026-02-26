import type { Essay, MetricEntry, Comment } from '../constants';
import { WHITELIST } from '../constants';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

/**
 * Generic function to send email via Resend REST API
 */
async function sendEmail(to: string[], subject: string, html: string) {
    if (!RESEND_API_KEY) {
        console.warn('Resend API Key no configurada. Saltando envío de email.');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Kairos Team <notificaciones@kairoscompany.es>',
                to,
                subject,
                html
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error de Resend: ${JSON.stringify(error)}`);
        }
    } catch (err) {
        console.error('Error enviando notificación por email:', err);
    }
}

/**
 * Notifica sobre una nueva Tesis/Ensayo
 */
export async function notifyNewEssay(essay: Essay) {
    const recipients = WHITELIST.filter(email => email !== essay.author);
    if (recipients.length === 0) return;

    const subject = `🚀 ¡Nueva Tesis publicada por ${essay.author.split('@')[0]}!`;
    const html = `
        <div style="font-family: sans-serif; color: #0F1D42; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
            <h2 style="color: #3B82F6;">¡Felicidades Equipo Kairos! 🎉</h2>
            <p><strong>${essay.author}</strong> acaba de compartir nuevo conocimiento:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${essay.title}</h3>
                <p style="color: #64748b; font-size: 14px;">Categoría: <strong>${essay.category}</strong></p>
                <p>${essay.content.substring(0, 200)}...</p>
                ${essay.pdfUrl ? `<a href="${essay.pdfUrl}" style="display: inline-block; background: #0F1D42; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 10px;">Leer Documento</a>` : ''}
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Sigue construyendo el futuro de la organización.</p>
        </div>
    `;

    await sendEmail(recipients, subject, html);
}

/**
 * Notifica sobre un nuevo registro de Métricas
 */
export async function notifyNewMetric(metric: MetricEntry) {
    const recipients = WHITELIST.filter(email => email !== metric.user_email);
    if (recipients.length === 0) return;

    const subject = `📈 ¡Nuevas métricas registradas! (${metric.user_email.split('@')[0]})`;

    // Preparar resumen financiero
    const revenue = Number(metric.revenue) || 0;

    const html = `
        <div style="font-family: sans-serif; color: #0F1D42; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
            <h2 style="color: #10B981;">¡Impacto Real! 💰</h2>
            <p><strong>${metric.user_email}</strong> ha actualizado las métricas comerciales:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 15px; margin: 20px 0; border: 1px solid #dcfce7;">
                <div style="display: flex; gap: 20px; margin-bottom: 10px;">
                    <div>
                        <p style="color: #166534; font-size: 11px; font-weight: bold; text-transform: uppercase;">Ingresos</p>
                        <p style="font-size: 24px; font-weight: bold; margin: 0;">${revenue.toLocaleString('es-ES')}€</p>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <p style="font-size: 14px;"><strong>Actividad:</strong> CV: ${metric.cv} | CP: ${metric.cp} | Sharing: ${metric.sharing}</p>
                </div>
                ${metric.cv_pdf_url || metric.cp_pdf_url || metric.sharing_pdf_url ? '<p style="font-size: 12px; margin-top: 10px;">¡Se han adjuntado documentos de respaldo!</p>' : ''}
            </div>
            <p style="font-size: 12px; color: #94a3b8;">¡Cambiando las reglas del juego!</p>
        </div>
    `;

    await sendEmail(recipients, subject, html);
}

/**
 * Notifica sobre un nuevo comentario
 */
export async function notifyNewComment(essayTitle: string, comment: Comment) {
    // Notificamos a todos menos al autor del comentario
    const recipients = WHITELIST.filter(email => email !== comment.author);
    if (recipients.length === 0) return;

    const subject = `💬 Nuevo comentario en "${essayTitle}"`;
    const html = `
        <div style="font-family: sans-serif; color: #0F1D42; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
            <h3 style="color: #F59E0B;">Feedback en curso...</h3>
            <p><strong>${comment.author}</strong> ha comentado en la tesis:</p>
            <p style="font-weight: bold; border-left: 4px solid #F59E0B; padding-left: 15px; margin: 20px 0; font-style: italic;">
                "${comment.text}"
            </p>
            <p style="font-size: 12px; color: #94a3b8;">Documento: ${essayTitle}</p>
        </div>
    `;

    await sendEmail(recipients, subject, html);
}
