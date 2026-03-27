import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { GameSession } from '../types';

interface WorldLawsManagerProps {
    session: GameSession;
    onClose: () => void;
    onUpdate: (updatedSession: GameSession) => void;
}

export const WorldLawsManager: React.FC<WorldLawsManagerProps> = ({ session, onClose, onUpdate }) => {
    const [laws, setLaws] = useState<string[]>(session.worldSettings.worldLaws || []);
    const [isEnabled, setIsEnabled] = useState<boolean>(session.isWorldLawsEnabled ?? true);
    const [newLaw, setNewLaw] = useState('');

    const handleSave = async (updatedLaws: string[], updatedEnabled: boolean) => {
        const updatedSession = {
            ...session,
            worldSettings: {
                ...session.worldSettings,
                worldLaws: updatedLaws
            },
            isWorldLawsEnabled: updatedEnabled
        };
        await db.sessions.update(session.id!, updatedSession);
        onUpdate(updatedSession);
    };

    const handleToggle = () => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        handleSave(laws, newEnabled);
    };

    const handleAddLaw = () => {
        if (!newLaw.trim()) return;
        const updatedLaws = [...laws, newLaw.trim()];
        setLaws(updatedLaws);
        setNewLaw('');
        handleSave(updatedLaws, isEnabled);
    };

    const handleDeleteLaw = (index: number) => {
        const updatedLaws = laws.filter((_, i) => i !== index);
        setLaws(updatedLaws);
        handleSave(updatedLaws, isEnabled);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-ink-900 border border-ink-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-ink-800 flex justify-between items-center bg-ink-950">
                    <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                        <i className="fas fa-gavel"></i> Luật Lệ Thế Giới
                    </h2>
                    <button onClick={onClose} className="text-ink-500 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between bg-ink-950/50 p-4 rounded-lg border border-ink-800 mb-6">
                        <div>
                            <h3 className="font-bold text-parchment-100 flex items-center gap-2">
                                <i className={`fas fa-power-off ${isEnabled ? 'text-jade-500' : 'text-ink-500'}`}></i>
                                Trạng thái Luật Lệ
                            </h3>
                            <p className="text-xs text-ink-400 mt-1">
                                {isEnabled 
                                    ? "AI đang BẮT BUỘC tuân thủ các luật lệ bên dưới." 
                                    : "Đã tắt. AI sẽ tự do sáng tạo và bỏ qua các luật lệ này."}
                            </p>
                        </div>
                        <button 
                            onClick={handleToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-jade-500' : 'bg-ink-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Add New Law */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink-300 mb-2">Thêm Luật Mới</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newLaw}
                                onChange={(e) => setNewLaw(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLaw()}
                                placeholder="Vd: Không ai được phép nói dối..."
                                className="flex-1 bg-ink-800 border border-ink-700 rounded px-3 py-2 text-sm text-parchment-100 focus:border-amber-500 outline-none"
                            />
                            <button 
                                onClick={handleAddLaw}
                                disabled={!newLaw.trim()}
                                className="bg-amber-600 hover:bg-amber-500 text-ink-950 px-4 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                <i className="fas fa-plus"></i> Thêm
                            </button>
                        </div>
                    </div>

                    {/* List of Laws */}
                    <div>
                        <h3 className="text-sm font-bold text-ink-300 mb-3">Danh Sách Luật Lệ ({laws.length})</h3>
                        {laws.length === 0 ? (
                            <div className="text-center text-ink-500 py-8 bg-ink-950/30 rounded-lg border border-ink-800 border-dashed">
                                <i className="fas fa-scroll text-3xl mb-2 opacity-50"></i>
                                <p className="text-sm">Chưa có luật lệ nào được thiết lập.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {laws.map((law, index) => (
                                    <div key={index} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${isEnabled ? 'bg-ink-800 border-ink-700' : 'bg-ink-900 border-ink-800 opacity-60'}`}>
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className="text-amber-500 font-bold text-sm mt-0.5">{index + 1}.</span>
                                            <p className="text-sm text-parchment-200 leading-relaxed">{law}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteLaw(index)}
                                            className="text-ink-500 hover:text-crimson-500 p-1 transition-colors"
                                            title="Xóa luật này"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 border-t border-ink-800 bg-ink-950 text-xs text-ink-500 flex items-center gap-2">
                    <i className="fas fa-info-circle"></i>
                    <span>Luật lệ giúp định hình thế giới và ngăn AI đi chệch hướng. Hãy dùng công tắc để bật/tắt khi cần tạo biến cố.</span>
                </div>
            </div>
        </div>
    );
};
