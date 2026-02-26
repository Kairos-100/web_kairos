import React, { useMemo } from 'react';
import type { Essay, MetricEntry } from '../constants';
import { DocumentExplorer } from './DocumentExplorer';

interface ActivityViewProps {
    essays: Essay[];
    metrics: MetricEntry[];
    currentUserEmail?: string | null;
    onEditEssay?: (essay: Essay) => void;
    onDeleteEssay?: (id: string, pdfUrl?: string) => void;
    onEditMetric?: (metric: MetricEntry) => void;
    onDeleteMetric?: (id: string) => void;
}

interface ActivityItem {
    id: string;
    type: 'tesis' | 'metrica';
    title: string;
    author: string;
    refDate: string;
    createdAt: string;
    data: any;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
    essays,
    metrics,
    currentUserEmail,
    onEditEssay,
    onDeleteEssay,
    onEditMetric,
    onDeleteMetric
}) => {
    const activityFeed = useMemo(() => {
        const feed: ActivityItem[] = [
            ...essays.map(e => ({
                id: `essay-${e.id}`,
                type: 'tesis' as const,
                title: e.title,
                author: e.author,
                refDate: e.date,
                createdAt: (e as any).created_at || e.date,
                data: e
            })),
            ...metrics.map(m => ({
                id: `metric-${m.id}`,
                type: 'metrica' as const,
                title: `Registro de Métricas - ${m.user_email.split('@')[0]}`,
                author: m.user_email,
                refDate: m.date,
                createdAt: m.created_at,
                data: m
            }))
        ];

        return feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [essays, metrics]);

    return (
        <div className="space-y-6">
            <DocumentExplorer
                title="Log de Actividad"
                hideSearch={true}
                currentUserEmail={currentUserEmail}
                onSelectEssay={(id) => {
                    const originalId = String(id).replace('essay-', '');
                    const essay = essays.find(e => String(e.id) === originalId);
                    if (essay && onEditEssay) onEditEssay(essay);
                }}
                onDelete={(doc) => {
                    if (doc.type === 'tesis' && onDeleteEssay) {
                        const originalId = String(doc.id).replace('essay-', '');
                        onDeleteEssay(originalId, doc.pdfUrl);
                    } else if (onDeleteMetric) {
                        const originalId = String(doc.id).replace('metric-', '');
                        onDeleteMetric(originalId);
                    }
                }}
                onEdit={(doc) => {
                    if (doc.type === 'tesis' && onEditEssay) {
                        const originalId = doc.id.replace('essay-', '');
                        const essay = essays.find(e => e.id === originalId);
                        if (essay) onEditEssay(essay);
                    } else if (onEditMetric) {
                        const originalId = doc.id.replace('metric-', '');
                        const metric = metrics.find(m => m.id === originalId);
                        if (metric) onEditMetric(metric);
                    }
                }}
                initialDocuments={activityFeed.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.type === 'tesis' ? (item.data as any).category :
                        ((item.data as any).cv_title || (item.data as any).sharing_title || (item.data as any).cp_title),
                    author: item.author,
                    date: item.refDate,
                    category: item.type === 'tesis' ? (item.data as any).category : 'Actividad',
                    pdfUrl: item.type === 'tesis' ? (item.data as any).pdfUrl :
                        ((item.data as any).cv_pdf_url || (item.data as any).sharing_pdf_url || (item.data as any).cp_pdf_url || ''),
                    type: item.type === 'tesis' ? 'tesis' :
                        ((item.data as any).cv > 0 ? 'cv' :
                            (item.data as any).sharing > 0 ? 'sharing' : 'cp'),
                    points: item.type === 'tesis' ? `${(item.data as any).points} LP` :
                        ((item.data as any).cv > 0 ? `+${(item.data as any).cv} CV` :
                            (item.data as any).sharing > 0 ? `+${(item.data as any).sharing} SH` : `+${(item.data as any).cp} CP`),
                    isMetric: item.type === 'metrica'
                }))}
            />
        </div>
    );
};
