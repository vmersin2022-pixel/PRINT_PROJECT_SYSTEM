
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SupportTicket } from '../../types';
import { MessageSquare, CheckCircle, XCircle, Clock, ExternalLink, RefreshCcw } from 'lucide-react';
import { formatDate } from '../../utils';

const AdminSupport: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            // Fetch tickets joined with profiles to get user email
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    profiles:user_id (email, full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map((t: any) => ({
                ...t,
                user_email: t.profiles?.email,
                user_name: t.profiles?.full_name
            }));

            setTickets(formatted);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const updateStatus = async (id: string, status: 'approved' | 'rejected', responseText: string) => {
        if (!confirm(`Вы уверены, что хотите перевести заявку в статус ${status}?`)) return;
        
        try {
            await supabase.from('support_tickets').update({
                status,
                admin_response: responseText
            }).eq('id', id);
            
            fetchTickets();
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'open': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={12}/> OPEN</span>;
            case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={12}/> APPROVED</span>;
            case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><XCircle size={12}/> REJECTED</span>;
            default: return <span className="bg-zinc-100 text-zinc-500 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
        }
    };

    return (
        <div className="h-full">
            <div className="flex justify-between items-center mb-6 bg-white p-4 border border-zinc-200">
                <h2 className="font-jura text-xl font-bold uppercase flex items-center gap-2">
                    <MessageSquare size={20}/> SUPPORT DESK ({tickets.filter(t => t.status === 'open').length} NEW)
                </h2>
                <button onClick={fetchTickets} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-zinc-400">Загрузка тикетов...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-300">Нет активных заявок</div>
                ) : (
                    tickets.map(ticket => (
                        <div key={ticket.id} className={`bg-white border p-6 flex flex-col md:flex-row gap-6 ${ticket.status === 'open' ? 'border-l-4 border-l-blue-600 shadow-md' : 'border-zinc-200 opacity-80'}`}>
                            
                            {/* Image Proof */}
                            <div className="w-full md:w-48 h-48 bg-zinc-100 border border-zinc-200 shrink-0 flex items-center justify-center overflow-hidden">
                                {ticket.photo_proof ? (
                                    <a href={ticket.photo_proof} target="_blank" rel="noreferrer">
                                        <img src={ticket.photo_proof} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                    </a>
                                ) : (
                                    <span className="text-zinc-300 text-xs font-mono">NO PHOTO</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusBadge(ticket.status)}
                                            <span className="font-mono text-xs text-zinc-400">{formatDate(ticket.created_at)}</span>
                                        </div>
                                        <h3 className="font-bold text-lg uppercase">{ticket.reason === 'defect' ? 'БРАК / ДЕФЕКТ' : ticket.reason}</h3>
                                        <div className="text-xs font-mono text-zinc-500 mt-1">
                                            Order: #{ticket.order_id?.slice(0,8)} • User: {ticket.user_name || ticket.user_email}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-zinc-50 p-4 border border-zinc-100 mb-4 font-mono text-sm">
                                    "{ticket.description}"
                                </div>

                                {ticket.status === 'open' && (
                                    <div className="flex gap-2 mt-4">
                                        <button 
                                            onClick={() => updateStatus(ticket.id, 'approved', 'Возврат одобрен. Пожалуйста, отправьте товар СДЭК...')}
                                            className="bg-green-600 text-white px-4 py-2 font-bold uppercase text-xs hover:bg-green-700 transition-colors"
                                        >
                                            ОДОБРИТЬ ВОЗВРАТ
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(ticket.id, 'rejected', 'Отказано. Причина: ...')}
                                            className="bg-red-600 text-white px-4 py-2 font-bold uppercase text-xs hover:bg-red-700 transition-colors"
                                        >
                                            ОТКЛОНИТЬ
                                        </button>
                                    </div>
                                )}
                                
                                {ticket.admin_response && (
                                    <div className="mt-4 text-xs font-mono text-zinc-500 border-t pt-2">
                                        <span className="font-bold">ADMIN RESPONSE:</span> {ticket.admin_response}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminSupport;
