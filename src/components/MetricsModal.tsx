import React, { useState, useRef } from 'react';
import { X, Users, Target, Share2, DollarSign, Wallet, FileUp, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { WHITELIST } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase.js';
import { ingestDocument } from '../lib/ai';
import { notifyNewMetric } from '../lib/notifications';
import { parseCSV, validateMetricCSV } from '../utils/csv';

interface MetricsModalProps {
    onClose: () => void;
    onSuccess?: () => void;
    onIdentify?: (email: string) => void;
    userEmail?: string;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({ onClose, onSuccess, onIdentify, userEmail }) => {
    const [email, setEmail] = useState(userEmail || '');
    const [isAuth, setIsAuth] = useState(!!userEmail && WHITELIST.some(w => w.toLowerCase() === userEmail.toLowerCase()));
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSyncingHolded, setIsSyncingHolded] = useState(false);

    // CSV Import states
    const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cp, setCp] = useState(0);
    const [sharing, setSharing] = useState(0);
    const [revenue, setRevenue] = useState(0);
    const [profit, setProfit] = useState(0);

    // Metadata states
    const [cvTitle, setCvTitle] = useState('');
    const [cvDescription, setCvDescription] = useState('');
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

    const sharingInputRef = useRef<HTMLInputElement>(null);
    const cpInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const fetchExistingMetrics = async () => {
            if (!isAuth || !email || !date || activeTab === 'bulk') return;

            try {
                const { data, error } = await supabase
                    .from('metrics')
                    .select('*')
                    .eq('user_email', email.toLowerCase())
                    .eq('date', date);

                if (error) {
                    console.error('Error fetching existing metrics:', error);
                    return;
                }
                if (data && data.length > 0) {
                    const aggregated = data.reduce((acc: any, curr: any) => ({
                        cp: acc.cp + (curr.cp || 0),
                        sharing: acc.sharing + (curr.sharing || 0),
                        revenue: acc.revenue + (curr.revenue || 0),
                        profit: acc.profit + (curr.profit || 0),
                        cv_title: curr.cv_title || acc.cv_title,
                        cv_description: curr.cv_description || acc.cv_description,
                        cv_pdf_url: curr.cv_pdf_url || acc.cv_pdf_url,
                        cp_title: curr.cp_title || acc.cp_title,
                        cp_description: curr.cp_description || acc.cp_description,
                        cp_pdf_url: curr.cp_pdf_url || acc.cp_pdf_url,
                    }), { cp: 0, sharing: 0, revenue: 0, profit: 0, cv_title: '', cv_description: '', cv_pdf_url: '', cp_title: '', cp_description: '', cp_pdf_url: '' });

                    setCp(Math.min(3, aggregated.cp));
                    setSharing(aggregated.sharing);
                    setRevenue(aggregated.revenue);
                    setProfit(aggregated.profit);
                    setCvTitle(aggregated.cv_title || '');
                    setCvDescription(aggregated.cv_description || '');
                    setCvPdfUrl(aggregated.cv_pdf_url || undefined);
                    setCvPdfName(aggregated.cv_pdf_url ? 'PDF Existente' : undefined);
                    setCpTitle(aggregated.cp_title || '');
                    setCpDescription(aggregated.cp_description || '');
                    setCpPdfUrl(aggregated.cp_pdf_url || undefined);
                    setCpPdfName(aggregated.cp_pdf_url ? 'PDF Existente' : undefined);
                } else {
                    setCp(0);
                    setSharing(0);
                    setRevenue(0);
                    setProfit(0);
                    setCvTitle('');
                    setCvDescription('');
                    setCvPdfUrl(undefined);
                    setCvPdfName(undefined);
                    setCpTitle('');
                    setCpDescription('');
                    setCpPdfUrl(undefined);
                    setCpPdfName(undefined);
                }
            } catch (err) {
                console.error('Exception fetching existing metrics:', err);
            }
        };

        fetchExistingMetrics();
    }, [isAuth, email, date, activeTab]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cv' | 'sharing' | 'cp' | 'csv') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'csv') {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                setError('Por favor, selecciona un archivo CSV válido.');
                return;
            }
            setCsvFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                try {
                    const { data } = parseCSV(text);
                    const errors = validateMetricCSV(data);
                    if (errors.length === 0) {
                        setCsvData(data);
                    }
                } catch (err) {
                    console.error('Error al procesar el archivo CSV.');
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
                setSharing(prev => prev + 1);
            } else if (type === 'cp') {
                setCpPdfFile(file);
                setCpPdfName(file.name);
                setCpPdfUrl(url);
            }
            return () => URL.revokeObjectURL(url);
        }
    };

    const clearCv = () => {
        setCvTitle('');
        setCvDescription('');
        setCvPdfFile(null);
        setCvPdfName(undefined);
        setCvPdfUrl(undefined);
    };

    const clearSharing = () => {
        setSharing(0);
        setSharingPdfFile(null);
        setSharingPdfName(undefined);
        setSharingPdfUrl(undefined);
    };

    const clearAll = () => {
        setCp(0);
        clearCv();
        clearSharing();
        setRevenue(0);
        setProfit(0);
        setCpTitle('');
        setCpDescription('');
        setCpPdfFile(null);
        setCpPdfName(undefined);
        setCpPdfUrl(undefined);
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
        const sanitizedName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `metrics/${prefix}-${Date.now()}-${sanitizedName}`;
        const { error: storageError } = await supabase.storage.from('pdfs').upload(fileName, file);
        if (storageError) throw storageError;
        const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);
        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            if (activeTab === 'bulk') {
                const recordsToInsert = csvData.map(row => ({
                    user_email: row.user_email,
                    date: row.date,
                    cv: parseInt(row.cv) > 0 ? 1 : 0,
                    cp: Math.min(3, Math.max(0, parseInt(row.cp) || 0)),
                    sharing: parseInt(row.sharing) || 0,
                    revenue: parseFloat(row.revenue) || 0,
                    profit: parseFloat(row.profit) || 0
                }));
                const { error: dbError } = await supabase.from('metrics').insert(recordsToInsert);
                if (dbError) throw dbError;
            } else {
                let finalCvUrl = cvPdfUrl;
                let finalSharingUrl = sharingPdfUrl;
                let finalCpUrl = cpPdfUrl;

                if (cvPdfFile) finalCvUrl = await uploadToSupabase(cvPdfFile, 'cv');
                if (sharingPdfFile) finalSharingUrl = await uploadToSupabase(sharingPdfFile, 'sharing');
                if (cpPdfFile) finalCpUrl = await uploadToSupabase(cpPdfFile, 'cp');

                const { data: newData, error: dbError } = await supabase.from('metrics').insert([{
                    user_email: email.toLowerCase(),
                    date,
                    cv: cvPdfFile || cvPdfUrl ? 1 : 0,
                    cp,
                    sharing,
                    revenue,
                    profit,
                    cv_pdf_url: finalCvUrl,
                    sharing_pdf_url: finalSharingUrl,
                    cp_pdf_url: finalCpUrl,
                    cv_title: cvTitle,
                    cv_description: cvDescription,
                    cp_title: cpTitle,
                    cp_description: cpDescription
                }]).select();

                if (dbError) throw dbError;

                if (newData?.[0]) {
                    const metricId = newData[0].id;
                    if (finalCvUrl) ingestDocument(metricId, 'metric', finalCvUrl).catch(console.error);
                    if (finalSharingUrl) ingestDocument(metricId, 'metric', finalSharingUrl).catch(console.error);
                    if (finalCpUrl) ingestDocument(metricId, 'metric', finalCpUrl).catch(console.error);
                    await notifyNewMetric(newData[0]).catch(console.error);
                }
            }
            if (onSuccess) onSuccess();
            onClose();
        } finally {
            setIsUploading(false);
        }
    };

    const handleSyncHolded = async () => {
        setIsSyncingHolded(true);
        setError('');
        try {
            const { data, error } = await supabase.functions.invoke('sync-holded-projects');
            if (error) throw error;
            console.log('Sync Holded Response:', data);
            alert('Sincronización con Holded completada con éxito.');
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Error syncing Holded:', err);
            setError(`Error al sincronizar Holded: ${err.message || 'Error desconocido'}`);
        } finally {
            setIsSyncingHolded(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-kairos-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-kairos-navy">{isAuth ? 'Registrar Métricas' : 'Identificación'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-400" /></button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {!isAuth ? (
                        <form onSubmit={handleAuth} className="space-y-6 max-w-md mx-auto">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Email Institucional</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
                                {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
                            </div>
                            <button type="submit" className="w-full btn-primary py-4">Verificar Acceso</button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button onClick={() => setActiveTab('individual')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'individual' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Individual</button>
                                <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'bulk' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Importación Masiva</button>
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === 'individual' ? (
                                    <motion.div key="individual" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                                        <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-black text-blue-400 tracking-tighter">Colaborador</span>
                                                <span className="text-xs font-bold text-blue-600 truncate max-w-[150px]">{email}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button 
                                                    type="button" 
                                                    onClick={handleSyncHolded} 
                                                    disabled={isSyncingHolded}
                                                    className={`text-[10px] font-bold px-3 py-1 rounded-lg shadow-sm border transition-all flex items-center space-x-1 ${isSyncingHolded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                                >
                                                    <TrendingUp size={12} />
                                                    <span>{isSyncingHolded ? 'Sincronizando...' : 'Sincronizar Holded'}</span>
                                                </button>
                                                <button type="button" onClick={clearAll} className="text-[10px] font-bold text-blue-600 bg-white px-3 py-1 rounded-lg shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors">Nuevo Registro</button>
                                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white border rounded-lg px-2 py-1 text-xs font-bold text-kairos-navy outline-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 mb-2">
                                                    <Users size={14} className="text-blue-500" /> <span>CV (Customer Visit)</span>
                                                </label>
                                                <div className="bg-gray-50 border rounded-xl px-4 py-3 flex justify-between items-center">
                                                    <span className="font-bold text-blue-600">1</span>
                                                    <span className="text-[10px] text-gray-400 uppercase">Fijo por Registro</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 mb-2">
                                                    <Target size={14} className="text-red-500" /> <span>CP (Community Points)</span>
                                                </label>
                                                <div className="flex space-x-2">
                                                    {[1, 2, 3].map(v => (
                                                        <button key={v} type="button" onClick={() => setCp(v)} className={`flex-1 py-2 rounded-lg border font-bold ${cp === v ? 'bg-red-500 text-white border-red-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{v}</button>
                                                    ))}
                                                    <button type="button" onClick={() => setCp(0)} className="px-2 text-[10px] text-gray-400 hover:text-red-500 transition-colors">Limpiar</button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 mb-2">
                                                    <Share2 size={14} className="text-purple-500" /> <span>Sharings</span>
                                                </label>
                                                <input type="number" value={sharing} onChange={(e) => setSharing(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" min="0" />
                                            </div>

                                            <div>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 mb-2">
                                                    <DollarSign size={14} className="text-green-600" /> <span>Facturación (€)</span>
                                                </label>
                                                <input type="number" value={revenue} onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" step="0.01" />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 mb-2">
                                                    <Wallet size={14} className="text-emerald-600" /> <span>Beneficio (€)</span>
                                                </label>
                                                <input type="number" value={profit} onChange={(e) => setProfit(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" step="0.01" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className={`p-4 rounded-xl border-2 border-dashed ${cvPdfUrl ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase">Justificante CV</p>
                                                    <button type="button" onClick={clearCv} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Limpiar</button>
                                                </div>
                                                <div className="mb-3 space-y-2">
                                                    <input type="text" value={cvTitle} onChange={(e) => setCvTitle(e.target.value)} placeholder="Título de la reunión" className="w-full px-3 py-2 text-xs border rounded-lg" />
                                                    <textarea value={cvDescription} onChange={(e) => setCvDescription(e.target.value)} placeholder="¿Cómo ayuda a tu proyecto?" className="w-full px-3 py-2 text-xs border rounded-lg h-16" />
                                                </div>
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'cv')} ref={cvInputRef} className="hidden" />
                                                <button type="button" onClick={() => cvInputRef.current?.click()} className="w-full py-2 bg-white rounded-lg border flex items-center justify-center space-x-2 text-xs font-bold">
                                                    <FileUp size={14} /> <span>{cvPdfName ? 'Cambiar PDF' : 'Subir PDF'}</span>
                                                </button>
                                            </div>

                                            <div className={`p-4 rounded-xl border-2 border-dashed ${sharingPdfUrl ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] font-bold text-purple-600 uppercase">Justificante Sharing</p>
                                                    <button type="button" onClick={clearSharing} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Limpiar</button>
                                                </div>
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'sharing')} ref={sharingInputRef} className="hidden" />
                                                <button type="button" onClick={() => sharingInputRef.current?.click()} className="w-full py-2 bg-white rounded-lg border flex items-center justify-center space-x-2 text-xs font-bold">
                                                    <FileUp size={14} /> <span>{sharingPdfName ? 'Cambiar PDF' : 'Subir PDF'}</span>
                                                </button>
                                            </div>

                                            <div className={`p-4 rounded-xl border-2 border-dashed md:col-span-2 ${cpPdfUrl ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                <p className="text-[10px] font-bold text-red-600 uppercase mb-2">Justificante CP</p>
                                                {cp > 0 && (
                                                    <div className="mb-3 space-y-2">
                                                        <input type="text" value={cpTitle} onChange={(e) => setCpTitle(e.target.value)} placeholder="Título CP" className="w-full px-3 py-2 text-xs border rounded-lg" />
                                                        <textarea value={cpDescription} onChange={(e) => setCpDescription(e.target.value)} placeholder="Descripción" className="w-full px-3 py-2 text-xs border rounded-lg h-16" />
                                                    </div>
                                                )}
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'cp')} ref={cpInputRef} className="hidden" />
                                                <button type="button" onClick={() => cpInputRef.current?.click()} className="w-full py-2 bg-white rounded-lg border flex items-center justify-center space-x-2 text-xs font-bold">
                                                    <FileUp size={14} /> <span>{cpPdfName ? 'Cambiar PDF' : 'Subir PDF'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={handleSubmit} disabled={isUploading} className="w-full btn-primary py-4 text-lg">
                                            {isUploading ? 'Guardando...' : 'Guardar Métricas'}
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div key="bulk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                        <div className="p-12 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50 text-center">
                                            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'csv')} ref={csvInputRef} className="hidden" />
                                            <div className="flex flex-col items-center">
                                                <FileSpreadsheet size={48} className="text-green-600 mb-4" />
                                                <h3 className="font-bold text-gray-700">{csvFile ? csvFile.name : 'Importación Masiva (CSV)'}</h3>
                                                <p className="text-xs text-gray-400 mt-2 mb-6">Columnas: user_email, date, cv, cp, sharing, revenue, profit</p>
                                                <button onClick={() => csvInputRef.current?.click()} className="btn-primary px-8 py-3">Seleccionar Archivo</button>
                                            </div>
                                        </div>
                                        {csvData.length > 0 && (
                                            <button onClick={handleSubmit} disabled={isUploading} className="w-full btn-primary py-4">
                                                {isUploading ? 'Importando...' : `Importar ${csvData.length} registros`}
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
