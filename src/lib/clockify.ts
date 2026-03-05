import { supabase } from './supabase.js';

const getEnv = (name: string) => {
    if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
    try {
        // @ts-ignore
        if (import.meta && import.meta.env && import.meta.env[name]) return import.meta.env[name];
    } catch (e) { }
    return '';
};

const CLOCKIFY_API_KEY = getEnv('VITE_CLOCKIFY_API_KEY');
const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';
const CLOCKIFY_REPORTS_URL = 'https://reports.api.clockify.me/v1';

export interface ClockifyDetailedEntry {
    description: string;
    time: number; // in seconds
    date: string;
    tags?: string[];
}

export interface ClockifyUserTime {
    userName: string;
    email: string;
    totalTime: number; // in seconds
    projects: {
        projectName: string;
        projectId: string;
        time: number; // in seconds
        color: string;
        detailedEntries?: ClockifyDetailedEntry[];
    }[];
}

export interface ClockifyProject {
    projectName: string;
    projectId: string;
    time: number;
    color: string;
    detailedEntries?: ClockifyDetailedEntry[];
}

export interface ClockifyProjectSummary {
    projectName: string;
    totalTime: number; // in seconds
    color: string;
}

/**
 * Fetches the first workspace ID for the authenticated user.
 */
export async function getWorkspaceId(): Promise<string | null> {
    if (!CLOCKIFY_API_KEY) return null;

    try {
        const response = await fetch(`${CLOCKIFY_API_URL}/workspaces`, {
            headers: {
                'X-Api-Key': CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch workspaces');
        const workspaces = await response.json() as any[];
        return workspaces.length > 0 ? workspaces[0].id : null;
    } catch (err) {
        console.error('Clockify Error (getWorkspaceId):', err);
        return null;
    }
}

/**
 * Fetches all projects for a given workspace.
 */
export async function getProjects(workspaceId: string): Promise<{ id: string; name: string; color: string }[] | null> {
    if (!CLOCKIFY_API_KEY) return null;

    try {
        const response = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/projects`, {
            headers: {
                'X-Api-Key': CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch projects');
        const projects = await response.json() as any[];
        return projects.map(p => ({ id: p.id, name: p.name, color: p.color }));
    } catch (err) {
        console.error('Clockify Error (getProjects):', err);
        return null;
    }
}

/**
 * Creates a new time entry for the authenticated user.
 */
export async function createTimeEntry(
    workspaceId: string,
    projectId: string,
    start: Date,
    end: Date,
    description: string,
    billable: boolean = false
): Promise<any | null> {
    if (!CLOCKIFY_API_KEY) return null;

    try {
        const response = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/time-entries`, {
            method: 'POST',
            headers: {
                'X-Api-Key': CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: start.toISOString(),
                end: end.toISOString(),
                projectId: projectId,
                description: description,
                billable: billable
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Failed to create time entry: ${response.status} - ${JSON.stringify(errorBody)}`);
        }

        const newTimeEntry = await response.json();
        console.log('Time entry created:', newTimeEntry);
        return newTimeEntry;
    } catch (err) {
        console.error('Clockify Error (createTimeEntry):', err);
        return null;
    }
}

/**
 * Fetches a summary report for the given workspace and date range.
 * Groups by USER and then by PROJECT.
 */
export async function getWeeklyTimeSummary(workspaceId: string, start: Date, end: Date): Promise<{
    users: ClockifyUserTime[];
    projects: ClockifyProjectSummary[];
    totalTime: number;
} | null> {
    if (!CLOCKIFY_API_KEY) return null;

    try {
        // 1. Get Summary Data (Users and Projects)
        const summaryResponse = await fetch(`${CLOCKIFY_REPORTS_URL}/workspaces/${workspaceId}/reports/summary`, {
            method: 'POST',
            headers: {
                'X-Api-Key': CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRangeStart: start.toISOString(),
                dateRangeEnd: end.toISOString(),
                summaryFilter: {
                    groups: ['USER', 'PROJECT']
                }
            })
        });

        if (!summaryResponse.ok) throw new Error('Failed to fetch summary report');
        const summaryData = await summaryResponse.json() as any;

        // 2. Get Detailed Data (Individual Entries)
        const detailedResponse = await fetch(`${CLOCKIFY_REPORTS_URL}/workspaces/${workspaceId}/reports/detailed`, {
            method: 'POST',
            headers: {
                'X-Api-Key': CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRangeStart: start.toISOString(),
                dateRangeEnd: end.toISOString(),
                detailedFilter: {
                    page: 1,
                    pageSize: 1000 // Adjust if needed
                }
            })
        });

        let detailedData: any = { timeentries: [] };
        if (detailedResponse.ok) {
            detailedData = await detailedResponse.json();
        }

        const userMap: Record<string, ClockifyUserTime> = {};
        const projectMap: Record<string, ClockifyProjectSummary> = {};
        let grandTotal = 0;

        // Process Summary Data
        if (summaryData.groupOne) {
            summaryData.groupOne.forEach((userGroup: any) => {
                const userEmail = userGroup.name;
                const userName = userGroup.name;

                if (!userMap[userEmail]) {
                    userMap[userEmail] = {
                        userName,
                        email: userEmail,
                        totalTime: userGroup.duration,
                        projects: []
                    };
                }

                if (userGroup.children) {
                    userGroup.children.forEach((projGroup: any) => {
                        const projName = projGroup.name || 'Sin Proyecto';

                        // Find detailed entries for this user and project
                        const projectEntries = detailedData.timeentries
                            .filter((entry: any) =>
                                (entry.userName === userName || entry.userEmail === userEmail) &&
                                (entry.projectName === projName)
                            )
                            .map((entry: any) => {
                                let duration = 0;
                                if (entry.timeInterval?.duration && typeof entry.timeInterval.duration === 'string') {
                                    const match = entry.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                                    if (match) {
                                        const h = parseInt(match[1] || '0', 10);
                                        const m = parseInt(match[2] || '0', 10);
                                        const s = parseInt(match[3] || '0', 10);
                                        duration = (h * 3600) + (m * 60) + s;
                                    }
                                }
                                return {
                                    description: entry.description || '(Sin descripción)',
                                    time: duration,
                                    date: entry.timeInterval?.start || '',
                                    tags: entry.tags ? entry.tags.map((t: any) => t.name) : []
                                };
                            });

                        userMap[userEmail].projects.push({
                            projectName: projName,
                            projectId: projGroup.id || '',
                            time: projGroup.duration,
                            color: projGroup.color || '#ccc',
                            detailedEntries: projectEntries
                        });

                        if (!projectMap[projName]) {
                            projectMap[projName] = {
                                projectName: projName,
                                totalTime: 0,
                                color: projGroup.color || '#ccc'
                            };
                        }
                        projectMap[projName].totalTime += projGroup.duration;
                        grandTotal += projGroup.duration;
                    });
                }
            });
        }

        return {
            users: Object.values(userMap),
            projects: Object.values(projectMap).sort((a, b) => b.totalTime - a.totalTime),
            totalTime: grandTotal
        };
    } catch (err) {
        console.error('Clockify Error (getWeeklyTimeSummary):', err);
        return null;
    }
}

/**
 * Persists weekly time data to Supabase for historical analysis and AI training.
 */
export async function syncWeeklyStatsToSupabase(
    start: Date,
    end: Date,
    users: ClockifyUserTime[]
) {
    if (!getEnv('VITE_SUPABASE_URL')) return;

    try {
        const rows = users.flatMap(user =>
            user.projects.map(proj => ({
                week_start: start.toISOString().split('T')[0],
                week_end: end.toISOString().split('T')[0],
                user_email: user.email,
                project_name: proj.projectName,
                duration_seconds: proj.time,
                project_color: proj.color
            }))
        );

        if (rows.length === 0) return;

        const { error } = await supabase
            .from('clockify_stats')
            .upsert(rows, { onConflict: 'week_start, week_end, user_email, project_name' });

        if (error) throw error;
        console.log(`Clockify data synced to Supabase for ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    } catch (err) {
        console.error('Error syncing Clockify data to Supabase:', err);
    }
}
