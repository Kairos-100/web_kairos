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

    // Handle slash format (DD/MM/YYYY or MM/DD/YYYY)
    if (dateStr.includes('/')) {
        const [p1, p2, y] = dateStr.split('/').map(Number);

        // If the first part is > 12, it's definitely DD/MM/YYYY
        if (p1 > 12) {
            return new Date(y, p2 - 1, p1);
        }

        // If the second part is > 12, it's definitely MM/DD/YYYY
        if (p2 > 12) {
            return new Date(y, p1 - 1, p2);
        }

        // If both are <= 12, it's ambiguous. 
        // Given the user's context of "dates from US", we'll favor MM/DD/YYYY here
        // But for safety, we'll try to guess based on existing system preferences if possible.
        // For now, let's assume US if it might be US, as requested.
        return new Date(y, p1 - 1, p2);
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
