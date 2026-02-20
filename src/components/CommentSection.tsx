import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import type { Comment } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentSectionProps {
    comments: Comment[];
    user: string | null;
    onAddComment: (text: string) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ comments, user, onAddComment }) => {
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            onAddComment(newComment);
            setNewComment('');
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-kairos-navy mb-6">
                <MessageSquare size={20} />
                <h3 className="text-lg font-heading font-bold">Feedback y Comentarios ({comments.length})</h3>
            </div>

            <div className="space-y-6 mb-8">
                <AnimatePresence mode="popLayout">
                    {comments.map((comment) => (
                        <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex space-x-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-50"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User size={18} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-sm font-bold text-kairos-navy">{comment.author.split('@')[0]}</span>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase">{comment.date}</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">{comment.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Añade un comentario o pregunta..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kairos-navy outline-none transition-all resize-none shadow-sm pr-14 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="absolute right-3 bottom-3 p-3 bg-kairos-navy text-white rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            ) : (
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <p className="text-xs text-gray-400 font-medium italic">Debes estar identificado para comentar.</p>
                </div>
            )}
        </div>
    );
};
