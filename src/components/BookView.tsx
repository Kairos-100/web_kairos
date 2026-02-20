import React from 'react';
import type { Essay } from '../constants';
import { Book, ChevronRight, Hash, ExternalLink, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BookViewProps {
    essays: Essay[];
}

export const BookView: React.FC<BookViewProps> = ({ essays }) => {
    // Group essays by category
    const groupedEssays = essays.reduce((acc, essay) => {
        if (!acc[essay.category]) {
            acc[essay.category] = [];
        }
        acc[essay.category].push(essay);
        return acc;
    }, {} as Record<string, Essay[]>);

    const categories = Object.keys(groupedEssays);

    // Calculate Summary Stats
    const totalEssays = essays.length;
    const totalCategories = categories.length;
    const totalMinds = new Set(essays.map(e => e.author)).size;

    // Top contributors (top 3)
    const authorStats = essays.reduce((acc: Record<string, number>, essay) => {
        const name = essay.author.split('@')[0];
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const topContributors = Object.entries(authorStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Book Cover / Header */}
            <div className="bg-kairos-navy text-white p-12 rounded-3xl mb-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <Book size={48} className="text-blue-400 mb-6" />
                    <h2 className="text-4xl font-heading font-bold mb-4">El Libro del Conocimiento</h2>
                    <p className="text-blue-200 font-medium max-w-md mb-8">Una compilación curada de todas las tesis y descubrimientos compartidos por el equipo de Kairos.</p>

                    <button
                        onClick={() => window.print()}
                        className="group flex items-center space-x-3 px-8 py-4 bg-white text-kairos-navy rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl active:scale-95 no-print"
                    >
                        <FileDown size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                        <span>Exportar Todo el Libro (PDF)</span>
                    </button>

                    <div className="mt-8 flex space-x-8 text-xs font-bold uppercase tracking-widest text-blue-300">
                        <div className="flex flex-col items-center">
                            <span className="text-2xl text-white mb-1">{essays.length}</span>
                            <span>Capítulos</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl text-white mb-1">{categories.length}</span>
                            <span>Secciones</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Learning Evolution Section (New) */}
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 mb-12 page-break-after">
                <h3 className="text-xl font-heading font-bold text-kairos-navy mb-8 flex items-center space-x-2">
                    <Book size={20} className="text-blue-500" />
                    <span>Evolución del Aprendizaje</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total Tesis</p>
                        <p className="text-3xl font-heading font-bold text-kairos-navy">{totalEssays}</p>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Categorías</p>
                        <p className="text-3xl font-heading font-bold text-kairos-navy">{totalCategories}</p>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Colaboradores</p>
                        <p className="text-3xl font-heading font-bold text-kairos-navy">{totalMinds}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Líderes de Conocimiento</h4>
                    {topContributors.map(([name, count], idx) => (
                        <div key={name} className="flex items-center justify-between p-3 border-b border-gray-50">
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-bold text-blue-600">0{idx + 1}</span>
                                <span className="text-sm font-medium text-kairos-navy capitalize">{name.replace('.', ' ')}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-400">{count} aportaciones</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Table of Contents */}
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 mb-12 page-break-after">
                <h3 className="text-xl font-heading font-bold text-kairos-navy mb-8 flex items-center space-x-2">
                    <Hash size={20} className="text-blue-500" />
                    <span>Índice de Contenidos</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categories.map((cat) => (
                        <div key={cat} className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">{cat}</h4>
                            <ul className="space-y-2">
                                {groupedEssays[cat].map((essay) => (
                                    <li key={essay.id}>
                                        <a
                                            href={`#essay-${essay.id}`}
                                            className="text-sm font-medium text-kairos-navy hover:text-blue-600 flex items-center justify-between group"
                                        >
                                            <span className="truncate pr-4">{essay.title}</span>
                                            <ChevronRight size={14} className="text-gray-200 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Book Content */}
            <div className="space-y-20 mt-12">
                {categories.map((cat) => (
                    <section key={cat} className="space-y-12">
                        <div className="flex items-center space-x-4 mb-8">
                            <div className="h-0.5 flex-1 bg-gray-100"></div>
                            <span className="px-6 py-2 bg-gray-50 rounded-full text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border border-gray-100">
                                {cat}
                            </span>
                            <div className="h-0.5 flex-1 bg-gray-100"></div>
                        </div>

                        {groupedEssays[cat].map((essay) => (
                            <article
                                key={essay.id}
                                id={`essay-${essay.id}`}
                                className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm scroll-mt-24 page-break-before"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h4 className="text-3xl font-heading font-bold text-kairos-navy mb-2">{essay.title}</h4>
                                        <p className="text-sm text-gray-400 font-medium">Por {essay.author.split('@')[0]} • {essay.date}</p>
                                    </div>
                                    {essay.pdfUrl && (
                                        <a
                                            href={essay.pdfUrl}
                                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                                            title="Abrir PDF Original"
                                        >
                                            <ExternalLink size={20} />
                                        </a>
                                    )}
                                </div>

                                <div className="prose prose-lg prose-slate max-w-none prose-headings:font-heading prose-headings:text-kairos-navy prose-a:text-blue-600 first-letter:text-5xl first-letter:font-bold first-letter:text-blue-600 first-letter:mr-3 first-letter:float-left">
                                    <ReactMarkdown>{essay.content}</ReactMarkdown>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex space-x-2">
                                        {essay.tags.map(t => (
                                            <span key={t} className="text-[10px] font-bold text-blue-400">#{t}</span>
                                        ))}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase text-gray-300 tracking-widest">Capítulo {essay.id}</div>
                                </div>
                            </article>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
};
