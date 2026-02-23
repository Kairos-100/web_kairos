import React, { useState, useRef } from 'react';
import { X, Search, CheckCircle2, Eye, Edit3, Tag as TagIcon, FileUp, FileText, AlertCircle } from 'lucide-react';
import { WHITELIST, CATEGORIES, CONTRIBUTION_TYPES } from '../constants';
import type { Essay, ContributionType } from '../constants';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';

interface UploadModalProps {
    onClose: () => void;
    onUpload: (essay: Omit<Essay, 'id' | 'date' | 'comments' | 'readingTime'>) => void;
    onSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [isAuth, setIsAuth] = useState(false);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
    const [pdfName, setPdfName] = useState<string | undefined>(undefined);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [contributionType, setContributionType] = useState<ContributionType>('molecula');
    const [points, setPoints] = useState<number>(4);
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (WHITELIST.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
            setIsAuth(true);
            setError('');
        } else {
            setError('Lo sentimos, este email no tiene permisos para subir contenido.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfName(file.name);

            // Build local preview just for UI
            const reader = new FileReader();
            reader.onloadend = () => {
                setPdfUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFile) return;

        setIsUploading(true);
        setError('');

        try {
            let finalPdfUrl = pdfUrl;

            // Only upload to Supabase if config exists
            if (import.meta.env.VITE_SUPABASE_URL && pdfFile) {
                const fileName = `${Date.now()}-${pdfFile.name}`;
                const { error: storageError } = await supabase.storage
                    .from('pdfs')
                    .upload(fileName, pdfFile);

                if (storageError) throw storageError;

                const { data: { publicUrl } } = supabase.storage
                    .from('pdfs')
                    .getPublicUrl(fileName);

                finalPdfUrl = publicUrl;

                // Insert into DB
                const tagArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                const { error: dbError } = await supabase
                    .from('essays')
                    .insert([{
                        title,
                        author: email,
                        category,
                        content,
                        tags: tagArray,
                        pdf_url: finalPdfUrl,
                        date: new Date().toLocaleDateString('es-ES'),
                        reading_time: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
                        type: contributionType,
                        points: points
                    }]);

                if (dbError) throw dbError;
                if (onSuccess) onSuccess();
            } else {
                // Fallback to local upload (old behavior)
                const tagArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                onUpload({
                    title,
                    author: email,
                    category,
                    content,
                    tags: tagArray,
                    pdfUrl: finalPdfUrl,
                    type: contributionType,
                    points: points
                });
            }
            onClose();
        } catch (err: any) {
            console.error('Error uploading to Supabase:', err);
            let userMessage = `Error al subir: ${err.message || 'Error desconocido'}`;
            if (err.message?.includes('Bucket not found')) {
                userMessage = 'Error: El bucket "pdfs" no existe en Supabase. Por favor, créalo en la sección Storage.';
            }
            setError(userMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const isFormValid = title.trim() !== '' && pdfUrl !== undefined;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-kairos-navy/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-heading font-bold text-kairos-navy">
                        {isAuth ? 'Publicar Nueva Tesis' : 'Identificación Requerida'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {!isAuth ? (
                        <form onSubmit={handleAuth} className="space-y-6 max-w-md mx-auto">
                            <p className="text-gray-500 text-sm leading-relaxed text-center">
                                Solo los miembros autorizados de Kairos pueden publicar sus tesis.
                            </p>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Email Institucional</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu.nombre@alumni.mondragon.edu"
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all pr-12"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                        <Search size={20} />
                                    </div>
                                </div>
                                {error && <p className="mt-2 text-red-500 text-sm font-medium">{error}</p>}
                            </div>
                            <button type="submit" className="w-full btn-primary py-4 text-lg">
                                Verificar Acceso
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl mb-4">
                                <div className="flex items-center space-x-2 text-green-600">
                                    <CheckCircle2 size={18} />
                                    <span className="text-xs font-bold uppercase tracking-tight">Acceso Autorizado: {email}</span>
                                </div>
                                <div className="flex bg-white rounded-lg p-1 border border-green-100 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('edit')}
                                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'edit' ? 'bg-kairos-navy text-white' : 'text-gray-400 hover:text-kairos-navy'}`}
                                    >
                                        <Edit3 size={14} />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('preview')}
                                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'preview' ? 'bg-kairos-navy text-white' : 'text-gray-400 hover:text-kairos-navy'}`}
                                    >
                                        <Eye size={14} />
                                        <span>Vista Previa</span>
                                    </button>
                                </div>
                            </div>

                            {viewMode === 'edit' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 text-[10px]">Título del Ensayo / Tesis</label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Ej: Análisis de la Cultura Corporativa en..."
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 text-[10px]">Categoría</label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all"
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 text-[10px]">Etiquetas (separadas por coma)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={tags}
                                                    onChange={(e) => setTags(e.target.value)}
                                                    placeholder="IA, Growth, B2B..."
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all pl-10"
                                                />
                                                <TagIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                            </div>
                                        </div>

                                        <div className="col-span-2 grid grid-cols-2 gap-4 bg-kairos-navy/5 p-4 rounded-2xl border border-kairos-navy/10">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-kairos-navy/60 mb-2 text-[10px]">Tipo de Conocimiento</label>
                                                <div className="flex bg-white rounded-lg p-1 border border-gray-100 shadow-sm">
                                                    {CONTRIBUTION_TYPES.map((ct) => (
                                                        <button
                                                            key={ct.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setContributionType(ct.id as ContributionType);
                                                                setPoints(ct.minPoints);
                                                            }}
                                                            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${contributionType === ct.id ? 'bg-kairos-navy text-white shadow-md' : 'text-gray-400 hover:text-kairos-navy'}`}
                                                        >
                                                            <span>{ct.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-kairos-navy/60 mb-2 text-[10px]">Puntuación ({points} pts)</label>
                                                <div className="flex items-center space-x-3">
                                                    <input
                                                        type="range"
                                                        min={CONTRIBUTION_TYPES.find(ct => ct.id === contributionType)?.minPoints}
                                                        max={CONTRIBUTION_TYPES.find(ct => ct.id === contributionType)?.maxPoints}
                                                        value={points}
                                                        onChange={(e) => setPoints(parseInt(e.target.value))}
                                                        className="flex-1 accent-kairos-navy"
                                                    />
                                                    <span className="text-sm font-bold text-kairos-navy w-8 text-center">{points}</span>
                                                </div>
                                                <p className="text-[9px] text-gray-400 mt-1">
                                                    Rango para {contributionType}: {CONTRIBUTION_TYPES.find(ct => ct.id === contributionType)?.minPoints}-{CONTRIBUTION_TYPES.find(ct => ct.id === contributionType)?.maxPoints} pts
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-6 rounded-2xl border border-dashed transition-all ${pdfUrl ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/50 border-blue-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[10px] text-blue-600">
                                                <span>Adjuntar Tesis (Requerido)</span>
                                                <span className="text-red-500">*</span>
                                            </label>
                                            {pdfName && <span className="text-[10px] text-green-600 font-bold flex items-center space-x-1"><CheckCircle2 size={12} /> <span>{pdfName}</span></span>}
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`w-full py-4 flex flex-col items-center justify-center space-y-2 hover:bg-white transition-colors rounded-xl border ${pdfUrl ? 'border-green-200' : 'border-blue-200'}`}
                                        >
                                            <FileUp size={24} className={pdfUrl ? 'text-green-500' : 'text-blue-500'} />
                                            <span className={`text-xs font-bold ${pdfUrl ? 'text-green-700' : 'text-blue-700'}`}>{pdfUrl ? 'Cambiar archivo PDF' : 'Seleccionar archivo PDF'}</span>
                                        </button>
                                        {!pdfUrl && (
                                            <div className="mt-2 flex items-center space-x-1 text-blue-400">
                                                <AlertCircle size={10} />
                                                <span className="text-[9px] font-medium tracking-tight">Debes adjuntar el PDF para poder publicar.</span>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 text-[10px]">Breve Resumen (Markdown)</label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="# Resumen Ejecutivo...
                      
Explica brevemente de qué trata este documento."
                                            rows={6}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all resize-none font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 min-h-[400px]">
                                    <div className="prose prose-blue max-w-none bg-gray-50 p-8 rounded-2xl border border-gray-100">
                                        <h1 className="text-3xl font-heading font-bold text-kairos-navy mb-4">{title || 'Sin Título'}</h1>
                                        <div className="flex space-x-2 mb-4">
                                            {tags.split(',').map(t => t.trim()).filter(t => t).map(t => (
                                                <span key={t} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold">#{t}</span>
                                            ))}
                                        </div>
                                        {pdfUrl && (
                                            <div className="flex items-center space-x-2 p-3 bg-white border border-green-200 rounded-xl mb-6 shadow-sm">
                                                <FileText className="text-green-500" />
                                                <span className="text-xs font-bold text-kairos-navy text-green-700">PDF Adjunto preparado</span>
                                            </div>
                                        )}
                                        <ReactMarkdown>{content || '*Sin resumen para previsualizar*'}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!isFormValid || isUploading}
                                className={`w-full py-4 text-lg mt-4 flex-shrink-0 transition-all font-bold rounded-2xl ${isFormValid && !isUploading ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                            >
                                {isUploading ? 'Subiendo...' : (pdfUrl ? 'Publicar Conocimiento' : 'Adjuntar PDF para Publicar')}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
