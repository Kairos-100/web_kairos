import React, { useState, useMemo } from 'react';
import {
    LayoutGrid,
    List,
    FileText,
    Search,
    User,
    ExternalLink,
    Eye,
    BookOpen,
    TrendingUp,
    Edit3,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Essay, MetricEntry } from '../constants';

export interface UnifiedDocument {
    id: string;
    title: string;
    description?: string;
    author: string;
    date: string;
    category: string;
    pdfUrl: string;
    type: 'tesis' | 'cv' | 'sharing' | 'cp';
    rawContent?: string;
    tags?: string[];
    isMetric?: boolean;
    points?: string;
}

interface DocumentExplorerProps {
    essays?: Essay[];
    metrics?: MetricEntry[];
    initialDocuments?: UnifiedDocument[];
    searchTerm?: string;
    onSelectEssay?: (id: string) => void;
    onEdit?: (doc: UnifiedDocument) => void;
    onDelete?: (doc: UnifiedDocument) => void;
    onEditEssay?: (essay: Essay) => void;
    onDeleteEssay?: (id: string, pdfUrl?: string) => void;
    onDeleteMetric?: (id: string) => void;
    hideSearch?: boolean;
    title?: string;
    currentUserEmail?: string | null;
}

export const DocumentExplorer: React.FC<DocumentExplorerProps> = ({
    essays = [],
    metrics = [],
    initialDocuments,
    searchTerm = '',
    onSelectEssay,
    onEdit,
    onDelete,
    onEditEssay,
    onDeleteEssay,
    onDeleteMetric,
    hideSearch = false,
    title,
    currentUserEmail
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'pdf'>('grid');

    const allDocuments = useMemo(() => {
        if (initialDocuments) {
            return initialDocuments.filter(doc =>
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (doc.rawContent && doc.rawContent.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        const unified: UnifiedDocument[] = [
            ...essays.map(e => ({
                id: e.id,
                title: e.title,
                description: e.category,
                author: e.author,
                date: e.date,
                category: e.category,
                pdfUrl: e.pdfUrl || '',
                type: 'tesis' as const,
                rawContent: e.content,
                tags: e.tags,
                isMetric: false
            })),
            ...metrics.flatMap(m => {
                const docs: UnifiedDocument[] = [];
                // Se ocultan las CV de "Explorar" por petición del usuario
                // El resto de métricas (Sharing y CP) siguen apareciendo
                if (m.sharing_pdf_url || m.sharing > 0) {
                    docs.push({
                        id: `sh-${m.id}`,
                        title: m.sharing_title || 'Justificante Sharing',
                        description: m.sharing_description,
                        author: m.user_email,
                        date: m.date,
                        category: 'Comunidad',
                        pdfUrl: m.sharing_pdf_url || '',
                        type: 'sharing' as const,
                        isMetric: true,
                        points: `+${m.sharing} SH`
                    });
                }
                if (m.cp_pdf_url || m.cp > 0) {
                    docs.push({
                        id: `cp-${m.id}`,
                        title: m.cp_title || 'Justificante CP',
                        description: m.cp_description,
                        author: m.user_email,
                        date: m.date,
                        category: 'Iniciativa',
                        pdfUrl: m.cp_pdf_url || '',
                        type: 'cp' as const,
                        isMetric: true,
                        points: `+${m.cp} CP`
                    });
                }
                return docs;
            })
        ];

        return unified.filter(doc =>
            doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (doc.rawContent && doc.rawContent.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => {
            const [d1, m1, y1] = a.date.split('/').map(Number);
            const [d2, m2, y2] = b.date.split('/').map(Number);
            return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
        });
    }, [essays, metrics, initialDocuments, searchTerm]);

    const isOwner = (authorEmail: string) => {
        if (!currentUserEmail) return false;
        return currentUserEmail.toLowerCase() === authorEmail.toLowerCase();
    };

    const handleEdit = (e: React.MouseEvent, doc: UnifiedDocument) => {
        e.stopPropagation();
        if (doc.type === 'tesis' && onEditEssay) {
            const essay = essays?.find(es => es.id === doc.id);
            if (essay) onEditEssay(essay);
        } else if (onEdit) {
            onEdit(doc);
        }
    };

    const handleDelete = (e: React.MouseEvent, doc: UnifiedDocument) => {
        e.stopPropagation();
        if (doc.type === 'tesis' && onDeleteEssay) {
            onDeleteEssay(doc.id, doc.pdfUrl);
        } else if (doc.isMetric && onDeleteMetric) {
            onDeleteMetric(doc.id.split('-')[1] || doc.id);
        } else if (onDelete) {
            onDelete(doc);
        }
    };

    const renderGridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDocuments.map((doc, index) => {
                const canManage = isOwner(doc.author);
                return (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => doc.type === 'tesis' && onSelectEssay ? onSelectEssay(doc.id) : (doc.pdfUrl && window.open(doc.pdfUrl, '_blank'))}
                        className="card group cursor-pointer border-transparent hover:border-blue-100 relative overflow-hidden flex flex-col h-full bg-white transition-all shadow-sm hover:shadow-xl p-6"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${doc.type === 'tesis' ? 'bg-kairos-navy text-white' :
                                doc.type === 'cv' ? 'bg-amber-100 text-amber-600' :
                                    doc.type === 'sharing' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'
                                }`}>
                                {doc.category}
                            </span>
                            <div className="flex items-center space-x-1">
                                {canManage && (
                                    <>
                                        <button
                                            onClick={(e) => handleEdit(e, doc)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, doc)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                <div className="text-blue-500 p-1">
                                    <FileText size={16} />
                                </div>
                            </div>
                        </div>

                        <h4 className="text-lg font-heading font-bold text-kairos-navy mb-2 line-clamp-2 group-hover:text-blue-600 transition-all leading-tight">
                            {doc.title}
                        </h4>

                        {doc.description && (
                            <p className="text-gray-500 text-xs font-medium mb-3 line-clamp-2 bg-gray-50/50 p-2 rounded-xl">
                                {doc.description}
                            </p>
                        )}

                        {doc.rawContent && !doc.description && (
                            <div className="text-gray-400 text-[11px] line-clamp-2 mb-4 italic">
                                {doc.rawContent.replace(/[#*]/g, '').substring(0, 100)}...
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <User size={10} className="text-blue-600" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500">{doc.author.split('@')[0]}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                {doc.points && <span className="text-[10px] font-black text-blue-600 mb-0.5">{doc.points}</span>}
                                <span className="text-[10px] text-gray-300 font-bold uppercase">{doc.date}</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    const renderListView = () => (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase font-black tracking-widest text-gray-400">
                    <tr>
                        <th className="p-6 pl-10">Tipo</th>
                        <th className="p-6">Documento</th>
                        <th className="p-6">Autor</th>
                        <th className="p-6">Fecha</th>
                        <th className="p-6 text-right pr-10">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {allDocuments.map((doc) => {
                        const canManage = isOwner(doc.author);
                        return (
                            <tr
                                key={doc.id}
                                className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                                onClick={() => doc.type === 'tesis' && onSelectEssay ? onSelectEssay(doc.id) : (doc.pdfUrl && window.open(doc.pdfUrl, '_blank'))}
                            >
                                <td className="p-6 pl-10">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.type === 'tesis' ? 'bg-blue-50 text-blue-600' :
                                        doc.type === 'cv' ? 'bg-amber-50 text-amber-600' :
                                            doc.type === 'sharing' ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-500'
                                        }`}>
                                        {doc.type === 'tesis' ? <BookOpen size={16} /> : <TrendingUp size={16} />}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-kairos-navy group-hover:text-blue-600 transition-colors">{doc.title}</span>
                                        {doc.description && <span className="text-[10px] text-gray-400 font-medium line-clamp-1 italic">{doc.description}</span>}
                                        <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tight mt-0.5">{doc.category}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-xs font-bold text-gray-500">{doc.author.split('@')[0]}</td>
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-300 font-black">{doc.date}</span>
                                        {doc.points && <span className="text-[9px] font-black text-blue-500">{doc.points}</span>}
                                    </div>
                                </td>
                                <td className="p-6 text-right pr-10">
                                    <div className="flex items-center justify-end space-x-2">
                                        {canManage && (
                                            <>
                                                <button
                                                    onClick={(e) => handleEdit(e, doc)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, doc)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderPdfView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {allDocuments.map((doc, index) => {
                const canManage = isOwner(doc.author);
                return (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 group h-[500px]"
                    >
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-xl bg-kairos-navy text-white flex items-center justify-center shadow-lg">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-kairos-navy line-clamp-1">{doc.title}</h4>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{doc.author.split('@')[0]} • {doc.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {canManage && (
                                    <>
                                        <button
                                            onClick={(e) => handleEdit(e, doc)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, doc)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => doc.type === 'tesis' && onSelectEssay ? onSelectEssay(doc.id) : (doc.pdfUrl && window.open(doc.pdfUrl, '_blank'))}
                                    className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:scale-110 transition-transform"
                                >
                                    <Eye size={14} />
                                </button>
                                {doc.pdfUrl && (
                                    <a
                                        href={doc.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white text-kairos-navy rounded-lg shadow-sm hover:scale-110 transition-transform"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-200 relative">
                            {doc.pdfUrl ? (
                                <iframe
                                    src={doc.pdfUrl}
                                    className="w-full h-full border-none"
                                    title={doc.title}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300 p-10 text-center">
                                    <div className="mb-4 opacity-50 space-y-2">
                                        <FileText size={48} className="mx-auto opacity-20" />
                                        {doc.description && (
                                            <p className="text-xs font-medium text-gray-400 italic px-4">
                                                "{doc.description}"
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sin documento adjunto</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Title if provided */}
            {(title || !hideSearch) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {title && (
                        <div className="flex items-center space-x-3">
                            <FileText className="text-kairos-navy" size={24} />
                            <h3 className="text-2xl font-heading font-black text-kairos-navy">{title}</h3>
                        </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                        >
                            <LayoutGrid size={16} />
                            <span className="hidden sm:inline">Mosaico</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                        >
                            <List size={16} />
                            <span className="hidden sm:inline">Lista</span>
                        </button>
                        <button
                            onClick={() => setViewMode('pdf')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'pdf' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                        >
                            <FileText size={16} />
                            <span className="hidden sm:inline">Vista PDF</span>
                        </button>
                    </div>
                </div>
            )}

            {!title && hideSearch && (
                <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit mx-auto lg:mx-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                    >
                        <LayoutGrid size={16} />
                        <span className="hidden sm:inline">Mosaico</span>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                    >
                        <List size={16} />
                        <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button
                        onClick={() => setViewMode('pdf')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'pdf' ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                    >
                        <FileText size={16} />
                        <span className="hidden sm:inline">Vista PDF</span>
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {viewMode === 'grid' && renderGridView()}
                    {viewMode === 'list' && renderListView()}
                    {viewMode === 'pdf' && renderPdfView()}
                </motion.div>
            </AnimatePresence>

            {allDocuments.length === 0 && (
                <div className="py-20 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 text-gray-200">
                        <Search size={40} />
                    </div>
                    <h3 className="text-xl font-heading font-bold text-kairos-navy mb-2">No se encontraron documentos</h3>
                    <p className="text-gray-400 max-w-sm mx-auto">Prueba con otros términos de búsqueda o ajusta el rango de fechas.</p>
                </div>
            )}
        </div>
    );
};
