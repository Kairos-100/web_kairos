import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateBookPDF(groupedEssays: Record<string, any[]>) {
    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);

    // Cover Page
    const coverPage = mergedPdf.addPage([600, 800]);
    coverPage.drawRectangle({
        x: 0,
        y: 0,
        width: 600,
        height: 800,
        color: rgb(0.05, 0.1, 0.2), // Kairos Navy
    });

    coverPage.drawText('EL LIBRO DEL CONOCIMIENTO', {
        x: 50,
        y: 450,
        size: 35,
        font: font,
        color: rgb(1, 1, 1),
    });

    coverPage.drawText('Kairos Knowledge Compilation', {
        x: 50,
        y: 410,
        size: 15,
        font: regularFont,
        color: rgb(0.6, 0.8, 1),
    });

    coverPage.drawText(`Fecha de Edición: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: 100,
        size: 10,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Sections and Chapters
    for (const category of Object.keys(groupedEssays)) {
        // Category Separator Page
        const sepPage = mergedPdf.addPage([600, 800]);
        sepPage.drawRectangle({
            x: 0,
            y: 380,
            width: 600,
            height: 40,
            color: rgb(0.95, 0.95, 0.95),
        });

        sepPage.drawText(category.toUpperCase(), {
            x: 50,
            y: 392,
            size: 20,
            font: font,
            color: rgb(0.1, 0.4, 0.8),
        });

        const essays = groupedEssays[category];
        for (const essay of essays) {
            if (!essay.pdf_url && !essay.pdfUrl) continue;

            try {
                const url = essay.pdf_url || essay.pdfUrl;
                const pdfBytes = await fetch(url).then((res) => res.arrayBuffer());
                const srcPdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (error) {
                console.error(`Error embedding PDF for ${essay.title}:`, error);

                // Fallback page if PDF fails to load
                const errorPage = mergedPdf.addPage([600, 800]);
                errorPage.drawText(`Error al cargar el contenido de: ${essay.title}`, {
                    x: 50,
                    y: 400,
                    size: 12,
                    font: regularFont,
                    color: rgb(0.8, 0.2, 0.2),
                });
            }
        }
    }

    const pdfBytes = await mergedPdf.save();
    return pdfBytes;
}
