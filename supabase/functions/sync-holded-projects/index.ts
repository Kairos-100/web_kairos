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

            // Fetch projects from Holded with pagination
            let projects: any[] = [];
            let projectPage = 0;
            let hasMoreProjects = true;

            while (hasMoreProjects) {
                console.log(`Fetching project page ${projectPage}...`);
                const response = await fetch(`${baseUri}/projects?page=${projectPage}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'key': apiKey,
                    }
                });

                if (!response.ok) {
                    console.error(`Error fetching projects (page ${projectPage}):`, await response.text());
                    if (projectPage === 0) {
                        results.push({ 
                            key_id: keyRow.id, 
                            status: 'error', 
                            http_status: response.status, 
                            body: 'Failed to fetch first page of projects' 
                        });
                        hasMoreProjects = false;
                    }
                    break;
                }

                const pageData = await response.json();
                if (!Array.isArray(pageData) || pageData.length === 0) {
                    hasMoreProjects = false;
                    break;
                }

                projects = [...projects, ...pageData];
                
                // If we get fewer than 100 (standard limit), it's the last page
                if (pageData.length < 100) {
                    hasMoreProjects = false;
                } else {
                    projectPage++;
                }
            }

            if (projects.length === 0) {
                results.push({ key_id: keyRow.id, status: 'ok', count: 0, reason: 'No projects found' });
                continue;
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

                // --- NEW: Project-Centric Deep Sync ---
                // For each project, we fetch its full details to get the official sales/expenses list
                try {
                    console.log(`Deep syncing project: ${p.name} (${holdedId})`);
                    const projectDetailResponse = await fetch(`${baseUri}/projects/${holdedId}`, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json', 'key': apiKey }
                    });
                    
                    if (projectDetailResponse.ok) {
                        const projectDetail = await projectDetailResponse.json();
                        
                        // Process linked sales
                        if (projectDetail.sales && Array.isArray(projectDetail.sales)) {
                            const salesRows = projectDetail.sales.map((s: any) => ({
                                source_key_id: keyRow.id,
                                holded_id: String(s.id),
                                doc_number: s.docNumber || s.customId || s.id,
                                type: 'invoice', // We treat these as invoices for aggregation
                                contact_name: s.contactName || '',
                                total: parseFloat(s.total || 0),
                                date: s.date,
                                project_id: String(holdedId),
                                updated_at: new Date().toISOString()
                            }));
                            if (salesRows.length > 0) {
                                await supabase.from('holded_invoices').upsert(salesRows, { onConflict: 'source_key_id, holded_id' });
                            }
                        }
                        
                        // Process linked expenses
                        if (projectDetail.expenses && Array.isArray(projectDetail.expenses)) {
                            const expenseRows = projectDetail.expenses.map((e: any) => ({
                                source_key_id: keyRow.id,
                                holded_id: String(e.id),
                                doc_number: e.name || e.id,
                                type: 'purchase',
                                contact_name: e.contactName || '',
                                total: parseFloat(e.total || 0),
                                date: e.date,
                                project_id: String(holdedId),
                                updated_at: new Date().toISOString()
                            }));
                            if (expenseRows.length > 0) {
                                await supabase.from('holded_invoices').upsert(expenseRows, { onConflict: 'source_key_id, holded_id' });
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error deep syncing project ${holdedId}:`, err);
                }
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

                // --- GLOBAL SYNC (Backup for non-project items) ---
                console.log(`Global document sync for Key ID: ${keyRow.id}`);
                const syncRes = {
                    invoices: await syncDocuments(apiKey, 'invoice', keyRow.id, supabase),
                    proforms: await syncDocuments(apiKey, 'proform', keyRow.id, supabase),
                    purchases: await syncDocuments(apiKey, 'purchase', keyRow.id, supabase),
                    purchaserefunds: await syncDocuments(apiKey, 'purchaserefund', keyRow.id, supabase),
                    creditnotes: await syncDocuments(apiKey, 'creditnote', keyRow.id, supabase),
                    salesreceipts: await syncDocuments(apiKey, 'salesreceipt', keyRow.id, supabase),
                    expenses: await syncExpenses(apiKey, keyRow.id, supabase),
                    treasury: await syncTreasuryMovements(apiKey, keyRow.id, supabase)
                };
                
                results[results.length - 1].documents = syncRes;
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
        // dateFrom=0 ensures we get all historical documents
        const response = await fetch(`https://api.holded.com/api/invoicing/v1/documents/${docType}?page=${page}&dateFrom=0`, {
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

        const rows = docs.map(d => {
            // project_id can be a string or an object {id: string, name: string}
            let projectId = null;
            if (typeof d.project === 'string') {
                projectId = d.project;
            } else if (d.project && typeof d.project === 'object' && d.project.id) {
                projectId = d.project.id;
            }

            return {
                source_key_id: sourceKeyId,
                holded_id: String(d.id),
                doc_number: d.docNumber || d.customId,
                type: docType,
                contact_name: d.contactName,
                contact_id: d.contact,
                notes: d.notes,
                date: d.date,
                due_date: d.due_date || d.dueDate,
                total: parseFloat(d.total || 0),
                subtotal: parseFloat(d.subtotal || 0),
                tax: parseFloat(d.tax || 0),
                status: String(d.status || ''),
                project_id: projectId ? String(projectId) : null,
                raw_data: d,
                updated_at: new Date().toISOString()
            };
        });

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

async function syncExpenses(apiKey: string, sourceKeyId: any, supabase: any) {
    let allProcessed = 0;
    let page = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching expenses page ${page}...`);
        const response = await fetch(`https://api.holded.com/api/expenses/v1/expenses?page=${page}&dateFrom=0`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'key': apiKey,
            }
        });

        if (!response.ok) {
            console.error(`Error fetching expenses (page ${page}):`, await response.text());
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

        const rows = docs.map(d => {
            // project can be a string, an object {id, name}, or an array of those
            let projectId = null;
            if (typeof d.project === 'string') {
                projectId = d.project;
            } else if (d.project && typeof d.project === 'object') {
                projectId = d.project.id || d.project[0]?.id || null;
            }

            return {
                source_key_id: sourceKeyId,
                holded_id: String(d.id),
                doc_number: d.name || d.id,
                type: 'expense',
                contact_name: d.contactName || 'Gasto General',
                contact_id: d.contact || '',
                notes: d.desc || d.description || '',
                date: d.date,
                due_date: d.date,
                total: parseFloat(d.amount || d.total || 0),
                subtotal: parseFloat(d.subtotal || d.amount || 0),
                tax: (parseFloat(d.amount || 0)) - (parseFloat(d.subtotal || d.amount || 0)),
                status: 'paid',
                project_id: projectId ? String(projectId) : null,
                raw_data: d,
                updated_at: new Date().toISOString()
            };
        });

        const { error } = await supabase
            .from('holded_invoices')
            .upsert(rows, { onConflict: 'source_key_id, holded_id' });
        
        if (error) {
            console.error(`Error upserting expenses (page ${page}):`, error);
            return { status: 'error', message: error.message, processed: allProcessed };
        }

        allProcessed += rows.length;
        
        if (docs.length < limit) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return { status: 'ok', count: allProcessed };
}

