import React, { useState, useRef } from 'react';
import { X, CheckCircle2, Search, Users, Target, Share2, DollarSign, Wallet, AlertCircle, FileUp, FileSpreadsheet, Info } from 'lucide-react';
import { WHITELIST } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase.js';
import { ingestDocument } from '../lib/ai';
import { notifyNewMetric } from '../lib/notifications';
import { getWorkspaceId, getProjects, createTimeEntry } from '../lib/clockify';
import { parseCSV, validateMetricCSV } from '../utils/csv';

interface MetricsModalProps {
    onClose: () => void;
    onSuccess?: () => void;
    onIdentify?: (email: string) => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({ onClose, onSuccess, onIdentify }) => {
    const [email, setEmail] = useState('');
    const [isAuth, setIsAuth] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // CSV Import states
    const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Clockify states
    const [syncToClockify, setSyncToClockify] = useState(false);
    const [availableProjects, setAvailableProjects] = useState<{ id: string, name: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cv, setCv] = useState(0);
    const [cp, setCp] = useState(0);
    const [sharing, setSharing] = useState(0);
    const [revenue, setRevenue] = useState(0);
    const [profit, setProfit] = useState(0);

    // Metadata states
    const [cvTitle, setCvTitle] = useState('');
    const [cvDescription, setCvDescription] = useState('');
    const [sharingTitle, setSharingTitle] = useState('');
    const [sharingDescription, setSharingDescription] = useState('');
    const [cpTitle, setCpTitle] = useState('');
    const [cpDescription, setCpDescription] = useState('');

    // CV PDF states
    const [cvPdfFile, setCvPdfFile] = useState<File | null>(null);
    const [cvPdfName, setCvPdfName] = useState<string | undefined>(undefined);
    const [cvPdfUrl, setCvPdfUrl] = useState<string | undefined>(undefined);

    // Sharing PDF states
    const [sharingPdfFile, setSharingPdfFile] = useState<File | null>(null);
    const [sharingPdfName, setSharingPdfName] = useState<string | undefined>(undefined);
    const [sharingPdfUrl, setSharingPdfUrl] = useState<string | undefined>(undefined);

    // CP PDF states
    const [cpPdfFile, setCpPdfFile] = useState<File | null>(null);
    const [cpPdfName, setCpPdfName] = useState<string | undefined>(undefined);
    const [cpPdfUrl, setCpPdfUrl] = useState<string | undefined>(undefined);

    const cvInputRef = useRef<HTMLInputElement>(null);
    const sharingInputRef = useRef<HTMLInputElement>(null);
    const cpInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        // Fetch Clockify projects
        const initClockify = async () => {
            setIsLoadingProjects(true);
            const wId = await getWorkspaceId();
            if (wId) {
                setWorkspaceId(wId);
                const projects = await getProjects(wId);
                if (projects) {
                    setAvailableProjects(projects);
                }
            }
            setIsLoadingProjects(false);
        };
        initClockify();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cv' | 'sharing' | 'cp' | 'csv') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'csv') {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                setCsvError('Por favor, selecciona un archivo CSV válido.');
                return;
            }
            setCsvFile(file);
            setCsvError(null);

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                try {
                    const { headers, data } = parseCSV(text);
                    const errors = validateMetricCSV(data);
                    if (errors.length > 0) {
                        setCsvError(errors.join(' '));
                        setCsvData([]);
                    } else {
                        setCsvHeaders(headers);
                        setCsvData(data);
                        setCsvError(null);
                    }
                } catch (err) {
                    setCsvError('Error al procesar el archivo CSV.');
                    setCsvData([]);
                }
            };
            reader.readAsText(file);
            return;
        }

        if (file && file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            if (type === 'cv') {
                setCvPdfFile(file);
                setCvPdfName(file.name);
                setCvPdfUrl(url);
            } else if (type === 'sharing') {
                setSharingPdfFile(file);
                setSharingPdfName(file.name);
                setSharingPdfUrl(url);
            } else if (type === 'cp') {
                setCpPdfFile(file);
                setCpPdfName(file.name);
                setCpPdfUrl(url);
            }
            return () => URL.revokeObjectURL(url);
        }
    };

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (WHITELIST.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
            setIsAuth(true);
            setError('');
            if (onIdentify) onIdentify(email);
        } else {
            setError('Lo sentimos, este email no tiene permisos para subir métricas.');
        }
    };

    const uploadToSupabase = async (file: File, prefix: string) => {
        const sanitizedName = file.name
            .replace(/[^\x00-\x7F]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .replace(/_{2,}/g, "_");

        const fileName = `metrics/${prefix}-${Date.now()}-${sanitizedName}`;
        const { error: storageError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file, {
                upsert: true,
                onUploadProgress: (progress: any) => {
                    if (progress.total && progress.total > 0) {
                        const percent = (progress.loaded / progress.total) * 100;
                        setUploadProgress(prev => Math.min(99, Math.round((prev + percent) / 2)));
                    }
                }
            } as any);

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        setError('');
        setUploadProgress(0);

        try {
            if (activeTab === 'bulk') {
                if (csvData.length === 0) throw new Error('No hay datos para importar.');

                const recordsToInsert = csvData
                    .filter(row => row.date && row.date.trim() !== '' && row.user_email && row.user_email.trim() !== '')
                    .map(row => {
                        const d = row.date?.trim();
                        let formattedDate = d;

                        // Try to normalize date if it's DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
                        if (d && d.includes('/') && !d.includes('-')) {
                            const parts = d.split('/');
                            if (parts.length === 3) {
                                const day = parts[0];
                                const month = parts[1];
                                // If year contains time (e.g. "2025 13:28:54"), take only the year
                                const yearPart = parts[2].split(' ')[0];
                                formattedDate = `${yearPart}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            }
                        }

                        return {
                            user_email: row.user_email,
                            date: formattedDate,
                            cv: parseInt(row.cv) || 0,
                            cp: parseInt(row.cp) || 0,
                            sharing: parseInt(row.sharing) || 0,
                            revenue: parseFloat(row.revenue) || 0,
                            profit: parseFloat(row.profit) || 0,
                            bp: parseInt(row.bp) || 0,
                            cv_title: row.cv_title || '',
                            cv_description: row.cv_description || '',
                            cv_pdf_url: row.cv_pdf_url || '',
                            sharing_title: row.sharing_title || '',
                            sharing_description: row.sharing_description || '',
                            sharing_pdf_url: row.sharing_pdf_url || '',
                            cp_title: row.cp_title || '',
                            cp_description: row.cp_description || '',
                            cp_pdf_url: row.cp_pdf_url || '',
                            bp_title: row.bp_title || '',
                            bp_pdf_url: row.bp_pdf_url || ''
                        };
                    });

                const { error: dbError } = await supabase
                    .from('metrics')
                    .insert(recordsToInsert);

                if (dbError) throw dbError;

                setUploadProgress(100);
            } else {
                let finalCvUrl = undefined;
                let finalSharingUrl = undefined;
                let finalCpUrl = undefined;

                if (import.meta.env.VITE_SUPABASE_URL) {
                    if (cvPdfFile) {
                        finalCvUrl = await uploadToSupabase(cvPdfFile, 'cv');
                    }
                    if (sharingPdfFile) {
                        finalSharingUrl = await uploadToSupabase(sharingPdfFile, 'sharing');
                    }
                    if (cpPdfFile) {
                        finalCpUrl = await uploadToSupabase(cpPdfFile, 'cp');
                    }
                }

                const { data: newData, error: dbError } = await supabase
                    .from('metrics')
                    .insert([{
                        user_email: email,
                        date: date,
                        cv,
                        cp,
                        sharing,
                        revenue,
                        profit,
                        cv_pdf_url: finalCvUrl,
                        sharing_pdf_url: finalSharingUrl,
                        cp_pdf_url: finalCpUrl,
                        cv_title: cvTitle,
                        cv_description: cvDescription,
                        sharing_title: sharingTitle,
                        sharing_description: sharingDescription,
                        cp_title: cpTitle,
                        cp_description: cpDescription
                    }])
                    .select();

                if (dbError) throw dbError;

                // Trigger AI Ingestion for each PDF in background
                if (newData && newData[0]) {
                    const metricId = newData[0].id;
                    const newMetric = { ...newData[0] };
                    if (finalCvUrl) ingestDocument(metricId, 'metric', finalCvUrl).catch(console.error);
                    if (finalSharingUrl) ingestDocument(metricId, 'metric', finalSharingUrl).catch(console.error);
                    if (finalCpUrl) ingestDocument(metricId, 'metric', finalCpUrl).catch(console.error);

                    // Notify the team
                    notifyNewMetric(newMetric).catch(console.error);
                }

                // Clockify Sync
                if (syncToClockify && workspaceId && selectedProjectId) {
                    const end = new Date();
                    const start = new Date(end.getTime() - 15 * 60 * 1000); // Default 15 min

                    await createTimeEntry(
                        workspaceId,
                        selectedProjectId,
                        start,
                        end,
                        `Registro de Métricas: CV:${cv}, CP:${cp}, SH:${sharing}`
                    ).catch(err => console.error('Failed to sync to Clockify:', err));
                }
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error uploading metrics:', err);
            let userMessage = `Error al guardar: ${err.message}`;

            if (err.message?.includes('maximum allowed size')) {
                userMessage = 'Error: El PDF es demasiado grande. Debes ampliar el "Maximum File Size" en la configuración de Storage en tu panel de Supabase (recomiendo 50MB).';
            }

            setError(userMessage);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-kairos-navy/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-heading font-bold text-kairos-navy">
                        {isAuth ? 'Registrar Métricas Comerciales' : 'Identificación Requerida'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {!isAuth ? (
                        <form onSubmit={handleAuth} className="space-y-6 max-w-md mx-auto">
                            <p className="text-gray-500 text-sm leading-relaxed text-center">
                                Solo los miembros autorizados de Kairos pueden registrar métricas comerciales.
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
                        <div className="space-y-6">
                            <div className="flex p-1 bg-gray-100 rounded-xl mb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('individual')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${activeTab === 'individual' ? 'bg-white text-kairos-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Users size={14} />
                                    <span>Individual</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('bulk')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${activeTab === 'bulk' ? 'bg-white text-kairos-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FileSpreadsheet size={14} />
                                    <span>Importación Masiva (CSV)</span>
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === 'individual' ? (
                                    <motion.div
                                        key="individual"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center space-x-2 text-blue-600">
                                                <CheckCircle2 size={18} />
                                                <span className="text-xs font-bold uppercase tracking-tight">Registro para: {email}</span>
                                            </div>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-xs font-bold text-kairos-navy"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* CV */}
                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                    <Users size={14} className="text-blue-500" />
                                                    <span>Customer Visits (CV)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={cv}
                                                    onChange={(e) => setCv(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none"
                                                    min="0"
                                                />
                                            </div>

                                            {/* CP */}
                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                    <Target size={14} className="text-red-500" />
                                                    <span>Community Points (CP)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={cp}
                                                    onChange={(e) => setCp(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none"
                                                    min="0"
                                                />
                                            </div>

                                            {/* Sharing */}
                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                    <Share2 size={14} className="text-purple-500" />
                                                    <span>Sharings</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={sharing}
                                                    onChange={(e) => setSharing(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none"
                                                    min="0"
                                                />
                                            </div>

                                            {/* Revenue */}
                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                    <DollarSign size={14} className="text-green-600" />
                                                    <span>Facturación (€)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={revenue}
                                                    onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none font-bold text-green-700"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>

                                            {/* Profit */}
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                    <Wallet size={14} className="text-emerald-600" />
                                                    <span>Beneficio (€)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={profit}
                                                    onChange={(e) => setProfit(parseFloat(e.target.value) || 0)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none font-bold text-emerald-700"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* PDF Uploads... (omitted for brevity in this block, but they follow the same individual logic) */}
                                            <div className={`p-4 rounded-2xl border border-dashed transition-all ${cvPdfUrl ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/50 border-blue-200'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                                        <span>PDF Visitas (CV)</span>
                                                    </label>
                                                    {cvPdfName && <span className="text-[10px] text-green-600 font-bold flex items-center space-x-1 max-w-[100px] truncate"><CheckCircle2 size={10} /> <span>{cvPdfName}</span></span>}
                                                </div>

                                                {(cv > 0 || cvPdfFile) && (
                                                    <div className="mb-3 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={cvTitle}
                                                            onChange={(e) => setCvTitle(e.target.value)}
                                                            placeholder="Título de la visita (Ej: Cliente X)"
                                                            className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                                                        />
                                                        <textarea
                                                            value={cvDescription}
                                                            onChange={(e) => setCvDescription(e.target.value)}
                                                            placeholder="Impacto al proyecto..."
                                                            className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-400 resize-none shadow-sm"
                                                            rows={2}
                                                        />
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => handleFileChange(e, 'cv')}
                                                    ref={cvInputRef}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => cvInputRef.current?.click()}
                                                    className={`w-full py-3 flex flex-col items-center justify-center space-y-1 hover:bg-white transition-colors rounded-xl border ${cvPdfUrl ? 'border-green-200' : 'border-blue-200'}`}
                                                >
                                                    <FileUp size={20} className={cvPdfUrl ? 'text-green-500' : 'text-blue-500'} />
                                                    <span className={`text-[10px] font-bold ${cvPdfUrl ? 'text-green-700' : 'text-blue-700'}`}>{cvPdfUrl ? 'Cambiar Justificante' : 'Subir Justificante CV'}</span>
                                                </button>
                                            </div>

                                            <div className={`p-4 rounded-2xl border border-dashed transition-all ${sharingPdfUrl ? 'bg-green-50/50 border-green-200' : 'bg-purple-50/50 border-purple-200'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                                                        <span>PDF Sharings</span>
                                                    </label>
                                                    {sharingPdfName && <span className="text-[10px] text-green-600 font-bold flex items-center space-x-1 max-w-[100px] truncate"><CheckCircle2 size={10} /> <span>{sharingPdfName}</span></span>}
                                                </div>

                                                {(sharing > 0 || sharingPdfFile) && (
                                                    <div className="mb-3 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={sharingTitle}
                                                            onChange={(e) => setSharingTitle(e.target.value)}
                                                            placeholder="Título del sharing"
                                                            className="w-full px-3 py-2 bg-white border border-purple-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
                                                        />
                                                        <textarea
                                                            value={sharingDescription}
                                                            onChange={(e) => setSharingDescription(e.target.value)}
                                                            placeholder="Impacto al proyecto..."
                                                            className="w-full px-3 py-2 bg-white border border-purple-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-400 resize-none shadow-sm"
                                                            rows={2}
                                                        />
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => handleFileChange(e, 'sharing')}
                                                    ref={sharingInputRef}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => sharingInputRef.current?.click()}
                                                    className={`w-full py-3 flex flex-col items-center justify-center space-y-1 hover:bg-white transition-colors rounded-xl border ${sharingPdfUrl ? 'border-green-200' : 'border-purple-200'}`}
                                                >
                                                    <FileUp size={20} className={sharingPdfUrl ? 'text-green-500' : 'text-purple-500'} />
                                                    <span className={`text-[10px] font-bold ${sharingPdfUrl ? 'text-green-700' : 'text-purple-700'}`}>{sharingPdfUrl ? 'Cambiar Justificante' : 'Subir Justificante Sharing'}</span>
                                                </button>
                                            </div>

                                            <div className={`p-4 rounded-2xl border border-dashed transition-all col-span-1 md:col-span-2 ${cpPdfUrl ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-red-600">
                                                        <span>PDF Community Points (CP)</span>
                                                    </label>
                                                    {cpPdfName && <span className="text-[10px] text-green-600 font-bold flex items-center space-x-1 max-w-[100px] truncate"><CheckCircle2 size={10} /> <span>{cpPdfName}</span></span>}
                                                </div>

                                                {(cp > 0 || cpPdfFile) && (
                                                    <div className="mb-3 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={cpTitle}
                                                            onChange={(e) => setCpTitle(e.target.value)}
                                                            placeholder="Título de la iniciativa"
                                                            className="w-full px-3 py-2 bg-white border border-red-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
                                                        />
                                                        <textarea
                                                            value={cpDescription}
                                                            onChange={(e) => setCpDescription(e.target.value)}
                                                            placeholder="Impacto al proyecto..."
                                                            className="w-full px-3 py-2 bg-white border border-red-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400 resize-none shadow-sm"
                                                            rows={2}
                                                        />
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => handleFileChange(e, 'cp')}
                                                    ref={cpInputRef}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => cpInputRef.current?.click()}
                                                    className={`w-full py-3 flex flex-col items-center justify-center space-y-1 hover:bg-white transition-colors rounded-xl border ${cpPdfUrl ? 'border-green-200' : 'border-red-200'}`}
                                                >
                                                    <FileUp size={20} className={cpPdfUrl ? 'text-green-500' : 'text-red-500'} />
                                                    <span className={`text-[10px] font-bold ${cpPdfUrl ? 'text-green-700' : 'text-red-700'}`}>{cpPdfUrl ? 'Cambiar Justificante' : 'Subir Justificante CP'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-kairos-navy/5 border border-kairos-navy/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <img src="https://clockify.me/assets/images/favicon.ico" className="w-4 h-4" alt="Clockify" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-kairos-navy">Sincronizar con Clockify</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSyncToClockify(!syncToClockify)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${syncToClockify ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncToClockify ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            {syncToClockify && (
                                                <div className="space-y-4">
                                                    {isLoadingProjects ? (
                                                        <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                                                            <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                                            <span>Cargando proyectos...</span>
                                                        </div>
                                                    ) : availableProjects.length > 0 ? (
                                                        <div>
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Seleccionar Proyecto</label>
                                                            <select
                                                                value={selectedProjectId}
                                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all text-sm"
                                                                required={syncToClockify}
                                                            >
                                                                <option value="">-- Elige un proyecto --</option>
                                                                {availableProjects.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-red-400 font-medium">No se encontraron proyectos.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="bulk"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => handleFileChange(e, 'csv')}
                                                ref={csvInputRef}
                                                className="hidden"
                                            />
                                            <div className="flex flex-col items-center">
                                                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                                    <FileSpreadsheet size={32} className="text-green-600" />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-700 mb-1">
                                                    {csvFile ? csvFile.name : 'Subir archivo CSV'}
                                                </h3>
                                                <p className="text-xs text-gray-400 mb-4 px-8 leading-relaxed">
                                                    El archivo debe contener las columnas: user_email, date, cv, cp, sharing, revenue, profit.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => csvInputRef.current?.click()}
                                                    className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-kairos-navy hover:bg-gray-50 transition-colors shadow-sm"
                                                >
                                                    {csvFile ? 'Cambiar Archivo' : 'Seleccionar CSV'}
                                                </button>
                                            </div>
                                        </div>

                                        {csvError && (
                                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-600">
                                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                                <p className="text-xs font-medium leading-relaxed">{csvError}</p>
                                            </div>
                                        )}

                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start space-x-3">
                                            <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Instrucciones de formato</p>
                                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                                    Exporta tu Excel a formato CSV. Usa el formato <strong>YYYY-MM-DD</strong> para fechas y asegúrate de que los emails coincidan con la whitelist.
                                                </p>
                                            </div>
                                        </div>

                                        {csvData.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Vista previa ({csvData.length} filas)</h4>
                                                </div>
                                                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                                    <table className="w-full text-[10px] text-left">
                                                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                                            <tr>
                                                                {csvHeaders.slice(0, 4).map(h => (
                                                                    <th key={h} className="px-3 py-2 font-bold uppercase tracking-tighter text-gray-500">{h}</th>
                                                                ))}
                                                                <th className="px-3 py-2 text-right">...</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {csvData.slice(0, 5).map((row, i) => (
                                                                <tr key={i} className="hover:bg-gray-50/50">
                                                                    <td className="px-3 py-2 text-gray-600 truncate max-w-[100px]">{row.user_email}</td>
                                                                    <td className="px-3 py-2 text-gray-600 font-medium">{row.date}</td>
                                                                    <td className="px-3 py-2 text-gray-600">{row.cv}</td>
                                                                    <td className="px-3 py-2 text-gray-600">{row.cp}</td>
                                                                    <td className="px-3 py-2 text-right text-gray-300">...</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isUploading || (activeTab === 'bulk' && csvData.length === 0)}
                                className={`w-full py-4 text-lg mt-2 font-bold rounded-2xl transition-all relative overflow-hidden ${(!isUploading && !(activeTab === 'bulk' && csvData.length === 0)) ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
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
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{uploadProgress < 100 ? `Importando... ${uploadProgress}%` : 'Finalizando...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            {activeTab === 'bulk' ? <FileUp size={20} /> : <CheckCircle2 size={20} />}
                                            <span>{activeTab === 'bulk' ? `Importar ${csvData.length} registros` : 'Registrar Métrica'}</span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
