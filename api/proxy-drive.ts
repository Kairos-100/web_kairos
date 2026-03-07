
import { google } from 'googleapis';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: Request) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return new Response(JSON.stringify({ error: 'Falta el ID del archivo' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        return new Response(JSON.stringify({ error: 'Configuración incompleta: Faltan variables GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY en Vercel.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        try {
            const response: any = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );

            return new Response(response.data, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                },
            });
        } catch (driveErr: any) {
            console.error('Drive API Error:', driveErr);
            return new Response(JSON.stringify({
                error: `Error de Google Drive API: ${driveErr.message}`,
                code: driveErr.code || 500
            }), {
                status: driveErr.code || 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (err: any) {
        console.error('Proxy Drive Wrapper Error:', err);
        return new Response(JSON.stringify({ error: `Error interno del servidor (Proxy): ${err.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
