import React, { useState, useRef } from 'react';
import { X, CheckCircle2, Search, Users, Target, Share2, DollarSign, Wallet, AlertCircle, FileUp, FileText } from 'lucide-react';
import { WHITELIST } from '../constants';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

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

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cv, setCv] = useState(0);
    const [cp, setCp] = useState(0);
    const [sharing, setSharing] = useState(0);
    const [revenue, setRevenue] = useState(0);
    const [profit, setProfit] = useState(0);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
    const [pdfName, setPdfName] = useState<string | undefined>(undefined);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfName(file.name);
            const url = URL.createObjectURL(file);
            setPdfUrl(url);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        setError('');
        setUploadProgress(0);

        try {
            let finalPdfUrl = undefined;

            if (import.meta.env.VITE_SUPABASE_URL && pdfFile) {
                const sanitizedName = pdfFile.name
                    .replace(/[^\x00-\x7F]/g, "")
                    .replace(/[^a-zA-Z0-9.-]/g, "_")
                    .replace(/_{2,}/g, "_");

                const fileName = `metrics/${Date.now()}-${sanitizedName}`;
                const { error: storageError } = await supabase.storage
                    .from('pdfs')
                    .upload(fileName, pdfFile, {
                        upsert: true,
                        onUploadProgress: (progress: any) => {
                            if (progress.total && progress.total > 0) {
                                const percent = (progress.loaded / progress.total) * 100;
                                setUploadProgress(Math.min(99, Math.round(percent)));
                            }
                        }
                    } as any);

                if (storageError) throw storageError;

                const { data: { publicUrl } } = supabase.storage
                    .from('pdfs')
                    .getPublicUrl(fileName);

                finalPdfUrl = publicUrl;
            }

            const { error: dbError } = await supabase
                .from('metrics')
                .insert([{
                    user_email: email,
                    date,
                    cv,
                    cp,
                    sharing,
                    revenue,
                    profit,
                    pdf_url: finalPdfUrl
                }]);

            if (dbError) throw dbError;

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error uploading metrics:', err);
            setError(`Error al guardar: ${err.message}`);
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
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between mb-2">
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

                            <div className="grid grid-cols-2 gap-6">
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
                                <div>
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

                            <div className={`p-6 rounded-2xl border border-dashed transition-all ${pdfUrl ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/50 border-blue-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[10px] text-blue-600">
                                        <span>Adjuntar PDF Justificante (Opcional)</span>
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
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isUploading}
                                className={`w-full py-4 text-lg mt-4 font-bold rounded-2xl transition-all relative overflow-hidden ${!isUploading ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                            >
                                {isUploading && (
                                    <div
                                        className="absolute inset-0 bg-blue-600/20 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                )}
                                <span className="relative z-10">
                                    {isUploading ? (uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Guardando...') : 'Registrar Métricas'}
                                </span>
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
