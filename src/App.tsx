import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { UploadModal } from './components/UploadModal';
import { MetricsModal } from './components/MetricsModal';
import { Dashboard } from './components/Dashboard';
import { MetricsView } from './components/MetricsView';
import { CommentSection } from './components/CommentSection';
import { BookView } from './components/BookView';
import { ScoresView } from './components/ScoresView';
import { ActivityView } from './components/ActivityView';
import { TeamView } from './components/TeamView';
import { supabase } from './lib/supabase';
import type { Essay, Comment, MetricEntry } from './constants';
import { Search, User, Clock, ChevronRight, Tag as TagIcon, FileDown, FileText, Trash2, AlertCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { DateRangePicker, type DateRange } from './components/DateRangePicker';

const INITIAL_ESSAYS: Essay[] = [
  {
    id: '1',
    title: 'Impacto de la IA en la Comunicación Corporativa',
    author: 'jaime.gonzalez@alumni.mondragon.edu',
    category: 'Tecnología',
    content: '**En este ensayo analizamos cómo los modelos de lenguaje están transformando la redacción técnica.**\n\nLa IA no reemplaza al humano, sino que potencia su capacidad estratégica. Hemos visto incrementos en la productividad del 40% en redacción de borradores.',
    date: '15/2/2024',
    tags: ['IA', 'Productividad', 'Futuro'],
    readingTime: 4,
    comments: [],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

const App: React.FC = () => {
  const [essays, setEssays] = useState<Essay[]>(() => {
    const saved = localStorage.getItem('kairos_essays_v2_1');
    return saved ? JSON.parse(saved) : INITIAL_ESSAYS;
  });

  const [activeTab, setActiveTab] = useState('feed');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  });
  const [loggedInUser, setLoggedInUser] = useState<string | null>(() => {
    return localStorage.getItem('kairos_user');
  });

  useEffect(() => {
    fetchEssays();
    fetchMetrics();
  }, []);

  const fetchEssays = async () => {
    const hasConfig = import.meta.env.VITE_SUPABASE_URL;
    if (!hasConfig) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('essays')
        .select('*, comments(*)');

      if (error) throw error;
      if (data) {
        const mappedData = data.map((e: any) => ({
          ...e,
          readingTime: e.reading_time,
          pdfUrl: e.pdf_url
        }));
        setEssays(mappedData);
      }
    } catch (err) {
      console.error('Error fetching essays from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const hasConfig = import.meta.env.VITE_SUPABASE_URL;
    if (!hasConfig) return;

    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics from Supabase:', err);
    }
  };

  const handleDeleteEssay = async (e: React.MouseEvent, id: string, pdfUrl?: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que quieres borrar esta tesis?')) return;
    setIsLoading(true);
    try {
      if (pdfUrl) {
        const fileName = pdfUrl.split('/').pop();
        if (fileName) await supabase.storage.from('pdfs').remove([fileName]);
      }
      const { error } = await supabase.from('essays').delete().eq('id', id);
      if (error) throw error;
      setEssays(prev => prev.filter(essay => essay.id !== id));
      if (selectedEssayId === id) setSelectedEssayId(null);
    } catch (err: any) {
      console.error('Error deleting essay:', err);
      alert(`Error al borrar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEssay = (e: React.MouseEvent, essay: Essay) => {
    e.stopPropagation();
    setEditingEssay(essay);
    setIsEditOpen(true);
  };

  useEffect(() => {
    if (essays.length > 0 && !import.meta.env.VITE_SUPABASE_URL) {
      localStorage.setItem('kairos_essays_v2_1', JSON.stringify(essays));
    }
  }, [essays]);

  const calculateReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length || 0;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const handleUpload = (essayData: Omit<Essay, 'id' | 'date' | 'comments' | 'readingTime'>) => {
    const newEssay: Essay = {
      ...essayData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('es-ES'),
      readingTime: calculateReadingTime(essayData.content),
      comments: []
    };
    setEssays([newEssay, ...essays]);
    setLoggedInUser(essayData.author);
    localStorage.setItem('kairos_user', essayData.author);
    setSelectedEssayId(newEssay.id);
    setShowPdf(true);
  };

  const handleAddComment = (essayId: string, text: string) => {
    if (!loggedInUser) return;
    setEssays(prev => prev.map(e => {
      if (e.id === essayId) {
        const newComment: Comment = {
          id: Math.random().toString(36).substr(2, 9),
          author: loggedInUser,
          text,
          date: new Date().toLocaleDateString('es-ES')
        };
        return { ...e, comments: [...e.comments, newComment] };
      }
      return e;
    }));
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('kairos_user');
  };

  const selectedEssay = essays.find(e => e.id === selectedEssayId);

  const parseDDMMYYYY = (str: string) => {
    if (!str) return new Date(0);
    let date: Date;
    if (str.includes('-')) {
      // ISO format YYYY-MM-DD
      date = new Date(str);
    } else {
      // Standard format DD/MM/YYYY
      const [d, m, y] = str.split('/').map(Number);
      date = new Date(y, m - 1, d);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      const d = parseDDMMYYYY(m.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [metrics, dateRange]);

  const filteredByDateEssays = useMemo(() => {
    return essays.filter(e => {
      const d = parseDDMMYYYY(e.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [essays, dateRange]);

  const filteredEssaysList = useMemo(() => {
    return filteredByDateEssays.filter((e: Essay) =>
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tags?.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [filteredByDateEssays, searchTerm]);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <Dashboard essays={filteredByDateEssays} />;
      case 'commercial':
        return <MetricsView metrics={filteredMetrics} essays={filteredByDateEssays} />;
      case 'book':
        return <BookView essays={filteredByDateEssays} />;
      case 'score':
        return <ScoresView essays={filteredByDateEssays} />;
      case 'history':
        return <ActivityView essays={filteredByDateEssays} metrics={filteredMetrics} />;
      case 'team':
        return <TeamView essays={filteredByDateEssays} metrics={filteredMetrics} />;
      default:
        return (
          <AnimatePresence mode="wait">
            {!selectedEssayId ? (
              <motion.div
                key="feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredEssaysList.map((essay: Essay, index: number) => (
                  <motion.div
                    layout
                    key={essay.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedEssayId(essay.id);
                      if (essay.pdfUrl) setShowPdf(true);
                    }}
                    className="card flex flex-col group cursor-pointer border-transparent hover:border-blue-100 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-kairos-navy text-white text-[10px] uppercase font-bold tracking-widest rounded-full">
                        {essay.category}
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium">
                        {essay.pdfUrl ? <FileText size={12} className="text-blue-500" /> : <Clock size={12} />}
                        <span>{essay.pdfUrl ? 'PDF Adjunto' : `${essay.readingTime} min`}</span>
                        <button onClick={(e) => handleEditEssay(e, essay)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={12} /></button>
                        <button onClick={(e) => handleDeleteEssay(e, essay.id, essay.pdfUrl)} className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <h3 className="text-xl font-heading font-bold text-kairos-navy mb-3 group-hover:text-blue-600 transition-colors">{essay.title}</h3>
                    <div className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2 prose prose-sm prose-slate"><ReactMarkdown>{essay.content}</ReactMarkdown></div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {essay.tags?.map(tag => (
                        <span key={tag} className="flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[9px] font-bold border border-gray-100"><TagIcon size={8} /><span>{tag}</span></span>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2"><User size={14} className="text-blue-600" /><span className="text-xs font-bold text-gray-500">{essay.author.split('@')[0]}</span></div>
                      <div className="flex items-center space-x-3"><div className="text-xs text-gray-300 font-bold uppercase">{essay.date}</div><ChevronRight size={18} className="text-gray-200 group-hover:text-blue-600 transition-colors" /></div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="reader" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex space-x-3">
                      <span className="px-4 py-1 bg-kairos-navy text-white text-xs uppercase font-bold tracking-widest rounded-full">{selectedEssay?.category}</span>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 font-bold px-4 py-1 bg-gray-50 rounded-full"><Clock size={14} /><span>{selectedEssay?.pdfUrl ? 'Incluye PDF' : `Lectura de ${selectedEssay?.readingTime} min`}</span></div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {selectedEssay?.pdfUrl && <button onClick={() => setShowPdf(!showPdf)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${showPdf ? 'bg-kairos-navy text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><FileText size={16} /><span>{showPdf ? 'Ocultar PDF' : 'Ver PDF Adjunto'}</span></button>}
                      <button onClick={(e) => handleEditEssay(e, selectedEssay!)} className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"><Edit3 size={16} /><span>Editar</span></button>
                      <button onClick={(e) => handleDeleteEssay(e, selectedEssay!.id, selectedEssay!.pdfUrl)} className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /><span>Borrar</span></button>
                      <button onClick={() => window.print()} className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-kairos-navy transition-colors"><FileDown size={16} /><span>Imprimir</span></button>
                    </div>
                  </div>
                  <h1 className="text-5xl font-heading font-bold text-kairos-navy mb-8 leading-tight text-balance">{selectedEssay?.title}</h1>
                  <div className="flex items-center space-x-4 mb-12 py-6 border-y border-gray-50"><div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100"><User size={24} className="text-blue-600" /></div><div className="flex-1"><p className="text-sm font-bold text-kairos-navy">{selectedEssay?.author}</p><p className="text-xs text-gray-400 font-medium">Publicado el {selectedEssay?.date}</p></div></div>
                  <div className="flex flex-col space-y-8">
                    {showPdf && selectedEssay?.pdfUrl && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 600 }} className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50"><iframe src={selectedEssay.pdfUrl} className="w-full h-full border-none" title="PDF Tesis" /></motion.div>}
                    <article className="prose prose-lg prose-slate max-w-none prose-headings:font-heading prose-headings:text-kairos-navy prose-a:text-blue-600"><ReactMarkdown>{selectedEssay?.content || ''}</ReactMarkdown></article>
                  </div>
                  <div className="mt-12 pt-8 border-t border-gray-50 flex flex-wrap gap-2"><TagIcon size={16} className="text-gray-300" />{selectedEssay?.tags?.map(tag => <span key={tag} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold border border-gray-100">#{tag}</span>)}</div>
                  <CommentSection comments={selectedEssay?.comments || []} user={loggedInUser} onAddComment={(text) => handleAddComment(selectedEssay!.id, text)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => { setActiveTab(tab); setSelectedEssayId(null); }}
      user={loggedInUser}
      onLogout={handleLogout}
      onOpenUpload={() => setIsUploadOpen(true)}
      onOpenMetrics={() => setIsMetricsModalOpen(true)}
    >
      <header className="mb-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-4xl font-heading font-bold text-kairos-navy mb-2">
              {activeTab === 'feed' ? (selectedEssayId ? 'Leyendo Tesis' : 'Explorar Tesis') :
                activeTab === 'stats' ? 'Visualización de Aprendizaje' :
                  activeTab === 'commercial' ? 'Kairos Métricas' :
                    activeTab === 'history' ? 'Historial de Actividad' :
                      activeTab === 'team' ? 'Miembros del Equipo' :
                        activeTab === 'score' ? 'Panel de Puntuación' : 'Biblioteca Digital'}
            </h2>
            <p className="text-gray-500 font-medium">
              {activeTab === 'feed' ? (selectedEssayId ? 'Profundizando en el conocimiento compartido.' : 'El conocimiento colectivo de Kairos Company en un solo lugar.') :
                activeTab === 'stats' ? 'Evolución y tendencias del conocimiento en el equipo.' :
                  activeTab === 'commercial' ? 'Seguimiento de actividad comercial y financiera.' :
                    activeTab === 'history' ? 'Registro detallado de todas las aportaciones y métricas.' :
                      activeTab === 'team' ? 'Actividad detallada de cada integrante de Kairos.' :
                        activeTab === 'score' ? 'Reconocimiento y evolución de tus aportaciones.' : 'Todas las tesis consolidadas en un solo libro digital.'}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <DateRangePicker range={dateRange} onChange={setDateRange} />
            {isLoading && <div className="flex items-center space-x-2 text-blue-600 font-bold animate-pulse text-right"><div className="w-2 h-2 bg-blue-600 rounded-full"></div><span className="text-[10px] uppercase tracking-widest">Sincronizando...</span></div>}
          </div>
          {!import.meta.env.VITE_SUPABASE_URL && <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100"><AlertCircle size={14} /><span className="text-[10px] uppercase font-bold tracking-tight">Modo Local (Sin Supabase)</span></div>}
          {activeTab === 'feed' && !selectedEssayId && (
            <div className="flex flex-col items-end space-y-2">
              <div className="relative w-72"><input type="text" placeholder="Buscar palabras clave, temas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all shadow-sm" /><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /></div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pr-2">Mostrando resultados para el rango seleccionado</p>
            </div>
          )}
          {selectedEssayId && activeTab === 'feed' && <button onClick={() => { setSelectedEssayId(null); setShowPdf(false); }} className="flex items-center space-x-2 text-kairos-navy font-bold hover:translate-x-[-4px] transition-transform"><ChevronRight className="rotate-180" size={20} /><span>Volver al Feed</span></button>}
        </div>
      </header>
      {renderContent()}
      {(isUploadOpen || isEditOpen) && <UploadModal onClose={() => { setIsUploadOpen(false); setIsEditOpen(false); setEditingEssay(null); }} onUpload={handleUpload} onSuccess={fetchEssays} onIdentify={(email) => { setLoggedInUser(email); localStorage.setItem('kairos_user', email); }} editEssay={editingEssay || undefined} />}
      {isMetricsModalOpen && <MetricsModal onClose={() => setIsMetricsModalOpen(false)} onSuccess={fetchMetrics} onIdentify={(email) => { setLoggedInUser(email); localStorage.setItem('kairos_user', email); }} />}
    </Layout>
  );
};

export default App;