async function syncTreasuryMovements(apiKey: string, sourceKeyId: any, supabase: any) {
    let allProcessed = 0;
    
    // 1. Get List of Treasury accounts first
    const accountsResponse = await fetch(`https://api.holded.com/api/invoicing/v1/treasury`, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'key': apiKey }
    });

    if (!accountsResponse.ok) {
        console.error(`Error fetching treasury accounts:`, await accountsResponse.text());
        return { status: 'error', code: accountsResponse.status };
    }

    const accounts = await accountsResponse.json();
    if (!Array.isArray(accounts)) return { status: 'ok', count: 0 };

    for (const acc of accounts) {
        const accId = acc.id;
        // In Holded, movements are fetched PER account
        // Limit to 100 per page, dateFrom=0 for history
        let hasMore = true;
        let page = 0;

        while (hasMore) {
            const mvResponse = await fetch(`https://api.holded.com/api/invoicing/v1/treasury/${accId}/movements?page=${page}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'key': apiKey }
            });

            if (!mvResponse.ok) break;
            const movements = await mvResponse.json();
            
            if (!Array.isArray(movements) || movements.length === 0) {
                hasMore = false;
                break;
            }

            const rows = movements
                .filter(m => !m.documentId) // ONLY sync movements NOT linked to invoices to avoid double counting
                .map(m => ({
                    source_key_id: sourceKeyId,
                    holded_id: `treasury_${m.id}`, // Prefix to avoid collisions
                    doc_number: `TR-${m.id}`,
                    type: 'treasury',
                    contact_name: m.contactName || 'Movimiento Bancario',
                    contact_id: m.contactId || '',
                    notes: m.concept || m.notes || '',
                    date: m.date,
                    due_date: m.date,
                    total: parseFloat(m.amount || 0), // positive for income, negative for expense
                    subtotal: parseFloat(m.amount || 0),
                    tax: 0,
                    status: 'paid',
                    project_id: m.projectId || null,
                    raw_data: m,
                    updated_at: new Date().toISOString()
                }));

            if (rows.length > 0) {
                await supabase.from('holded_invoices').upsert(rows, { onConflict: 'source_key_id, holded_id' });
            }

            allProcessed += rows.length;
            if (movements.length < 100) hasMore = false;
            else page++;
        }
    }

    return { status: 'ok', count: allProcessed };
}
