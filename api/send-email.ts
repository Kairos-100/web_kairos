
import { Resend } from 'resend';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: 'Resend API key not configured on server' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { to, subject, html, attachments, from } = await req.json();

        const resend = new Resend(RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: from || 'Kairos Team <notificaciones@kairoscompany.es>',
            to,
            subject,
            html,
            attachments: attachments?.map((a: any) => ({
                filename: a.filename,
                content: a.content,
            })),
        });

        if (error) {
            return new Response(JSON.stringify({ error }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
