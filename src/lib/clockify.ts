import { supabase } from './supabase';

const CLOCKIFY_API_KEY = import.meta.env.VITE_CLOCKIFY_API_KEY || '';
const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';
const CLOCKIFY_REPORTS_URL = 'https://reports.api.clockify.me/v1';

export interface ClockifyUserTime {
    userName: string;
    email: string;
    totalTime: number; // in seconds
    projects: {
        projectName: string;
        time: number; // in seconds
        color: string;
    }[];
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
        const workspaces = await response.json();
        return workspaces.length > 0 ? workspaces[0].id : null;
    } catch (err) {
        console.error('Clockify Error (getWorkspaceId):', err);
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
        const response = await fetch(`${CLOCKIFY_REPORTS_URL}/workspaces/${workspaceId}/reports/summary`, {
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

        if (!response.ok) throw new Error('Failed to fetch summary report');
        const data = await response.json();

        const userMap: Record<string, ClockifyUserTime> = {};
        const projectMap: Record<string, ClockifyProjectSummary> = {};
        let grandTotal = 0;

        // Clockify Summary API response structure processing
        if (data.groupOne) {
            data.groupOne.forEach((userGroup: any) => {
                const userEmail = userGroup.name; // This depends on Clockify settings, but usually it's name or email
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
                        userMap[userEmail].projects.push({
                            projectName: projName,
                            time: projGroup.duration,
                            color: projGroup.color || '#ccc'
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
    if (!import.meta.env.VITE_SUPABASE_URL) return;

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
