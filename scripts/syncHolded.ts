import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey!);

async function main() {
    try {
        console.log('--- Starting Local Holded Sync ---');
        
        // Fetch keys from holded_api_keys
        const { data: keys, error: keysError } = await supabase.from('holded_api_keys').select('*').eq('active', true);

        if (keysError || !keys || keys.length === 0) {
            console.error('Error: No active keys found in holded_api_keys');
            return;
        }

        let totalRows = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const keyRow of keys) {
            const apiKey = keyRow.api_key;
            const baseUri = (keyRow.base || 'https://api.holded.com/api/projects/v1').replace(/\/$/, '');

            if (!apiKey) {
                console.warn(`Skipping key ${keyRow.id}: Empty API Key`);
                continue;
            }

            console.log(`Syncing Key ID: ${keyRow.id} (${keyRow.name})`);

            // 1. Fetch Projects
            let projects: any[] = [];
            let projectPage = 0;
            let hasMoreProjects = true;

            while (hasMoreProjects) {
                const { data: pageData, ok: fetchOk, error: fetchError } = await safeFetchJSON(`${baseUri}/projects?page=${projectPage}`, apiKey);
                if (!fetchOk) {
                    console.error(`Error fetching projects: ${fetchError}`);
                    break;
                }
                if (!Array.isArray(pageData) || pageData.length === 0) break;
                projects = [...projects, ...pageData];
                if (pageData.length < 100) hasMoreProjects = false;
                else projectPage++;
            }

            if (projects.length === 0) continue;

            // 2. Deep Sync Projects (Sales & Expenses)
            for (const p of projects) {
                const holdedId = p.id || p._id;
                console.log(`Deep syncing project: ${p.name} (${holdedId})`);
                
                // Upsert project
                const { error: pErr } = await supabase.from('holded_projects').upsert({
                    holded_id: String(holdedId),
                    source_key_id: keyRow.id,
                    name: p.name || null,
                    status: p.status || null,
                    raw: p,
                    updated_at: safeToISOString(new Date())
                }, { onConflict: 'holded_id' });
                if (pErr) console.error(`Error upserting project ${p.name}:`, pErr.message);

                // Upsert snapshot
                const metrics = calculateProjectMetrics(p);
                const { error: sErr } = await supabase.from('holded_project_snapshots').upsert({
                    source_key_id: keyRow.id,
                    holded_id: String(holdedId),
                    snapshot_date: today,
                    name: p.name || null,
                    status: p.status || null,
                    metrics,
                    raw: p,
                    updated_at: safeToISOString(new Date())
                }, { onConflict: 'source_key_id, holded_id, snapshot_date' });
                if (sErr) console.error(`Error upserting snapshot for ${p.name}:`, sErr.message);

                // Fetch Detail for Linked docs
                const { data: detail, ok: detailOk } = await safeFetchJSON(`${baseUri}/projects/${holdedId}`, apiKey);
                if (detailOk && detail) {
                    if (detail.sales) {
                        const sales = detail.sales.map((s: any) => ({
                            source_key_id: keyRow.id,
                            holded_id: String(s.id || s.docId),
                            doc_number: s.invoiceNum || s.docNumber || s.customId || s.id,
                            type: s.type || 'invoice', // Use original type (e.g. creditnote)
                            contact_name: s.contactName || '',
                            total: parseFloat(s.projectAssignedAmount || s.subtotal || s.total || 0),
                            subtotal: parseFloat(s.projectAssignedAmount || s.subtotal || 0),
                            date: s.date,
                            project_id: String(holdedId),
                            raw_data: s,
                            updated_at: safeToISOString(new Date())
                        }));
                        if (sales.length > 0) {
                            const unique = Array.from(new Map(sales.map((s: any) => [s.holded_id, s])).values());
                            await supabase.from('holded_invoices').upsert(unique, { onConflict: 'source_key_id, holded_id' });
                        }
                    }
                    if (detail.expenses) {
                        const expenses = detail.expenses.map((e: any) => ({
                            source_key_id: keyRow.id,
                            holded_id: String(e.id || e.docId),
                            doc_number: e.invoiceNum || e.name || e.id,
                            type: e.type || (e.type === 'purchase' ? 'purchase' : 'expense'), // Use original type (e.g. purchaserefund)
                            contact_name: e.contactName || '',
                            total: parseFloat(e.projectAssignedAmount || e.subtotal || e.total || 0),
                            subtotal: parseFloat(e.projectAssignedAmount || e.subtotal || 0),
                            date: e.date,
                            project_id: String(holdedId),
                            raw_data: e,
                            updated_at: safeToISOString(new Date())
                        }));
                        if (expenses.length > 0) {
                            const unique = Array.from(new Map(expenses.map((e: any) => [e.holded_id, e])).values());
                            await supabase.from('holded_invoices').upsert(unique, { onConflict: 'source_key_id, holded_id' });
                        }
                    }
                }
            }

            // 3. Global Document Sync
            const docTypes = ['invoice', 'purchase', 'purchaserefund', 'creditnote', 'salesreceipt', 'proform'];
            for (const type of docTypes) {
                await syncDocuments(apiKey, type, keyRow.id);
            }

            // 4. Expenses
            await syncExpenses(apiKey, keyRow.id);

            // 5. Treasury
            await syncTreasuryMovements(apiKey, keyRow.id, projects);

            totalRows += projects.length;
        }

        console.log(`--- Sync Completed Successfully (${totalRows} projects) ---`);
    } catch (err) {
        console.error('Fatal Sync Error:', err);
    }
}

// --- HELPERS (Replicated from Edge Function) ---

