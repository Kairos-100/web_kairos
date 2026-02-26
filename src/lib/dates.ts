/**
 * Robust date parsing to handle both DD/MM/YYYY and YYYY-MM-DD formats
 */
export const parseDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();

    // Handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...)
    if (dateStr.includes('-')) {
        const d = new Date(dateStr);
        // If the string is just YYYY-MM-DD, the Date constructor might treat it as UTC
        // which can shift the day back depending on timezone. 
        // Let's force local interpretation for consistency with metrics.
        if (!dateStr.includes('T')) {
            const [y, m, d_part] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d_part);
        }
        return d;
    }

    // Handle European format (DD/MM/YYYY)
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d);
    }

    return new Date(dateStr);
};

/**
 * Formats a date to ISO string (YYYY-MM-DD) for database storage
 */
export const formatToDB = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseDate(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a date for display (DD/MM/YYYY)
 */
export const formatForDisplay = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseDate(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
};
