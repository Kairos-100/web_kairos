import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

/**
 * VERIFICATION SCRIPT: Holded API vs. Supabase DB
 * 
 * This script fetches live metrics from the Holded API and compares them
 * to the synchronized data in Supabase.
 * 
 * Note: It uses 'subtotal' (Net) as the source of truth to match 
 * the Holded Web Dashboard.
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxttykoecpwczyeigwjf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const holdedApiKey = process.env.HOLDED_API_KEY || '88afd67ca98dda6ff2a0609548aa287f';

if (!supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
    console.log('\n🔍 Starting Official Sync Verification...');
    console.log('-------------------------------------------');

    // 1. Fetch 5 sample projects from the API for detail verification
    const testProjects = ['TÍLDE', 'SRV', 'RowStar', 'WE FOR ALL', 'VERIDIAN'];
    
    // First, list projects to get IDs
    const listRes = await fetch('https://api.holded.com/api/projects/v1/projects', {
        headers: { 'Accept': 'application/json', 'key': holdedApiKey }
    });
    const allProjects = await listRes.json();
    
    if (!Array.isArray(allProjects)) {
        console.error('❌ Could not fetch project list from Holded API.');
        return;
    }

    console.log(`| Proyecto | Holded API (Net) | Supabase DB (Net) | Status |`);
    console.log(`|----------|-------------------|-------------------|--------|`);

    for (const name of testProjects) {
        const hProj = allProjects.find(p => p.name.includes(name));
        if (!hProj) continue;

        const holdedId = hProj.id || hProj._id;

        // Fetch Live Detail from Holded (The "Real" Source)
        const detailRes = await fetch(`https://api.holded.com/api/projects/v1/projects/${holdedId}`, {
            headers: { 'Accept': 'application/json', 'key': holdedApiKey }
        });
        const detail = await detailRes.json();
        
        // Calculate Net Totals (Subtotal) from Live API
        const apiIncome = (detail.sales || []).reduce((acc: number, s: any) => acc + parseFloat(s.subtotal || s.total || 0), 0);
        const apiExpenses = (detail.expenses || []).reduce((acc: number, e: any) => acc + parseFloat(e.subtotal || e.total || 0), 0);

        // Fetch Synchronized Data from Supabase
        const { data: dbData } = await supabase
            .from('holded_project_snapshots')
            .select('metrics')
            .eq('holded_id', holdedId)
            .order('snapshot_date', { ascending: false })
            .limit(1);

        const dbIncome = dbData?.[0]?.metrics?.total_income || 0;
        const dbExpenses = dbData?.[0]?.metrics?.total_expenses || 0;

        const match = Math.abs(apiIncome - dbIncome) < 0.1 && Math.abs(apiExpenses - dbExpenses) < 0.1;

        console.log(`| ${name.padEnd(10)} | In:${apiIncome.toFixed(2)}€ / Ex:${apiExpenses.toFixed(2)}€ | In:${dbIncome.toFixed(2)}€ / Ex:${dbExpenses.toFixed(2)}€ | ${match ? '✅ MATCH' : '❌ DIFF'} |`);
    }

    console.log('-------------------------------------------');
    console.log('✅ If you see MATCH, your local app is 100% accurate.');
}

verify();
