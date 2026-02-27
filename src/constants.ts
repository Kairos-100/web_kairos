
export const WHITELIST = [
    "jaime.gonzalez@alumni.mondragon.edu",
    "carlos.ortas@alumni.mondragon.edu",
    "claudia.pinna@alumni.mondragon.edu",
    "paula.gascon@alumni.mondragon.edu",
    "angela.cuevas@alumni.mondragon.edu",
    "carlos.pereza@alumni.mondragon.edu",
    "marc.cano@alumni.mondragon.edu",
    "jimena.gonzalez-tarr@alumni.mondragon.edu",
    "guillermo.haya@alumni.mondragon.edu",
    "eider.viela@alumni.mondragon.edu"
];

export const ADMIN_RECIPIENTS = [
    "guillermo.haya@alumni.mondragon.edu",
    "eider.viela@alumni.mondragon.edu"
];

export const CLOCKIFY_USER_MAP: Record<string, string> = {
    "guillermo.haya": "Guillermo Haya",
    "jaime.gonzalez": "Jaimegmesa03",
    "jimena.gonzalez-tarr": "Jimenagtleinn",
    "claudia.pinna": "Claudia Pinna Jurado",
    "marc.cano": "Marc Cano",
    "paula.gascon": "Paula Gascón Escobedo",
    "angela.cuevas": "Angela",
    "carlos.ortas": "Caorpa"
};

export const CATEGORIES = [
    "Estrategia",
    "Tecnología",
    "Marketing",
    "Operaciones",
    "Cultura",
    "Finanzas",
    "Wellbeing"
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
    cv_pdf_url?: string;
    sharing_pdf_url?: string;
    cp_pdf_url?: string;
    cv_title?: string;
    cv_description?: string;
    sharing_title?: string;
    sharing_description?: string;
    cp_title?: string;
    cp_description?: string;
}
