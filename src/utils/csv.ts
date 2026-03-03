/**
 * Simple CSV parser that handles basic CSV strings.
 * Supports comma and semicolon delimiters, and maps Spanish headers to database fields.
 */
export const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], data: [] };

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const rawHeaders = firstLine.split(delimiter).map(h => h.trim());
    const headersMapping: Record<string, string> = {
        'día/mes/año': 'date',
        'fecha': 'date',
        'emails': 'user_email',
        'email': 'user_email',
        'cvs': 'cv',
        'cv': 'cv',
        'sharing': 'sharing',
        'sales/revenue': 'revenue',
        'venta/revenue': 'revenue',
        'revenue': 'revenue',
        'beneficio/profit': 'profit',
        'profit': 'profit',
        'marcas temporales': 'timestamp' // To be ignored
    };

    const data = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const row: Record<string, any> = {};
        let totalCP = 0;

        rawHeaders.forEach((rawHeader, index) => {
            const lowerHeader = rawHeader.toLowerCase();
            const value = values[index] || '';

            // Map standard headers
            if (headersMapping[lowerHeader]) {
                row[headersMapping[lowerHeader]] = value;
            } else if (lowerHeader.includes('cp')) {
                // Special handling for multiple CP columns (sum them up)
                const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
                totalCP += num;
            } else {
                // Keep raw header for unmapped columns
                row[lowerHeader] = value;
            }
        });

        row['cp'] = totalCP.toString();
        return row;
    });

    // Ensure 'date' and 'user_email' are present in the final mapped headers list for validation
    // but the actual headers we return are the keys of the first row
    const finalHeaders = data.length > 0 ? Object.keys(data[0]) : [];

    return { headers: finalHeaders, data };
};

export const validateMetricCSV = (data: Record<string, string>[]) => {
    const requiredHeaders = ['user_email', 'date'];
    const errors: string[] = [];

    if (data.length === 0) {
        errors.push('El archivo CSV está vacío.');
        return errors;
    }

    const firstRowHeaders = Object.keys(data[0]);
    const missingHeaders = requiredHeaders.filter(h => !firstRowHeaders.includes(h));

    if (missingHeaders.length > 0) {
        errors.push(`Faltan datos esenciales (Email o Fecha). Asegúrate de tener las columnas 'Emails' y 'Día/Mes/Año'.`);
    }

    return errors;
};
