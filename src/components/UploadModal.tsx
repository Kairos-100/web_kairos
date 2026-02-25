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
    onIdentify?: (email: string) => void;
    editEssay?: Essay;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, onSuccess, onIdentify, editEssay }) => {
    const [email, setEmail] = useState(editEssay?.author || '');
    const [isAuth, setIsAuth] = useState(!!editEssay);
    const [error, setError] = useState('');
    const [title, setTitle] = useState(editEssay?.title || '');
    const [category, setCategory] = useState(editEssay?.category || CATEGORIES[0]);
    const [content, setContent] = useState(editEssay?.content || '');
    const [tags, setTags] = useState(editEssay?.tags?.join(', ') || '');
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(editEssay?.pdfUrl);
    const [pdfName, setPdfName] = useState<string | undefined>(editEssay?.pdfUrl ? 'PDF Actual' : undefined);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [contributionType, setContributionType] = useState<ContributionType>(editEssay?.type || 'molecula');
    const [points, setPoints] = useState<number>(editEssay?.points || 4);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [date, setDate] = useState(editEssay?.date ?
        (editEssay.date.includes('/') ? editEssay.date.split('/').reverse().join('-') : editEssay.date) :
        new Date().toISOString().split('T')[0]
    );
    const [connectionStatus, setConnectionStatus] = useState<'testing' | 'ok' | 'fail'>('testing');
    const [showIncognitoWarning, setShowIncognitoWarning] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const testConnection = async () => {
            try {
                const { error } = await supabase.from('essays').select('id').limit(1);
                setConnectionStatus(error ? 'fail' : 'ok');
            } catch (e) {
                setConnectionStatus('fail');
            }
        };
        testConnection();
    }, []);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (WHITELIST.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
            setIsAuth(true);
            setError('');
            if (onIdentify) onIdentify(email);
        } else {
            setError('Lo sentimos, este email no tiene permisos para subir contenido.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfName(file.name);

            // Optimization: Use URL.createObjectURL instead of FileReader for large PDFs
            const url = URL.createObjectURL(file);
            setPdfUrl(url);

            // Cleanup function to avoid memory leaks if we change the file
            return () => URL.revokeObjectURL(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFile && !editEssay) return;

        setIsUploading(true);
        setError('');
        setUploadProgress(0);
        setShowIncognitoWarning(false);

        // Emergency timeout: if after 7s it's still at 0, show incognito warning
        setTimeout(() => {
            if (isUploading && uploadProgress === 0) {
                setShowIncognitoWarning(true);
            }
        }, 7000);

        try {
            let finalPdfUrl = pdfUrl;

            // Only upload to Supabase if config exists
            if (import.meta.env.VITE_SUPABASE_URL && pdfFile) {
                // Sanitize filename: remove special characters and replace spaces with underscores
                const sanitizedName = pdfFile.name
                    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
                    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace everything else except dots/dashes
                    .replace(/_{2,}/g, "_"); // Multi-underscores to single

                const fileName = `${Date.now()}-${sanitizedName}`;
                const { error: storageError } = await supabase.storage
                    .from('pdfs')
                    .upload(fileName, pdfFile, {
                        upsert: true,
                        onUploadProgress: (progress: any) => {
                            if (progress.total && progress.total > 0) {
                                const percent = (progress.loaded / progress.total) * 100;
                                setUploadProgress(Math.min(99, Math.round(percent)));
                            } else {
                                setUploadProgress(1);
                            }
                        }
                    } as any);

                if (storageError) throw storageError;

                const { data: { publicUrl } } = supabase.storage
                    .from('pdfs')
                    .getPublicUrl(fileName);

                finalPdfUrl = publicUrl;
            }

            if (import.meta.env.VITE_SUPABASE_URL) {
                // Insert or Update DB
                const tagArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                const essayPayload = {
                    title,
                    author: email,
                    category,
                    content,
                    tags: tagArray,
                    pdf_url: finalPdfUrl,
                    date: date.includes('-') ? date.split('-').reverse().join('/') : date,
                    reading_time: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
                    type: contributionType,
                    points: points
                };

                if (editEssay) {
                    const { error: dbError } = await supabase
                        .from('essays')
                        .update(essayPayload)
                        .eq('id', editEssay.id);
                    if (dbError) throw dbError;
                } else {
                    const { error: dbError } = await supabase
                        .from('essays')
                        .insert([essayPayload]);
                    if (dbError) throw dbError;
                }

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
            console.error('Error full object:', err);
            let userMessage = `Error: ${err.message || 'Error desconocido'}`;

            if (err.storage_error) {
                userMessage = `Error de Almacenamiento: ${err.storage_error.message}`;
            } else if (err.message?.includes('bucket')) {
                userMessage = 'Error: El bucket "pdfs" no tiene permisos. Verifica las políticas en Supabase.';
            } else if (err.message?.includes('column')) {
                userMessage = `Error de Base de Datos: Te falta una columna. ${err.message}`;
            } else if (err.message?.includes('maximum allowed size')) {
                userMessage = 'Error: El PDF excede el tamaño permitido por Supabase. Debes ampliar el "Maximum File Size" en Storage > Configuration en tu dashboard de Supabase.';
            } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                userMessage = 'Error de Red: No se puede conectar con el servidor. Tu WiFi o Firewall podría estar bloqueando Supabase.';
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
                        {editEssay ? 'Editar Tesis' : (isAuth ? 'Publicar Nueva Tesis' : 'Identificación Requerida')}
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
                                <div className="flex items-center space-x-3">
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
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="bg-white border border-green-100 rounded-lg px-2 py-1 text-xs font-bold text-kairos-navy shadow-sm outline-none focus:ring-1 focus:ring-green-400"
                                        required
                                    />
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
                                            placeholder="Impacto al proyecto..."

                                            rows={6}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all resize-none font-mono text-sm"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600">
                                            <AlertCircle size={20} />
                                            <p className="text-sm font-medium">{error}</p>
                                        </div>
                                    )}
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
                                className={`w-full py-4 text-lg mt-4 flex-shrink-0 transition-all font-bold rounded-2xl relative overflow-hidden ${isFormValid && !isUploading ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                            >
                                {isUploading && (
                                    <div
                                        className="absolute inset-0 bg-blue-600/20 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center space-x-2">
                                    {isUploading ? (
                                        <>
                                            <span>{uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Finalizando registro...'}</span>
                                            {uploadProgress === 100 && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        </>
                                    ) : (
                                        <span>{editEssay ? 'Guardar Cambios' : (pdfUrl ? 'Publicar Conocimiento' : 'Adjuntar PDF para Publicar')}</span>
                                    )}
                                </span>
                            </button>
                            <div className="flex flex-col items-center mt-2 space-y-1">
                                <p className="text-[8px] text-gray-300">Versión v2.2.8 - Máxima Estabilidad</p>
                                {showIncognitoWarning && uploadProgress === 0 && (
                                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2 flex items-start space-x-2 animate-pulse">
                                        <AlertCircle className="text-amber-600 flex-shrink-0" size={14} />
                                        <p className="text-[10px] text-amber-800 leading-tight">
                                            <strong>Truco:</strong> Tu navegador parece estar bloqueando la subida. <br />
                                            Prueba en <strong>Modo Incógnito</strong> (Ctrl+Shift+N).
                                        </p>
                                    </div>
                                )}
                                {connectionStatus === 'fail' && (
                                    <p className="text-[9px] text-red-400 font-bold flex items-center space-x-1">
                                        <AlertCircle size={10} />
                                        <span>Atención: Conexión con el servidor bloqueada por tu red</span>
                                    </p>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
