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

    // Aggressive normalization: remove everything except letters and numbers
    const normalizeHeader = (h: string) => h.toLowerCase()
        .replace(/[áäâà]/g, 'a')
        .replace(/[éëêè]/g, 'e')
        .replace(/[íïîì]/g, 'i')
        .replace(/[óöôò]/g, 'o')
        .replace(/[úüûù]/g, 'u')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const headersMapping: Record<string, string> = {
        'fecha': 'date',
        'diamesano': 'date',
        'emails': 'user_email',
        'email': 'user_email',
        'numerocv': 'cv',
        'cantcv': 'cv',
        'ncv': 'cv',
        'cvs': 'cv',
        'cv': 'cv',
        'numerodesharings': 'sharing',
        'numerosharing': 'sharing',
        'cantsharing': 'sharing',
        'nsharing': 'sharing',
        'sharings': 'sharing',
        'sharing': 'sharing',
        'sh': 'sharing',
        'numerodecp': 'cp',
        'cantcp': 'cp',
        'ncp': 'cp',
        'cps': 'cp',
        'cp': 'cp',
        'numerodebp': 'bp',
        'cantbp': 'bp',
        'nbp': 'bp',
        'learningpoints': 'bp',
        'bp': 'bp',
        'facturacion': 'revenue',
        'salesrevenue': 'revenue',
        'ventarevenue': 'revenue',
        'revenue': 'revenue',
        'beneficio': 'profit',
        'beneficioprofit': 'profit',
        'profit': 'profit',
        // Metadata mapping
        'titulocv': 'cv_title',
        'categoriacv': 'cv_category',
        'linkcv': 'cv_link',
        'tituloshering': 'sharing_title',
        'titulosharing': 'sharing_title',
        'tituloshari': 'sharing_title',
        'titulosh': 'sharing_title',
        'sharingtitle': 'sharing_title',
        'categoriasharing': 'sharing_category',
        'linksharing': 'sharing_link',
        'titulocp': 'cp_title',
        'categoriacp': 'cp_category',
        'linkcp': 'cp_link',
        'titulobp': 'bp_title',
        'bptitle': 'bp_title',
        'titulodebp': 'bp_title',
        'learningpointstitle': 'bp_title',
        'linkbp': 'bp_link',
        'bplink': 'bp_link',
        'marcatemporal': 'timestamp',
        'timestamp': 'timestamp'
    };

    const data = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const row: Record<string, any> = {};
        let totalCP = 0;
        let totalCV = 0;
        let totalSH = 0;
        let totalBP = 0;

        rawHeaders.forEach((rawHeader, index) => {
            const cleanHeader = normalizeHeader(rawHeader);
            const value = values[index] || '';

            if (headersMapping[cleanHeader]) {
                const mappedKey = headersMapping[cleanHeader];
                row[mappedKey] = value;
            } else if (cleanHeader.includes('cp') && !cleanHeader.includes('titul') && !cleanHeader.includes('link')) {
                totalCP += parseInt(value.replace(/[^0-9]/g, '')) || 0;
            } else if (cleanHeader.includes('cv') && !cleanHeader.includes('titul') && !cleanHeader.includes('link')) {
                totalCV += parseInt(value.replace(/[^0-9]/g, '')) || 0;
            } else if ((cleanHeader.includes('sharing') || cleanHeader.includes('sh')) && !cleanHeader.includes('titul') && !cleanHeader.includes('link')) {
                totalSH += parseInt(value.replace(/[^0-9]/g, '')) || 0;
            } else if (cleanHeader.includes('bp') && !cleanHeader.includes('titul') && !cleanHeader.includes('link')) {
                totalBP += parseInt(value.replace(/[^0-9]/g, '')) || 0;
            } else {
                row[cleanHeader] = value;
            }
        });

        // Set totals if they were accumulated from multiple columns
        row['cp'] = (parseInt(row['cp']) || totalCP).toString();
        row['cv'] = (parseInt(row['cv']) || totalCV).toString();
        row['sharing'] = (parseInt(row['sharing']) || totalSH).toString();
        row['bp'] = (parseInt(row['bp']) || totalBP).toString();

        // Map links to PDF URLs for evidence display
        if (row['cv_link']) row['cv_pdf_url'] = row['cv_link'];
        if (row['sharing_link']) row['sharing_pdf_url'] = row['sharing_link'];
        if (row['cp_link']) row['cp_pdf_url'] = row['cp_link'];
        if (row['bp_link']) row['bp_pdf_url'] = row['bp_link'];

        // Assemble descriptions from links and categories if present
        if (row['cv_link'] || row['cv_category']) {
            row['cv_description'] = `${row['cv_category'] || ''} ${row['cv_link'] || ''}`.trim();
        }
        if (row['cp_link'] || row['cp_category']) {
            row['cp_description'] = `${row['cp_category'] || ''} ${row['cp_link'] || ''}`.trim();
        }
        if (row['sharing_link'] || row['sharing_category']) {
            row['sharing_description'] = `${row['sharing_category'] || ''} ${row['sharing_link'] || ''}`.trim();
        }

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
