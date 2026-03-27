import React, { useState } from 'react';
import { Ability, GameSession } from '../types';
import { geminiService } from '../services/geminiService';
import { db } from '../db';

interface AbilitiesModalProps {
    session: GameSession;
    onClose: () => void;
    onUpdateSession: (field: keyof GameSession, value: any) => void;
}

export const AbilitiesModal: React.FC<AbilitiesModalProps> = ({ session, onClose, onUpdateSession }) => {
    const [abilities, setAbilities] = useState<Ability[]>(session.abilities || []);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAbility, setCurrentAbility] = useState<Ability | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSave = async () => {
        if (!currentAbility?.name || !currentAbility?.shortDescription) return;

        let newAbilities;
        if (currentAbility.id) {
            newAbilities = abilities.map(a => a.id === currentAbility.id ? currentAbility : a);
        } else {
            newAbilities = [...abilities, { ...currentAbility, id: Date.now().toString() }];
        }

        setAbilities(newAbilities);
        
        if (session.id) {
            await db.sessions.update(session.id, { abilities: newAbilities });
        }
        onUpdateSession('abilities', newAbilities);
        setIsEditing(false);
        setCurrentAbility(null);
    };

    const handleDelete = async (id: string) => {
        const newAbilities = abilities.filter(a => a.id !== id);
        setAbilities(newAbilities);
        if (session.id) {
            await db.sessions.update(session.id, { abilities: newAbilities });
        }
        onUpdateSession('abilities', newAbilities);
    };

    const handleGenerateDetailed = async () => {
        if (!currentAbility?.name || !currentAbility?.shortDescription) return;
        setIsGenerating(true);
        try {
            const detailed = await geminiService.generateAbilityDescription(
                currentAbility.name,
                currentAbility.shortDescription,
                session.genre,
                session.worldSettings.worldContext
            );
            setCurrentAbility({ ...currentAbility, detailedDescription: detailed });
        } catch (error) {
            console.error("Failed to generate detailed description:", error);
            alert("Lỗi khi tạo mô tả chi tiết!");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-ink-900 border border-ink-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-ink-800 flex justify-between items-center bg-ink-950 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30">
                            <i className="fas fa-bolt text-blue-400"></i>
                        </div>
                        <h2 className="text-lg font-bold text-parchment-100 uppercase tracking-wider">Năng Lực Nhân Vật</h2>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-ink-700">
                    {!isEditing ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-ink-400 text-sm">Quản lý các kỹ năng, phép thuật hoặc năng lực đặc biệt của nhân vật chính.</p>
                                <button 
                                    onClick={() => {
                                        setCurrentAbility({ id: '', name: '', shortDescription: '', detailedDescription: '' });
                                        setIsEditing(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Thêm Năng Lực
                                </button>
                            </div>

                            {abilities.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-ink-800 rounded-xl">
                                    <i className="fas fa-magic text-4xl text-ink-600 mb-3"></i>
                                    <p className="text-ink-500">Chưa có năng lực nào được ghi nhận.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {abilities.map(ability => (
                                        <div key={ability.id} className="bg-ink-950 border border-ink-800 rounded-lg p-4 hover:border-blue-500/30 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-blue-400 font-bold text-lg">{ability.name}</h3>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => { setCurrentAbility(ability); setIsEditing(true); }}
                                                        className="text-ink-400 hover:text-blue-400 p-1"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(ability.id)}
                                                        className="text-ink-400 hover:text-crimson-400 p-1"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-parchment-300 text-sm font-medium mb-2">{ability.shortDescription}</p>
                                            {ability.detailedDescription && (
                                                <div className="mt-3 pt-3 border-t border-ink-800/50">
                                                    <p className="text-ink-400 text-xs leading-relaxed whitespace-pre-wrap">{ability.detailedDescription}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-ink-400 text-xs uppercase font-bold mb-1">Tên Năng Lực *</label>
                                <input 
                                    type="text" 
                                    value={currentAbility?.name || ''}
                                    onChange={e => setCurrentAbility(prev => ({ ...prev!, name: e.target.value }))}
                                    placeholder="VD: Hỏa Cầu Thuật, Mắt Kính Xuyên Thấu..."
                                    className="w-full bg-ink-950 border border-ink-800 rounded-lg px-4 py-2 text-parchment-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-ink-400 text-xs uppercase font-bold mb-1">Mô Tả Ngắn / Cấp Độ *</label>
                                <input 
                                    type="text" 
                                    value={currentAbility?.shortDescription || ''}
                                    onChange={e => setCurrentAbility(prev => ({ ...prev!, shortDescription: e.target.value }))}
                                    placeholder="VD: Tạo ra quả cầu lửa nhỏ (Lv.3)"
                                    className="w-full bg-ink-950 border border-ink-800 rounded-lg px-4 py-2 text-parchment-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <label className="block text-ink-400 text-xs uppercase font-bold">Mô Tả Chi Tiết (Tùy Chọn)</label>
                                    <button 
                                        onClick={handleGenerateDetailed}
                                        disabled={isGenerating || !currentAbility?.name || !currentAbility?.shortDescription}
                                        className="text-[10px] bg-arcane-900/30 text-arcane-400 border border-arcane-700/50 px-2 py-1 rounded hover:bg-arcane-800/50 disabled:opacity-50 transition-all flex items-center gap-1"
                                    >
                                        {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                                        AI Viết Chi Tiết
                                    </button>
                                </div>
                                <textarea 
                                    value={currentAbility?.detailedDescription || ''}
                                    onChange={e => setCurrentAbility(prev => ({ ...prev!, detailedDescription: e.target.value }))}
                                    placeholder="Mô tả chi tiết về cách hoạt động, điểm yếu, lượng mana tiêu hao..."
                                    className="w-full bg-ink-950 border border-ink-800 rounded-lg px-4 py-2 text-parchment-100 focus:outline-none focus:border-blue-500 h-32 resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-ink-800">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-ink-400 hover:text-white font-bold text-sm transition-colors"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={!currentAbility?.name || !currentAbility?.shortDescription}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                                >
                                    Lưu Năng Lực
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
