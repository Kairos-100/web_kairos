/**
 * Simple CSV parser that handles basic CSV strings.
 * It does not handle quoted values with newlines, but should be enough for standard Excel exports.
 */
export const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });

    return { headers, data };
};

export const validateMetricCSV = (data: Record<string, string>[]) => {
    const requiredHeaders = ['user_email', 'date', 'cv', 'cp', 'sharing', 'revenue', 'profit'];
    const errors: string[] = [];

    if (data.length === 0) {
        errors.push('El archivo CSV está vacío.');
        return errors;
    }

    const firstRowHeaders = Object.keys(data[0]);
    const missingHeaders = requiredHeaders.filter(h => !firstRowHeaders.includes(h));

    if (missingHeaders.length > 0) {
        errors.push(`Faltan las siguientes columnas: ${missingHeaders.join(', ')}`);
    }

    return errors;
};
