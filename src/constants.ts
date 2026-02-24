
export const WHITELIST = [
    "jaime.gonzalez@alumni.mondragon.edu",
    "carlos.ortas@alumni.mondragon.edu",
    "claudia.pinna@alumni.mondragon.edu",
    "paula.gascon@alumni.mondragon.edu",
    "angela.cuevas@alumni.mondragon.edu",
    "carlos.pereza@alumni.mondragon.edu",
    "marc.cano@alumni.mondragon.edu",
    "jimena.gonzalez-tarr@alumni.mondragon.edu",
    "guillermo.haya@alumni.mondragon.edu"
];

export const CATEGORIES = [
    "Estrategia",
    "Tecnología",
    "Marketing",
    "Operaciones",
    "Cultura",
    "Finanzas",
    "Otros"
];

export interface Comment {
    id: string;
    author: string;
    text: string;
    date: string;
}

export type ContributionType = 'molecula' | 'libro';

export const CONTRIBUTION_TYPES = [
    { id: 'molecula', label: 'Molécula', minPoints: 4, maxPoints: 11 },
    { id: 'libro', label: 'Libro', minPoints: 1, maxPoints: 3 }
];

export interface Essay {
    id: string;
    title: string;
    author: string;
    category: string;
    content: string;
    date: string;
    tags: string[];
    readingTime: number; // in minutes
    comments: Comment[];
    pdfUrl?: string; // Base64 or local blob URL
    type?: ContributionType;
    points?: number;
}
export interface MetricEntry {
    id: string;
    created_at: string;
    user_email: string;
    date: string;
    cv: number;
    cp: number;
    sharing: number;
    revenue: number;
    profit: number;
    pdf_url?: string;
}
