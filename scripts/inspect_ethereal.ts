import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data: keys } = await supabase.from('holded_api_keys').select('*').eq('active', true);
    if (!keys || keys.length === 0) return;
    const apiKey = keys[0].api_key;

    // ETHEREAL ID: 669697707ec57e5ea608f5c4
    const res = await fetch('https://api.holded.com/api/projects/v1/projects/669697707ec57e5ea608f5c4', { headers: { 'key': apiKey } });
    const detail = await res.json();
    
    console.log('Project:', detail.name);
    
    if (detail.expenses) {
        console.log(`Found ${detail.expenses.length} expenses inside project detail`);
        const total = detail.expenses.reduce((sum: number, e: any) => sum + (e.subtotal || e.total || 0), 0);
        console.log(`Sum of internal expenses: ${total}€`);
        
        detail.expenses.slice(0, 5).forEach((e: any) => {
            console.log(`- ${e.doc_number || e.contactName}: ${e.subtotal || e.total}€ (${new Date(e.date * 1000).toISOString()})`);
        });

        // Filter for March 2026
        const march26 = detail.expenses.filter((e: any) => {
            const d = new Date(e.date * 1000);
            return d.getFullYear() === 2026 && d.getMonth() === 2;
        });
        console.log(`Found ${march26.length} expenses in March 2026 for ETHEREAL via project detail`);
    } else {
        console.log('No "expenses" array in detail.');
    }
}

check();
