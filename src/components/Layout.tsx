import React from 'react';
import { BookOpen, BarChart3, Library, PlusCircle, LogOut, Trophy, TrendingUp } from 'lucide-react';
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
    const navItems = [
        { id: 'feed', label: 'Conocimiento', icon: BookOpen },
        { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
        { id: 'commercial', label: 'Comercial', icon: TrendingUp },
        { id: 'score', label: 'Puntuación', icon: Trophy },
        { id: 'book', label: 'Biblioteca', icon: Library },
    ];

    return (
        <div className="min-h-screen flex bg-kairos-light font-body transition-all duration-300">
            {/* Sidebar */}
            <aside className="w-64 geometric-bg text-white flex flex-col fixed h-full z-20">
                <div className="p-8">
                    <h1 className="text-2xl font-heading font-bold tracking-tight">
                        KAIROS <span className="opacity-50">KNOWLEDGE</span>
                    </h1>
                    <p className="text-xs opacity-50 mt-1 uppercase tracking-widest">Knowledge Platform</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                                activeTab === item.id
                                    ? "bg-white/10 text-white shadow-lg"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-2">
                    <button
                        onClick={onOpenUpload}
                        className="w-full bg-white text-kairos-navy py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-transform active:scale-95 shadow-xl"
                    >
                        <PlusCircle size={20} />
                        <span>Subir Ensayo</span>
                    </button>

                    <button
                        onClick={onOpenMetrics}
                        className="w-full bg-kairos-navy text-white border border-white/20 py-2 rounded-xl font-bold flex items-center justify-center space-x-2 transition-transform active:scale-95 hover:bg-white/10"
                    >
                        <TrendingUp size={16} />
                        <span className="text-sm">Actualizar Métricas</span>
                    </button>

                    {user ? (
                        <div className="flex items-center justify-between px-2 text-[10px] text-white/40 pt-2">
                            <span className="truncate max-w-[140px] italic">{user}</span>
                            <button
                                onClick={onLogout}
                                className="hover:text-white transition-colors"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onOpenUpload}
                            className="w-full bg-white/5 text-white/60 py-2 rounded-lg text-[10px] font-bold hover:bg-white/10 hover:text-white transition-all border border-white/10"
                        >
                            ¿No estás identificado?
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 min-h-screen">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
