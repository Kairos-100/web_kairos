import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { UploadModal } from './components/UploadModal';
import { Dashboard } from './components/Dashboard';
import { CommentSection } from './components/CommentSection';
import { BookView } from './components/BookView';
import { ScoresView } from './components/ScoresView';
import { supabase } from './lib/supabase';
import type { Essay, Comment } from './constants';
import { Search, User, Clock, ChevronRight, Tag as TagIcon, FileDown, FileText, ExternalLink, Trash2, AlertCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

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
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' // Added dummy for initial essay to satisfy mandatory rule if we were to upload it
  }
];

const App: React.FC = () => {
  const [essays, setEssays] = useState<Essay[]>(() => {
    const saved = localStorage.getItem('kairos_essays_v2_1');
    return saved ? JSON.parse(saved) : INITIAL_ESSAYS;
  });

  const [activeTab, setActiveTab] = useState('feed');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(() => {
    return localStorage.getItem('kairos_user');
  });

  useEffect(() => {
    fetchEssays();
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
        // Map DB fields to interface if necessary (snake_case to camelCase)
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

  const handleDeleteEssay = async (e: React.MouseEvent, id: string, pdfUrl?: string) => {
    e.stopPropagation(); // Don't trigger the card click

    if (!window.confirm('¿Estás seguro de que quieres borrar esta tesis? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Delete from Storage if it has a PDF
      if (pdfUrl) {
        const fileName = pdfUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('pdfs').remove([fileName]);
        }
      }

      // 2. Delete from Database
      const { error } = await supabase
        .from('essays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setEssays(prev => prev.filter(essay => essay.id !== id));
      if (selectedEssayId === id) setSelectedEssayId(null);

    } catch (err: any) {
      console.error('Error deleting essay:', err);
      alert(`Error al borrar: ${err.message}. Asegúrate de tener activas las políticas de DELETE en Supabase.`);
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

  const filteredEssays = essays.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedEssay = essays.find(e => e.id === selectedEssayId);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <Dashboard essays={essays} />;
      case 'book':
        return <BookView essays={essays} />;
      case 'score':
        return <ScoresView essays={essays} />;
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
                {filteredEssays.map((essay, index) => (
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

                        <button
                          onClick={(e) => handleEditEssay(e, essay)}
                          className="p-1 text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar Tesis"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteEssay(e, essay.id, essay.pdfUrl)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Borrar Tesis"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-heading font-bold text-kairos-navy mb-3 group-hover:text-blue-600 transition-colors">
                      {essay.title}
                    </h3>

                    <div className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2 prose prose-sm prose-slate">
                      <ReactMarkdown>{essay.content}</ReactMarkdown>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {essay.tags?.map(tag => (
                        <span key={tag} className="flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[9px] font-bold border border-gray-100">
                          <TagIcon size={8} />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-gray-500">
                          {essay.author.split('@')[0]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-xs text-gray-300 font-bold uppercase">{essay.date}</div>
                        <ChevronRight size={18} className="text-gray-200 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="reader"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex space-x-3">
                      <span className="px-4 py-1 bg-kairos-navy text-white text-xs uppercase font-bold tracking-widest rounded-full">
                        {selectedEssay?.category}
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 font-bold px-4 py-1 bg-gray-50 rounded-full">
                        <Clock size={14} />
                        <span>{selectedEssay?.pdfUrl ? 'Incluye PDF' : `Lectura de ${selectedEssay?.readingTime} min`}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {selectedEssay?.pdfUrl && (
                        <button
                          onClick={() => setShowPdf(!showPdf)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${showPdf ? 'bg-kairos-navy text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        >
                          <FileText size={16} />
                          <span>{showPdf ? 'Ocultar PDF' : 'Ver PDF Adjunto'}</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleEditEssay(e, selectedEssay!)}
                        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteEssay(e, selectedEssay!.id, selectedEssay!.pdfUrl)}
                        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                        <span>Borrar</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-kairos-navy transition-colors"
                      >
                        <FileDown size={16} />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>

                  <h1 className="text-5xl font-heading font-bold text-kairos-navy mb-8 leading-tight text-balance">
                    {selectedEssay?.title}
                  </h1>

                  <div className="flex items-center space-x-4 mb-12 py-6 border-y border-gray-50">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <User size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-kairos-navy">{selectedEssay?.author}</p>
                      <p className="text-xs text-gray-400 font-medium">Publicado el {selectedEssay?.date}</p>
                    </div>
                    {selectedEssay?.pdfUrl && !showPdf && (
                      <a
                        href={selectedEssay.pdfUrl}
                        download={`${selectedEssay.title}.pdf`}
                        className="flex items-center space-x-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <ExternalLink size={14} />
                        <span>Descargar PDF</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col space-y-8">
                    {showPdf && selectedEssay?.pdfUrl && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 600 }}
                        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50"
                      >
                        <iframe
                          src={selectedEssay.pdfUrl}
                          className="w-full h-full border-none"
                          title="PDF Tesis"
                        />
                      </motion.div>
                    )}

                    <article className="prose prose-lg prose-slate max-w-none prose-headings:font-heading prose-headings:text-kairos-navy prose-a:text-blue-600">
                      <ReactMarkdown>{selectedEssay?.content || ''}</ReactMarkdown>
                    </article>
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-50 flex flex-wrap gap-2">
                    <TagIcon size={16} className="text-gray-300" />
                    {selectedEssay?.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold border border-gray-100">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <CommentSection
                    comments={selectedEssay?.comments || []}
                    user={loggedInUser}
                    onAddComment={(text) => handleAddComment(selectedEssay!.id, text)}
                  />
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
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedEssayId(null);
      }}
      user={loggedInUser}
      onLogout={handleLogout}
      onOpenUpload={() => setIsUploadOpen(true)}
    >
      <header className="mb-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-4xl font-heading font-bold text-kairos-navy mb-2">
              {activeTab === 'feed' ? (selectedEssayId ? 'Leyendo Tesis' : 'Explorar Tesis') :
                activeTab === 'stats' ? 'Visualización de Aprendizaje' :
                  activeTab === 'score' ? 'Panel de Puntuación' : 'Biblioteca Digital'}
            </h2>
            <p className="text-gray-500 font-medium">
              {activeTab === 'feed'
                ? (selectedEssayId ? 'Profundizando en el conocimiento compartido.' : 'El conocimiento colectivo de Kairos Company en un solo lugar.')
                : activeTab === 'stats' ? 'Evolución y tendencias del conocimiento en el equipo.' :
                  activeTab === 'score' ? 'Reconocimiento y evolución de tus aportaciones.' : 'Todas las tesis consolidadas en un solo libro digital.'}
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-600 font-bold animate-pulse">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-xs uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}
          {!import.meta.env.VITE_SUPABASE_URL && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              <AlertCircle size={14} />
              <span className="text-[10px] uppercase font-bold tracking-tight">Modo Local (Sin Supabase)</span>
            </div>
          )}
          {activeTab === 'feed' && !selectedEssayId && (
            <div className="flex flex-col items-end space-y-2">
              <div className="relative w-72">
                <input
                  type="text"
                  placeholder="Buscar palabras clave, temas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pr-2">Explora entre {essays.length} tesis pubicadas</p>
            </div>
          )}
          {selectedEssayId && activeTab === 'feed' && (
            <button
              onClick={() => { setSelectedEssayId(null); setShowPdf(false); }}
              className="flex items-center space-x-2 text-kairos-navy font-bold hover:translate-x-[-4px] transition-transform"
            >
              <ChevronRight className="rotate-180" size={20} />
              <span>Volver al Feed</span>
            </button>
          )}
        </div>
      </header>

      {renderContent()}

      {
        (isUploadOpen || isEditOpen) && (
          <UploadModal
            onClose={() => {
              setIsUploadOpen(false);
              setIsEditOpen(false);
              setEditingEssay(null);
            }}
            onUpload={handleUpload}
            onSuccess={fetchEssays}
            onIdentify={(email) => {
              setLoggedInUser(email);
              localStorage.setItem('kairos_user', email);
            }}
            editEssay={editingEssay || undefined}
          />
        )
      }
    </Layout >
  );
};

export default App;
