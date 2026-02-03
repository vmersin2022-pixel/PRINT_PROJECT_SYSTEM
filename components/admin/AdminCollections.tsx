
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Collection } from '../../types';
import { Plus, Edit2, Trash2, X, UploadCloud, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context';
import { getImageUrl } from '../../utils';

const AdminCollections: React.FC = () => {
    const { refreshData } = useApp();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null); // If null, creating new
    
    // Form Data
    const [formData, setFormData] = useState({
        id: '',
        title: '',
        description: '',
        image: ''
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCollections = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('collections').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            // Map DB 'description' to type 'desc'
            const mapped = data.map((c: any) => ({
                ...c,
                desc: c.description || '',
                link: `/catalog?collection=${c.id}`
            }));
            setCollections(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleCreate = () => {
        setFormData({ id: '', title: '', description: '', image: '' });
        setEditingId(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (col: Collection) => {
        setFormData({
            id: col.id,
            title: col.title,
            description: col.desc || '',
            image: col.image
        });
        setEditingId(col.id);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Удалить коллекцию? Товары останутся, но пропадут из этой подборки.')) return;
        try {
            const { error } = await supabase.from('collections').delete().eq('id', id);
            if (error) throw error;
            fetchCollections();
            refreshData();
        } catch (e: any) {
            handleError(e);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `col_${Date.now()}.${fileExt}`;
        
        try {
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, image: data.publicUrl }));
        } catch (e: any) {
            alert('Ошибка загрузки: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleError = (e: any) => {
        console.error(e);
        if (e.message?.includes('row-level security') || e.code === '42501') {
            alert('⛔ ОШИБКА ДОСТУПА (RLS)\n\nSupabase блокирует сохранение.\n1. Зайдите в Supabase -> Table Editor -> collections\n2. Нажмите "RLS Active" -> "Disable RLS"');
        } else {
            alert('Ошибка: ' + e.message);
        }
    };

    const handleSave = async () => {
        if (!formData.id || !formData.title) {
            alert('ID и Название обязательны');
            return;
        }

        setUploading(true);
        try {
            const payload = {
                id: formData.id.toLowerCase().replace(/\s+/g, '_'), // Slugify ID
                title: formData.title,
                description: formData.description,
                image: formData.image
            };

            const { error } = await supabase.from('collections').upsert(payload);
            if (error) throw error;

            setIsEditorOpen(false);
            fetchCollections();
            refreshData();
        } catch (e: any) {
            handleError(e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative h-full">
            <div className="flex justify-between items-center mb-6 bg-white p-4 border border-zinc-200">
                <h2 className="font-jura text-xl font-bold uppercase">КОЛЛЕКЦИИ ({collections.length})</h2>
                <button onClick={handleCreate} className="flex items-center gap-2 bg-black text-white px-6 py-2 font-jura font-bold uppercase hover:bg-blue-600 transition-colors">
                    <Plus size={18} /> Создать
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map(col => (
                    <div key={col.id} className="bg-white border border-black group relative">
                        <div className="aspect-video bg-zinc-100 overflow-hidden border-b border-black">
                            {col.image ? (
                                <img src={getImageUrl(col.image, 400)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={32}/></div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-jura font-bold text-lg uppercase">{col.title}</h3>
                                <span className="font-mono text-xs text-zinc-400 bg-zinc-100 px-1">ID: {col.id}</span>
                            </div>
                            <p className="font-mono text-xs text-zinc-500 line-clamp-2 h-8">{col.desc}</p>
                            
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => handleEdit(col)} className="flex-1 py-2 border border-zinc-200 hover:bg-black hover:text-white transition-colors text-xs font-mono uppercase flex items-center justify-center gap-2">
                                    <Edit2 size={12}/> Ред.
                                </button>
                                <button onClick={() => handleDelete(col.id)} className="px-3 py-2 border border-zinc-200 hover:bg-red-600 hover:text-white transition-colors text-xs font-mono uppercase">
                                    <Trash2 size={12}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* EDITOR DRAWER */}
            <div 
                className={`fixed inset-0 z-[100] transition-all duration-300 ${isEditorOpen ? 'bg-black/40 pointer-events-auto' : 'pointer-events-none'}`}
                onClick={() => setIsEditorOpen(false)}
            >
                <div 
                    onClick={e => e.stopPropagation()}
                    className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-black transform transition-transform duration-300 pointer-events-auto flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="p-6 border-b border-black flex justify-between items-center bg-zinc-50">
                        <h2 className="font-jura text-xl font-bold uppercase">{editingId ? 'РЕДАКТИРОВАТЬ' : 'НОВАЯ КОЛЛЕКЦИЯ'}</h2>
                        <button onClick={() => setIsEditorOpen(false)}><X size={24}/></button>
                    </div>

                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        <div>
                            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">ID (Slug)</label>
                            <input 
                                value={formData.id}
                                onChange={e => setFormData({...formData, id: e.target.value})}
                                disabled={!!editingId} // Cannot change ID of existing
                                placeholder="например: duo, cyber_punk"
                                className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                            />
                            <p className="text-[9px] text-zinc-400 mt-1">Используется в ссылке: /catalog?collection=ID</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Название</label>
                            <input 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full border border-zinc-300 p-3 font-jura font-bold uppercase focus:border-blue-600 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Описание</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                rows={3}
                                className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 outline-none"
                            />
                        </div>

                        <div>
                             <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Обложка</label>
                             <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-300 h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 hover:border-blue-600 transition-colors relative overflow-hidden"
                             >
                                {formData.image ? (
                                    <img src={formData.image} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                ) : (
                                    <>
                                        {uploading ? <Loader2 className="animate-spin text-blue-600"/> : <UploadCloud className="text-zinc-400 mb-2"/>}
                                        <span className="text-xs font-mono text-zinc-500 uppercase">{uploading ? 'ЗАГРУЗКА...' : 'ВЫБРАТЬ ФАЙЛ'}</span>
                                    </>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                             </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-black bg-white">
                        <button onClick={handleSave} disabled={uploading} className="w-full py-4 bg-black text-white font-jura font-bold uppercase hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
                             {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} СОХРАНИТЬ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCollections;
