
import { google } from 'googleapis';

export const config = {
    runtime: 'nodejs',
};

// Map of user emails to their specific category folder IDs
const USER_FOLDER_MAP: Record<string, Record<string, string>> = {
    "guillermo.haya@alumni.mondragon.edu": {
        "cv": "1kh7vPuGvfGOrDhK7v3Kvy3nMMH1lRhGp",
        "molecula": "1QIDQwU0ydcVaXh92SxQoAGiv4_Fg79ze",
        "libro": "1zlJanX4uoHGBKGCmg-hdwlziHi5SFA4I",
        "bp": "1zlJanX4uoHGBKGCmg-hdwlziHi5SFA4I",
        "cp": "1sN_rNRBt6uPxAtaVJVHIR5kHUWICghNf",
        "sharing": "1lS_DrIFgUX2Bhiiydegd8qSHUACayDwJ"
    },
    "jimena.gonzalez-tarr@alumni.mondragon.edu": {
        "cv": "1bhhbc0PmaLD0i9H_GV43jkkU8nEGg-Zz",
        "molecula": "1u5TsDTQAIRWYisG3zKlcZSa3o__AZZBF",
        "libro": "1JGEW4VrJiQbTkCAMabHrVWbyTSnVteaf",
        "bp": "1JGEW4VrJiQbTkCAMabHrVWbyTSnVteaf",
        "cp": "14fi8aAnT24lx00mo3UI3ikNC8scLbATQ",
        "sharing": "14AMQNFe2FMrHmv3YJU8MzSWbU3ZFSvCc"
    },
    "carlos.pereza@alumni.mondragon.edu": {
        "cv": "1-OIwroKYKj8ry9L8DZpoUCvGdCn6SEX7",
        "molecula": "1uUjOtKYOYefw4SEXbF1zEZSXGWp29u5P",
        "libro": "10plSR6wWzgvgLouklAeMoPqSzEqe06cE",
        "bp": "10plSR6wWzgvgLouklAeMoPqSzEqe06cE",
        "cp": "10plSR6wWzgvgLouklAeMoPqSzEqe06cE",
        "sharing": "1Car-pSCxQQPmoO1OO4pJtnI4PRfNoMIt"
    },
    "carlos.ortas@alumni.mondragon.edu": {
        "cv": "1bsDjkDheinfbXxg2vbrgfzSxao4uvmV1",
        "molecula": "1VFXQEdTJx-d6DWCdglD0bPd1OURGBUeS",
        "libro": "1DGYTMCz5LPT3Iy_b-V62hNOAO8oj_VY4",
        "bp": "1DGYTMCz5LPT3Iy_b-V62hNOAO8oj_VY4",
        "cp": "1QhpYIqOrguSkaxLFTqVTHKKX6mSJhFXJ",
        "sharing": "1oATN7YFGJ__ZODoiRpjeyPD7KgzfD4K6"
    },
    "claudia.pinna@alumni.mondragon.edu": {
        "cv": "1Gg1UUjiZNIMTsD5IRAYCUixdGz8oICcs",
        "molecula": "1_Ky0rzcV4emF-TSDDCIWlNQmsfl35YX9",
        "libro": "1GOk57042-4EV5bw7pVjLIL6L52T8mFWX",
        "bp": "1GOk57042-4EV5bw7pVjLIL6L52T8mFWX",
        "cp": "1Wzxpe516TGSKPm16J67ExuVxpmy7J4z6",
        "sharing": "1LK4yGAodBBUZyMAf1rwD5c1e6dPQKNUt"
    },
    "jaime.gonzalez@alumni.mondragon.edu": {
        "cv": "1FVlFuxdZGYvLcU2yxYuHj_ZYpi5xrft2",
        "molecula": "1z0W9EZtE9LOtkF4IGETu9ZaEHBdzdDH_",
        "libro": "1Aq39b_KYMWTSkNKHVDQO1yQkmI2EeNEK",
        "bp": "1Aq39b_KYMWTSkNKHVDQO1yQkmI2EeNEK",
        "cp": "10zEIpomGq1bhmAiF-efHjMdD9s5jO4Uq",
        "sharing": "1czC-1GNmx-KUHsAVC1l0QgA2HT58BZ04"
    },
    "marc.cano@alumni.mondragon.edu": {
        "cv": "1JNhAo6243B0DiYNG2dkYxOiHCEgDvdhJ",
        "molecula": "18AopnYSztBO7THFhV1c1awTaU8OUsGy0",
        "libro": "1je2R-IHPSo6lSr0hYGlGbPgXjTXCP0hM",
        "bp": "1je2R-IHPSo6lSr0hYGlGbPgXjTXCP0hM",
        "cp": "107RFuNQh3lJwcN2_c0fld6kDvxfIplG1",
        "sharing": "179lMUTUk6sU43d6dpy00WlLbY-6yGjKK"
    },
    "paula.gascon@alumni.mondragon.edu": {
        "cv": "1PtZTUTp2Wci-6SWYaIHq4FV1yHQUm1Tz",
        "molecula": "17mWy9LIIpMMexI9T3Dv8C3shtZqm3iV5",
        "libro": "1FYJmfA0aUZe_tP3Boip-jrF6opgggMbe",
        "bp": "1FYJmfA0aUZe_tP3Boip-jrF6opgggMbe",
        "cp": "1ZlvDIO7Ksg1ln-7d6opSHast3rECfjhO",
        "sharing": "1LlWiFQi5bGwFgHv2-QbbCkfFGZUzSrRn"
    },
    "angela.cuevas@alumni.mondragon.edu": {
        "cv": "1r_sARXzVBznrp8kX-rRgiPO6nVuAGhu1",
        "molecula": "1N94lufjcH5v-AAnpmqVk12FG-clRgFZy",
        "libro": "1dE8dt_1wIVGAfIL9SXGhrE0f0djlO-D0",
        "bp": "1dE8dt_1wIVGAfIL9SXGhrE0f0djlO-D0",
        "cp": "1Rsfg5Gg7pzYA0TLAnxdW4v30wKtHUwlF",
        "sharing": "1-2TgKoBf4k5AZuI37KkLSrWTXA5cz9Qm"
    }
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { userEmail, pdfUrl, fileName, type } = await req.json() as any;

        if (!userEmail || !pdfUrl || !fileName || !type) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userFolders = USER_FOLDER_MAP[userEmail.toLowerCase()];
        const targetFolderId = userFolders?.[type];

        if (!targetFolderId) {
            console.warn(`No Drive folder configured for user ${userEmail} and type ${type}`);
            return new Response(JSON.stringify({ message: 'Target folder not configured', skipped: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Initialize Google Drive API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 2. Download file from Supabase
        const fileResponse = await fetch(pdfUrl);
        if (!fileResponse.ok) throw new Error(`Failed to download file from Supabase: ${fileResponse.statusText}`);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Search for existing file with same name in same folder
        const existingFiles: any = await drive.files.list({
            q: `name = '${fileName}' and '${targetFolderId}' in parents and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        const existingFile = existingFiles.data.files[0];

        // 4. Upload or Update directly to the target folder
        const { Readable } = await import('stream');
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        let uploadResponse: any;

        if (existingFile) {
            console.log(`Updating existing file: ${fileName} (${existingFile.id})`);
            uploadResponse = await drive.files.update({
                fileId: existingFile.id,
                media: {
                    mimeType: 'application/pdf',
                    body: stream,
                },
                fields: 'id, webViewLink'
            } as any);
        } else {
            console.log(`Creating new file: ${fileName}`);
            uploadResponse = await drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [targetFolderId],
                },
                media: {
                    mimeType: 'application/pdf',
                    body: stream,
                },
                fields: 'id, webViewLink'
            } as any);
        }

        return new Response(JSON.stringify({
            success: true,
            driveFileId: uploadResponse.data.id,
            link: uploadResponse.data.webViewLink,
            action: existingFile ? 'updated' : 'created'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Drive Sync Error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