async function safeFetchJSON(url: string, apiKey: string) {
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json', 'key': apiKey }
        });
        const text = await response.text();
        if (!response.ok) return { error: `HTTP ${response.status}`, body: text.substring(0, 500), ok: false };
        try {
            return { data: JSON.parse(text), ok: true };
        } catch {
            return { error: 'Invalid JSON', body: text.substring(0, 500), ok: false };
        }
    } catch (err: any) {
        return { error: err.message, ok: false };
    }
}

function safeToISOString(date: Date): string {
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function calculateProjectMetrics(p: any) {
    let income = 0;
    let expenses = 0;
    
    // Process Sales
    if (p.sales) {
        p.sales.forEach((s: any) => {
            // Priority: projectAssignedAmount > subtotal > total
            const amount = parseFloat(s.projectAssignedAmount || s.subtotal || s.total || 0);
            
            if (s.type === 'creditnote') {
                income -= amount; // Subtract credit notes from income
            } else {
                income += amount;
            }
        });
    }

    // Process Expenses
    if (p.expenses) {
        p.expenses.forEach((e: any) => {
            // Priority: projectAssignedAmount > subtotal > total
            const amount = parseFloat(e.projectAssignedAmount || e.subtotal || e.total || 0);
            
            if (e.type === 'purchaserefund') {
                expenses -= amount; // Subtract refunds from expenses
            } else {
                expenses += amount;
            }
        });
    }

    const result = {
        total_income: income,
        total_expenses: expenses,
        income_document_count: p.sales?.length || 0,
        expense_document_count: p.expenses?.length || 0
    };

    return result;
}

async function syncDocuments(apiKey: string, type: string, keyId: any) {
    let page = 0;
    let hasMore = true;
    while (hasMore) {
        const { data: docs, ok } = await safeFetchJSON(`https://api.holded.com/api/invoicing/v1/documents/${type}?page=${page}&dateFrom=0`, apiKey);
        if (!ok || !Array.isArray(docs) || docs.length === 0) break;
        const rows = docs.map(d => ({
            source_key_id: keyId,
            holded_id: String(d.id),
            doc_number: d.docNumber || d.customId,
            type,
            contact_name: d.contactName,
            date: d.date,
            total: parseFloat(d.total || 0),
            subtotal: parseFloat(d.subtotal || d.total || 0),
            project_id: d.project ? (typeof d.project === 'string' ? d.project : d.project.id) : null,
            raw_data: d,
            updated_at: safeToISOString(new Date())
        }));
        await supabase.from('holded_invoices').upsert(rows, { onConflict: 'source_key_id, holded_id' });
        if (docs.length < 100) hasMore = false;
        else page++;
    }
}

async function syncExpenses(apiKey: string, keyId: any) {
    let page = 0;
    let hasMore = true;
    while (hasMore) {
        const { data: docs, ok, body: fetchBody, error: fetchError } = await safeFetchJSON(`https://api.holded.com/api/expenses/v1/expenses?page=${page}&dateFrom=0`, apiKey);
        if (!ok) {
            if (fetchBody?.includes('root-widget')) {
                console.log(`Note: Expenses endpoint returned a web widget (Next-Gen) instead of API data. Skipping.`);
            } else {
                console.error(`Failed to sync expenses: ${fetchError}`);
            }
            break;
        }
        if (!Array.isArray(docs) || docs.length === 0) break;
        const rows = docs.map(d => ({
            source_key_id: keyId,
            holded_id: String(d.id),
            doc_number: d.name || d.id,
            type: 'expense',
            contact_name: d.contactName || 'Gasto General',
            date: d.date,
            total: parseFloat(d.amount || d.total || 0),
            subtotal: parseFloat(d.subtotal || d.amount || d.total || 0),
            project_id: d.project ? (typeof d.project === 'string' ? d.project : (Array.isArray(d.project) ? d.project[0]?.id : d.project.id)) : null,
            raw_data: d,
            updated_at: safeToISOString(new Date())
        }));
        await supabase.from('holded_invoices').upsert(rows, { onConflict: 'source_key_id, holded_id' });
        if (docs.length < 100) hasMore = false;
        else page++;
    }
}

async function syncTreasuryMovements(apiKey: string, keyId: any, projects: any[]) {
    const { data: accounts, ok } = await safeFetchJSON(`https://api.holded.com/api/invoicing/v1/treasury`, apiKey);
    if (!ok || !Array.isArray(accounts)) return;
    for (const acc of accounts) {
        let page = 0;
        let hasMore = true;
        while (hasMore) {
            const { data: movs, ok: mOk, body: mBody, error: mError } = await safeFetchJSON(`https://api.holded.com/api/invoicing/v1/treasury/${acc.id}/movements?page=${page}`, apiKey);
            if (!mOk) {
                if (mBody?.includes('root-widget')) {
                    console.log(`Note: Treasury account ${acc.id} returned a web widget (Next-Gen) instead of API data. Skipping.`);
                } else {
                    console.error(`Error syncing treasury movements for account ${acc.id}: ${mError}`);
                }
                break;
            }
            if (!Array.isArray(movs) || movs.length === 0) break;
            const rows = movs.filter(m => !m.documentId).map(m => ({
                source_key_id: keyId,
                holded_id: `treasury_${m.id}`,
                doc_number: `TR-${m.id}`,
                type: 'treasury',
                contact_name: m.contactName || 'Movimiento Bancario',
                date: m.date,
                total: parseFloat(m.amount || 0),
                project_id: m.projectId || null,
                raw_data: m,
                updated_at: safeToISOString(new Date())
            }));
            if (rows.length > 0) await supabase.from('holded_invoices').upsert(rows, { onConflict: 'source_key_id, holded_id' });
            if (movs.length < 100) hasMore = false;
            else page++;
        }
    }
}

main();
