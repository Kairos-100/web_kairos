
import { google } from 'googleapis';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: Request) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return new Response(JSON.stringify({ error: 'Missing file ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

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

    } catch (err: any) {
        console.error('Proxy Drive Error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
