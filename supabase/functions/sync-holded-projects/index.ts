import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    try {
        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        // We use the service role key to bypass RLS for backend data syncing operations
        const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey || supabaseAnonKey!)

        const { searchParams } = new URL(req.url)
        const useAll = searchParams.get('all') === 'true'
        const selectedKey = searchParams.get('key')
        const selectedKeyId = searchParams.get('key_id')

        // Fetch keys from holded_api_keys
        let query = supabase.from('holded_api_keys').select('*')

        if (!useAll) {
            if (selectedKeyId) {
                query = query.eq('id', selectedKeyId)
            } else if (selectedKey) {
                query = query.eq('name', selectedKey)
            } else {
                query = query.eq('active', true)
            }
        }

        const { data: keys, error: keysError } = await query

        if (keysError || !keys || keys.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'No active keys or requested key not found' 
            }), { 
                status: 422,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        let totalRows = 0
        const results: any[] = []

        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        for (const keyRow of keys) {
            const apiKey = keyRow.api_key;
            const baseUri = (keyRow.base || 'https://api.holded.com/api/projects/v1').replace(/\/$/, '')

            if (!apiKey) {
                results.push({ key_id: keyRow.id, status: 'skipped', reason: 'Empty API Key' })
                continue
            }

            console.log(`Starting sync for Holded Key ID: ${keyRow.id}`);

            // Fetch projects from Holded
            const response = await fetch(`${baseUri}/projects`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'key': apiKey,
                }
            });

            if (!response.ok) {
                results.push({ 
                    key_id: keyRow.id, 
                    status: 'error', 
                    http_status: response.status, 
                    body: await response.text() 
                })
                continue
            }

            const projects = await response.json()

            if (!Array.isArray(projects)) {
                results.push({ key_id: keyRow.id, status: 'error', reason: 'Response is not an array' })
                continue
            }

            const rowsToInsert = [];
            
            for (const p of projects) {
                const holdedId = p.id || p._id;
                if (!holdedId) continue;

                rowsToInsert.push({
                    holded_id: String(holdedId),
                    source_key_id: keyRow.id,
                    name: p.name ? String(p.name) : null,
                    status: p.status ? String(p.status) : null,
                    raw: p, // JSON
                    updated_at: new Date().toISOString(),
                })
            }

            if (rowsToInsert.length > 0) {
                // Upsert Projects
                const { error: upsertError } = await supabase
                    .from('holded_projects')
                    .upsert(rowsToInsert, { 
                        onConflict: 'holded_id',
                        ignoreDuplicates: false 
                    })

                if (upsertError) {
                   console.error("Error upserting projects:", upsertError);
                }

                // Prepare and Insert/Update daily snapshots
                for (const p of projects) {
                    const holdedId = p.id || p._id;
                    if (!holdedId) continue;

                    const metrics = calculateProjectMetrics(p);

                    // Supabase upsert logic matching updateOrInsert
                    const { error: snapshotError } = await supabase
                        .from('holded_project_snapshots')
                        .upsert({
                            source_key_id: keyRow.id,
                            holded_id: String(holdedId),
                            snapshot_date: today,
                            name: p.name ? String(p.name) : null,
                            status: p.status ? String(p.status) : null,
                            metrics: metrics,
                            raw: p,
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'source_key_id, holded_id, snapshot_date'
                        })
                    
                    if (snapshotError) {
                        console.error("Error upserting snapshot:", snapshotError);
                    }
                }

                results.push({
                    key_id: keyRow.id,
                    status: 'ok',
                    count: rowsToInsert.length
                })
                totalRows += rowsToInsert.length;

                // --- NEW: Sync Invoices, Purchases, Credit Notes, and Sales Receipts ---
                console.log(`Syncing documents for Key ID: ${keyRow.id}`);
                const invoicesSync = await syncDocuments(apiKey, 'invoice', keyRow.id, supabase);
                const purchasesSync = await syncDocuments(apiKey, 'purchase', keyRow.id, supabase);
                const creditNotesSync = await syncDocuments(apiKey, 'creditnote', keyRow.id, supabase);
                const salesReceiptsSync = await syncDocuments(apiKey, 'salesreceipt', keyRow.id, supabase);
                
                results[results.length - 1].documents = {
                    invoices: invoicesSync,
                    purchases: purchasesSync,
                    creditnotes: creditNotesSync,
                    salesreceipts: salesReceiptsSync
                };
            } else {
                 results.push({
                    key_id: keyRow.id,
                    status: 'ok',
                    count: 0
                })
            }
        }

        return new Response(JSON.stringify({ 
            message: 'Sincronización completada',
            total: totalRows,
            results: results
        }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error("General Sync Error:", error)
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

// Helper function equivalent to PHP calculateProjectMetrics
function calculateProjectMetrics(project: any) {
    let totalIncome = 0;
    let lastMovementDate = 0;
    let incomeDocumentCount = 0;
    
    if (project.sales && Array.isArray(project.sales)) {
        for (const sale of project.sales) {
            totalIncome += parseFloat(sale.total || 0);
            incomeDocumentCount++;
            
            const saleDate = parseInt(sale.date || 0);
            if (saleDate > lastMovementDate) {
                lastMovementDate = saleDate;
            }
        }
    }
    
    let totalExpenses = 0;
    let expenseDocumentCount = 0;
    
    if (project.expenses && Array.isArray(project.expenses)) {
        for (const expense of project.expenses) {
            totalExpenses += parseFloat(expense.total || 0);
            expenseDocumentCount++;
            
            const expenseDate = parseInt(expense.date || 0);
            if (expenseDate > lastMovementDate) {
                lastMovementDate = expenseDate;
            }
        }
    }
    
    let lastMovementFormatted = null;
    if (lastMovementDate > 0) {
        // Holded dates are likely unix timestamps (seconds). Convert to ms for JS Date.
        const dateObj = new Date(lastMovementDate * 1000); 
        // Simple YYYY-MM-DD HH:mm:ss format for consistency
        lastMovementFormatted = dateObj.toISOString().replace('T', ' ').substring(0, 19);
    }
    
    return {
        total_income: Number(totalIncome.toFixed(2)),
        total_expenses: Number(totalExpenses.toFixed(2)),
        income_document_count: incomeDocumentCount,
        expense_document_count: expenseDocumentCount,
        last_movement_date: lastMovementFormatted
    };
}

async function syncDocuments(apiKey: string, docType: string, sourceKeyId: any, supabase: any) {
    let allProcessed = 0;
    let page = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching ${docType} page ${page}...`);
        const response = await fetch(`https://api.holded.com/api/invoicing/v1/documents/${docType}?page=${page}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'key': apiKey,
            }
        });

        if (!response.ok) {
            console.error(`Error fetching ${docType} (page ${page}):`, await response.text());
            return { status: 'error', code: response.status, processed: allProcessed };
        }

        const docs = await response.json();
        if (!Array.isArray(docs)) {
            hasMore = false;
            break;
        }

        if (docs.length === 0) {
            hasMore = false;
            break;
        }

        const rows = docs.map(d => ({
            source_key_id: sourceKeyId,
            holded_id: String(d.id),
            doc_number: d.docNumber || d.customId,
            type: docType,
            contact_name: d.contactName,
            contact_id: d.contact,
            notes: d.notes,
            date: d.date,
            due_date: d.dueDate,
            total: d.total,
            subtotal: d.subtotal,
            tax: d.tax,
            status: String(d.status),
            project_id: d.project,
            raw_data: d,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('holded_invoices')
            .upsert(rows, { onConflict: 'source_key_id, holded_id' });
        
        if (error) {
            console.error(`Error upserting ${docType} (page ${page}):`, error);
            return { status: 'error', message: error.message, processed: allProcessed };
        }

        allProcessed += rows.length;
        
        // If we got fewer than the limit, it's the last page
        if (docs.length < limit) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return { status: 'ok', count: allProcessed };
}
