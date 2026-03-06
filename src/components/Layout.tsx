import React from 'react';
import { BookOpen, BarChart3, Library, PlusCircle, LogOut, Trophy, TrendingUp, History, Users, Menu, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: string | null;
    onLogout: () => void;
    onOpenUpload: () => void;
    onOpenMetrics: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
    children,
    activeTab,
    setActiveTab,
    user,
    onLogout,
    onOpenUpload,
    onOpenMetrics
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isActionExpanded, setIsActionExpanded] = React.useState(false);

    const navGroups = [
        {
            title: 'Conocimiento',
            items: [
                { id: 'feed', label: 'Explorar', icon: BookOpen },
                { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
                { id: 'book', label: 'Biblioteca', icon: Library },
            ]
        },
        {
            title: 'Actividad y Métricas',
            items: [
                { id: 'team', label: 'Miembros', icon: Users },
                { id: 'commercial', label: 'Kairos Métricas', icon: TrendingUp },
                { id: 'score', label: 'Puntuación', icon: Trophy },
                { id: 'history', label: 'Historial', icon: History },
            ]
        }
    ];

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-kairos-light font-body transition-all duration-300">
            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-kairos-navy text-white flex items-center justify-between px-6 sticky top-0 z-30 shadow-md">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-heading font-bold tracking-tight">KAIROS</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 geometric-bg text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 lg:h-screen",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-8 hidden lg:block">
                    <h1 className="text-2xl font-heading font-bold tracking-tight text-white">
                        KAIROS <span className="opacity-50">KNOWLEDGE</span>
                    </h1>
                    <p className="text-xs opacity-50 mt-1 uppercase tracking-widest">Knowledge Platform</p>
                </div>

                <div className="p-8 lg:hidden border-b border-white/10 mb-4">
                    <h1 className="text-xl font-heading font-bold tracking-tight text-white">KAIROS</h1>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest">Knowledge Platform</p>
                </div>

                <nav className="flex-1 px-4 space-y-8 overflow-y-auto pt-4 lg:pt-0">
                    {navGroups.map((group) => (
                        <div key={group.title} className="space-y-2">
                            <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                                {group.title}
                            </h3>
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all",
                                        activeTab === item.id
                                            ? "bg-white/10 text-white shadow-lg ring-1 ring-white/20"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon size={18} />
                                    <span className="font-bold text-sm">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10 relative">
                    <AnimatePresence>
                        {isActionExpanded && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: -8, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute bottom-full left-4 right-4 bg-white/10 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20 overflow-hidden z-50 origin-bottom"
                            >
                                <button
                                    onClick={() => {
                                        onOpenUpload();
                                        setIsActionExpanded(false);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-3 p-3 hover:bg-white/10 rounded-xl transition-colors text-left group"
                                >
                                    <div className="bg-white text-kairos-navy p-2 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Subir Ensayo</p>
                                        <p className="text-[10px] text-white/60">Añadir moléculas de conocimiento</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        onOpenMetrics();
                                        setIsActionExpanded(false);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-3 p-3 hover:bg-white/10 rounded-xl transition-colors text-left group mt-1"
                                >
                                    <div className="bg-kairos-navy text-white p-2 rounded-lg group-hover:scale-110 transition-transform border border-white/20 shadow-sm">
                                        <TrendingUp size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Actualizar Métricas</p>
                                        <p className="text-[10px] text-white/60">Aportar comerciales o visualizaciones</p>
                                    </div>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsActionExpanded(!isActionExpanded)}
                        className="w-full bg-white text-kairos-navy py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-all active:scale-95 shadow-xl group hover:shadow-2xl"
                    >
                        <div className="flex items-center space-x-2">
                            <PlusCircle size={20} className={cn("transition-transform duration-300", isActionExpanded ? "rotate-45 text-red-500" : "group-hover:rotate-90")} />
                            <span>{isActionExpanded ? "Cerrar" : "Nueva Aportación"}</span>
                        </div>
                        <ChevronUp size={16} className={cn("transition-transform duration-300 opacity-50", isActionExpanded ? "rotate-180" : "")} />
                    </button>

                    {user ? (
                        <div className="flex items-center justify-between px-2 text-[10px] text-white/40 pt-4">
                            <span className="truncate max-w-[140px] italic">{user}</span>
                            <button
                                onClick={() => {
                                    onLogout();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="hover:text-white transition-colors flex items-center space-x-1 bg-white/5 px-2 py-1 rounded"
                                title="Cerrar Sesión"
                            >
                                <span>Salir</span>
                                <LogOut size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="pt-4 text-center">
                            <button
                                onClick={() => {
                                    onOpenUpload();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="text-[10px] text-white/40 hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
                            >
                                ¿No estás identificado? Haz clic aquí
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 md:p-8 min-h-screen">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
