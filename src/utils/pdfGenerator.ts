import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateBookPDF(groupedEssays: Record<string, any[]>) {
    const mergedPdf = await PDFDocument.create();
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);

    // --- 1. Portada ---
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
        font: boldFont,
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

    // --- 2. Preparar el Índice (Placeholder) ---
    // Reservamos páginas para el índice. 1 suele bastar para pocos ensayos, pero dejaremos 2 por seguridad.
    const tocPage1 = mergedPdf.addPage([600, 800]);
    const tocPage2 = mergedPdf.addPage([600, 800]);

    let currentPage = 4; // Empezamos contenido en la pág 4 (1:Portada, 2-3:Índice)
    const tocEntries: { title: string; page: number; isCategory: boolean }[] = [];

    // --- 3. Generar Contenido ---
    for (const category of Object.keys(groupedEssays)) {
        // Guardar entrada de categoría para el índice
        tocEntries.push({ title: category.toUpperCase(), page: currentPage, isCategory: true });

        // Página de Separador de Categoría
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
            font: boldFont,
            color: rgb(0.1, 0.4, 0.8),
        });

        currentPage++; // Pasamos a la siguiente página tras el separador

        const essays = groupedEssays[category];
        for (const essay of essays) {
            if (!essay.pdf_url && !essay.pdfUrl) continue;

            // Guardar entrada de tesis para el índice
            tocEntries.push({ title: essay.title, page: currentPage, isCategory: false });

            try {
                const url = essay.pdf_url || essay.pdfUrl;
                const pdfBytes = await fetch(url).then((res) => res.arrayBuffer());
                const srcPdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());

                copiedPages.forEach((page) => mergedPdf.addPage(page));
                currentPage += copiedPages.length; // Actualizamos el contador de páginas
            } catch (error) {
                console.error(`Error embedding PDF for ${essay.title}:`, error);
                const errorPage = mergedPdf.addPage([600, 800]);
                errorPage.drawText(`Error al cargar el contenido de: ${essay.title}`, {
                    x: 50,
                    y: 400,
                    size: 12,
                    font: regularFont,
                    color: rgb(0.8, 0.2, 0.2),
                });
                currentPage++;
            }
        }
    }

    // --- 4. Dibujar el Índice ---
    const drawToc = (page: any, entries: typeof tocEntries, startY: number) => {
        page.drawText('ÍNDICE DE CONTENIDOS', {
            x: 50,
            y: startY,
            size: 18,
            font: boldFont,
            color: rgb(0.05, 0.1, 0.2),
        });

        let y = startY - 40;
        for (const entry of entries) {
            if (y < 50) return entries.indexOf(entry); // Si no cabe, avisar para la siguiente pág

            if (entry.isCategory) {
                y -= 10;
                page.drawText(entry.title, {
                    x: 50,
                    y: y,
                    size: 11,
                    font: boldFont,
                    color: rgb(0.1, 0.4, 0.8),
                });
            } else {
                const titleText = entry.title;
                const pageText = entry.page.toString();

                // Dibujar título
                page.drawText(titleText, {
                    x: 60,
                    y: y,
                    size: 10,
                    font: regularFont,
                    color: rgb(0.2, 0.2, 0.2),
                });

                // Dibujar puntos guía
                const titleWidth = regularFont.widthOfTextAtSize(titleText, 10);
                const pageWidth = regularFont.widthOfTextAtSize(pageText, 10);
                const dotStart = 65 + titleWidth;
                const dotEnd = 540 - pageWidth;

                if (dotEnd > dotStart) {
                    const dots = '.'.repeat(Math.floor((dotEnd - dotStart) / 3));
                    page.drawText(dots, {
                        x: dotStart,
                        y: y,
                        size: 8,
                        font: regularFont,
                        color: rgb(0.7, 0.7, 0.7),
                    });
                }

                // Dibujar página
                page.drawText(pageText, {
                    x: 550 - pageWidth,
                    y: y,
                    size: 10,
                    font: boldFont,
                    color: rgb(0.05, 0.1, 0.2),
                });
            }
            y -= 18;
        }
        return entries.length;
    };

    const lastIdx = drawToc(tocPage1, tocEntries, 750);
    if (lastIdx < tocEntries.length) {
        drawToc(tocPage2, tocEntries.slice(lastIdx), 750);
    }

    const pdfBytes = await mergedPdf.save();
    return pdfBytes;
}
