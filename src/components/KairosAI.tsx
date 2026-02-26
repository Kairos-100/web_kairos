import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Sparkles, Key, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAiResponse, generateDashboardSummary } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import type { Essay, MetricEntry } from '../constants';
import type { ClockifyUserTime, ClockifyProjectSummary } from '../lib/clockify';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

interface KairosAIProps {
    essays: Essay[];
    metrics: MetricEntry[];
    clockifyData?: {
        users: ClockifyUserTime[];
        projects: ClockifyProjectSummary[];
        totalTime: number;
    } | null;
}

export const KairosAI: React.FC<KairosAIProps> = ({ essays, metrics, clockifyData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem('kairos_openai_key') || import.meta.env.VITE_OPENAI_API_KEY || '';
    });
    const [showKeyInput, setShowKeyInput] = useState(() => {
        const key = localStorage.getItem('kairos_openai_key') || import.meta.env.VITE_OPENAI_API_KEY || '';
        return !key;
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            localStorage.setItem('kairos_openai_key', apiKey.trim());
            setShowKeyInput(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const summary = generateDashboardSummary(essays, metrics, clockifyData);
            const response = await generateAiResponse(userMessage, apiKey, summary);
            setMessages(prev => [...prev, { role: 'ai', content: response }]);
        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMsg = error.message || 'Error desconocido';
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `Lo siento, ha ocurrido un error: **${errorMsg}**. \n\nPor favor, verifica que tu API Key sea correcta y que hayas pulsado el botón "Indexar Conocimiento" arriba.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-[2rem] w-[400px] h-[600px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-gray-100 flex flex-col mb-4"
                    >
                        {/* Header */}
                        <div className="bg-kairos-navy p-6 flex justify-between items-center bg-gradient-to-br from-kairos-navy via-kairos-navy to-blue-900 shrink-0">
                            <div className="flex items-center space-x-3 text-white">
                                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md shadow-inner">
                                    <Bot size={24} className="text-blue-200" />
                                </div>
                                <div>
                                    <h3 className="font-heading font-bold text-lg leading-tight">Kairos AI</h3>
                                    <div className="flex items-center space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        <p className="text-[9px] text-blue-200 uppercase tracking-[0.1em] font-bold">Insight Engine Online</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar">
                            {showKeyInput ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-5 p-4">
                                    <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 shadow-sm">
                                        <Key size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-heading font-bold text-kairos-navy text-lg">Configuración de IA</h4>
                                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                            Para acceder al conocimiento de Kairos, conecta tu API Key de OpenAI.
                                            {import.meta.env.VITE_OPENAI_API_KEY ? " (Detectada en servidor)" : " (No detectada en servidor)"}
                                        </p>
                                    </div>
                                    <form onSubmit={handleSaveKey} className="w-full space-y-3">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="OpenAI API Key (sk-...)"
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-kairos-navy outline-none transition-all shadow-sm"
                                            required
                                        />
                                        <button type="submit" className="w-full btn-primary py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/10">Guardar Localmente</button>
                                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] text-blue-600 font-bold uppercase hover:underline tracking-wider">¿No tienes una? Consíguela aquí</a>
                                    </form>
                                    <div className="pt-4 border-t border-gray-100 w-full">
                                        <p className="text-[10px] text-gray-400 font-medium leading-tight">
                                            <b>Nota:</b> Si estás en producción (Vercel), añade <code>VITE_OPENAI_API_KEY</code> en los Ajustes de Vercel para que se guarde de forma permanente para todo el equipo.
                                        </p>
                                    </div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 p-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 rounded-full scale-150 animate-pulse"></div>
                                        <Bot size={64} className="text-kairos-navy/20 relative" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-kairos-navy opacity-80 uppercase tracking-widest">¿En qué puedo ayudarte?</p>
                                        <p className="text-xs text-gray-400 mt-3 leading-relaxed max-w-[200px]">Pregúntame sobre tesis, métricas comerciales o actividad del equipo.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 w-full">
                                        {['¿Qué documentos hay sobre IA?', 'Resumen de métricas este mes', '¿Quién ha subido más tesis?'].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => { setInput(suggestion); }}
                                                className="text-[10px] text-left p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:border-blue-200 hover:text-blue-600 transition-all font-medium"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((m, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={i}
                                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${m.role === 'user'
                                                ? 'bg-kairos-navy text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                                }`}>
                                                <div className="flex items-center space-x-2 mb-1.5">
                                                    {m.role === 'user' ? <User size={12} className="opacity-60" /> : <Bot size={12} className="text-blue-500" />}
                                                    <span className="text-[9px] uppercase font-bold tracking-[0.1em] opacity-60">
                                                        {m.role === 'user' ? 'Propulsor' : 'Kairos Engine'}
                                                    </span>
                                                </div>
                                                <div className="prose prose-sm prose-slate max-w-none text-xs leading-relaxed prose-p:my-1 prose-headings:text-sm prose-headings:font-bold prose-headings:text-inherit prose-strong:text-inherit">
                                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isLoading && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center space-x-3">
                                                <div className="flex space-x-1.5">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consultando Neuronas...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        {!showKeyInput && (
                            <div className="p-5 bg-white border-t border-gray-50 shrink-0">
                                <form onSubmit={handleSend} className="relative">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Haz una pregunta técnica o de negocio..."
                                        disabled={isLoading}
                                        className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-kairos-navy outline-none transition-all placeholder:text-gray-400 shadow-inner"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading || !input.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-kairos-navy text-white rounded-xl hover:bg-blue-900 transition-all disabled:opacity-30 shadow-md shadow-blue-900/20"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                                <div className="flex items-center justify-between mt-3 px-1">
                                    <button
                                        onClick={() => setShowKeyInput(true)}
                                        className="flex items-center space-x-1.5 text-[9px] text-gray-400 hover:text-kairos-navy transition-colors font-bold uppercase tracking-wider"
                                    >
                                        <Key size={11} className="opacity-50" />
                                        <span>Key: {apiKey ? '••••' + apiKey.slice(-4) : 'No configurada'}</span>
                                    </button>
                                    <div className="flex items-center space-x-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                        <Sparkles size={11} className="text-blue-500" />
                                        <span>RAG Pipeline v1</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center transition-all ${isOpen
                    ? 'bg-white text-kairos-navy ring-4 ring-kairos-navy/5 rotate-0'
                    : 'bg-kairos-navy text-white hover:bg-blue-900'
                    }`}
            >
                {isOpen ? <X size={28} /> : (
                    <div className="relative">
                        <MessageSquare size={30} className="fill-white/10" />
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-kairos-navy animate-pulse"></div>
                    </div>
                )}
            </motion.button>
        </div>
    );
};
