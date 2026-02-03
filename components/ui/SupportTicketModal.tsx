
import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { X, UploadCloud, Loader2, MessageSquareWarning } from 'lucide-react';
import { useApp } from '../../context';

interface SupportTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string | null;
    userId: string | null;
}

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose, orderId, userId }) => {
    const { refreshData } = useApp();
    const [reason, setReason] = useState('defect');
    const [description, setDescription] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !orderId || !userId) return null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `support_${orderId}_${Date.now()}.${fileExt}`;
            
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (error) throw error;
            
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setPhotoUrl(data.publicUrl);
        } catch (e: any) {
            alert('Ошибка загрузки фото: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!description) return alert('Опишите проблему');
        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({
                user_id: userId,
                order_id: orderId,
                reason,
                description,
                photo_proof: photoUrl
            });
            if (error) throw error;
            
            alert('Заявка создана. Мы свяжемся с вами в течение 24 часов.');
            onClose();
            // Reset form
            setDescription('');
            setPhotoUrl('');
            setReason('defect');
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md border border-black p-6 shadow-2xl animate-blur-in">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-200 pb-4">
                    <h3 className="font-jura font-bold text-xl uppercase flex items-center gap-2">
                        <MessageSquareWarning size={24} className="text-red-600"/>
                        Проблема с заказом
                    </h3>
                    <button onClick={onClose}><X size={24}/></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-zinc-100 p-3 text-xs font-mono text-zinc-500">
                        ЗАКАЗ ID: <span className="text-black font-bold">#{orderId.slice(0,8)}</span>
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Причина обращения</label>
                        <select 
                            className="w-full border border-black p-3 font-mono text-sm focus:outline-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            <option value="defect">Брак / Дефект</option>
                            <option value="wrong_size">Не подошел размер</option>
                            <option value="wrong_item">Пришел не тот товар</option>
                            <option value="other">Другое</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Описание ситуации</label>
                        <textarea 
                            rows={3}
                            className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-black outline-none"
                            placeholder="Опишите дефект или проблему..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Фото (Обязательно при браке)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-zinc-300 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 hover:border-black transition-colors"
                        >
                            {photoUrl ? (
                                <img src={photoUrl} className="h-32 object-contain" />
                            ) : (
                                <>
                                    {uploading ? <Loader2 className="animate-spin text-blue-600"/> : <UploadCloud className="text-zinc-400 mb-2"/>}
                                    <span className="text-xs font-mono text-zinc-500 uppercase">{uploading ? 'ЗАГРУЗКА...' : 'ПРИКРЕПИТЬ ФОТО'}</span>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={submitting || uploading}
                        className="w-full bg-black text-white py-4 font-jura font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-50 mt-4"
                    >
                        {submitting ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ЗАЯВКУ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupportTicketModal;
