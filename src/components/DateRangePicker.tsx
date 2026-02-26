import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DateRange {
    start: Date;
    end: Date;
}

interface DateRangePickerProps {
    range: DateRange;
    onChange: (range: DateRange) => void;
}

const PRESETS = [
    { label: 'Hoy', value: 'today' },
    { label: 'Últimos 7 días', value: 7 },
    { label: 'Últimos 30 días', value: 30 },
    { label: 'Este mes', value: 'current_month' },
    { label: 'Este año', value: 'current_year' },
    { label: 'Todo el tiempo', value: 'all' },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ range, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date(range.end));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const startOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const isBetween = (date: Date) => {
        return date > range.start && date < range.end;
    };

    const handleDateClick = (date: Date) => {
        const newDate = new Date(date);
        newDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone shift issues during selection

        if (isSameDay(newDate, range.start) && isSameDay(newDate, range.end)) {
            // No reset needed
        } else if (newDate < range.start) {
            const start = new Date(newDate);
            start.setHours(0, 0, 0, 0);
            onChange({ start, end: range.end });
        } else {
            const end = new Date(newDate);
            end.setHours(23, 59, 59, 999);
            onChange({ start: range.start, end: end });
        }
    };

    const selectPreset = (value: number | string) => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        if (typeof value === 'number') {
            start.setDate(end.getDate() - value);
        } else if (value === 'today') {
            // start/end already set to today
        } else if (value === 'current_month') {
            start.setDate(1);
        } else if (value === 'current_year') {
            start.setMonth(0, 1);
        } else if (value === 'all') {
            start.setFullYear(2020, 0, 1);
        }

        onChange({ start, end });
        setIsOpen(false);
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const renderCalendar = (date: Date) => {
        const totalDays = daysInMonth(date);
        const startDay = (startOfMonth(date) + 6) % 7; // ISO week
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-9" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const current = new Date(date.getFullYear(), date.getMonth(), d);
            const isStart = isSameDay(current, range.start);
            const isEnd = isSameDay(current, range.end);
            const inRange = isBetween(current);

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleDateClick(current)}
                    className={cn(
                        "h-9 w-full flex items-center justify-center text-xs font-bold rounded-lg transition-all relative z-10",
                        isStart || isEnd ? "bg-kairos-navy text-white shadow-md scale-105" :
                            inRange ? "bg-blue-50 text-blue-600 rounded-none" : "hover:bg-gray-100 text-gray-600"
                    )}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-all group"
            >
                <CalendarIcon size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Rango de Fechas</span>
                    <span className="text-xs font-bold text-kairos-navy">
                        {formatDate(range.start)} - {formatDate(range.end)}
                    </span>
                </div>
                <ChevronDown size={14} className={cn("text-gray-300 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 p-1 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 flex overflow-hidden min-w-[600px]"
                    >
                        <div className="w-48 bg-gray-50/50 border-r border-gray-100 p-4 space-y-1">
                            <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3 ml-2">Preajustes</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    onClick={() => selectPreset(p.value)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-white hover:text-kairos-navy hover:shadow-sm transition-all"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronLeft size={18} className="text-gray-400" />
                                </button>
                                <h4 className="text-sm font-bold text-kairos-navy uppercase tracking-widest">
                                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                                </h4>
                                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronRight size={18} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                    <div key={day} className="text-[10px] font-bold text-gray-300 text-center py-2">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {renderCalendar(viewDate)}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="text-[10px] font-medium text-gray-400">
                                    Selecciona un rango para filtrar el contenido.
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-kairos-navy transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-6 py-2 bg-kairos-navy text-white text-xs font-bold rounded-xl shadow-lg shadow-kairos-navy/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Aplicar Filtro
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
