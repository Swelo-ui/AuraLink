import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Check } from 'lucide-react';
import { useSocket } from './SocketProvider';
import clsx from 'clsx';
import { API_URL } from '../lib/utils';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
}

export default function SharedTimetable({ connectionId, partner }: { connectionId?: string, partner?: any }) {
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  const fetchTimetable = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = connectionId ? `${API_URL}/api/timetable?connectionId=${connectionId}` : `${API_URL}/api/timetable`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) setTasks(data);
      }
    } catch (err) {
      console.error('Failed to load timetable', err);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [connectionId]);

  useEffect(() => {
    if (!socket || !connectionId) return;
    const handleSync = (data: { connectionId: string, tasks: Task[] }) => {
      if (data.connectionId === connectionId) {
        fetchTimetable();
      }
    };
    socket.on('timetable_sync', handleSync);
    return () => { socket.off('timetable_sync', handleSync); };
  }, [socket, connectionId]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const token = localStorage.getItem('token');
    
    await fetch(`${API_URL}/api/timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ connectionId: connectionId || undefined, title: newTask })
    });
    
    setNewTask('');
    fetchTimetable();
    
    if (connectionId && socket) {
      socket.emit('timetable_update', { connectionId });
    }
  };

  const toggleTask = async (task: Task) => {
    const token = localStorage.getItem('token');
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    
    await fetch(`${API_URL}/api/timetable/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, title: task.title })
    });
    
    fetchTimetable();
    
    if (connectionId && socket) {
      socket.emit('timetable_update', { connectionId });
    }
  };

  const deleteTask = async (id: string) => {
    const token = localStorage.getItem('token');
    
    await fetch(`${API_URL}/api/timetable/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    fetchTimetable();
    
    if (connectionId && socket) {
      socket.emit('timetable_update', { connectionId });
    }
  };

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden w-full p-4 sm:p-6">
       <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 bg-aura-panel/30 p-3 sm:p-4 rounded-2xl border border-aura-border/50">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-aura-pink/20 text-aura-pink rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-aura-pink/10">
             <Calendar size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-[15px] sm:text-xl truncate">{connectionId ? 'Shared Timetable' : 'My Timetable'}</h3>
            <p className="text-aura-lavender/50 text-[10px] sm:text-sm truncate">{connectionId && partner ? `Study sessions with ${partner.username}` : 'Your personal study tasks'}</p>
          </div>
       </div>

       {/* Progress Bar */}
       {tasks.length > 0 && (
         <div className="mb-4 sm:mb-6 px-1">
           <div className="flex justify-between items-end text-[10px] sm:text-xs text-aura-lavender/60 mb-2 font-bold uppercase tracking-wider">
             <span className="flex items-center gap-1.5"><Clock size={12} className="text-aura-pink" /> Progress</span>
             <span className="text-aura-pink">{Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%</span>
           </div>
           <div className="w-full bg-aura-panel rounded-full h-2 overflow-hidden border border-aura-border shadow-inner">
             <div 
               className="bg-aura-pink h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(236,72,153,0.3)]" 
               style={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }}
             ></div>
           </div>
         </div>
       )}

       <form onSubmit={addTask} className="flex gap-2 mb-4 sm:mb-6">
         <input 
           type="text" 
           placeholder="New task..." 
           value={newTask}
           onChange={e => setNewTask(e.target.value)}
           className="flex-1 bg-aura-panel border border-aura-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aura-pink transition-all placeholder:text-aura-lavender/30"
         />
         <button type="submit" className="bg-aura-pink hover:opacity-90 text-white p-2.5 sm:px-5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-90 shadow-lg shadow-aura-pink/20">
           <Plus size={20} /> <span className="hidden xs:inline">Add</span>
         </button>
       </form>

       <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-aura-border">
         {tasks.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3.5 sm:p-4 bg-aura-panel/50 backdrop-blur-sm rounded-2xl border border-aura-border group hover:border-aura-pink/50 transition-all duration-300">
               <div className="flex items-center gap-4 cursor-pointer flex-1 py-1" onClick={() => toggleTask(t)}>
                 <div className={clsx("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 active:scale-75 shadow-sm", t.status === 'done' ? 'bg-aura-pink border-aura-pink text-white rotate-0' : 'border-aura-border text-transparent group-hover:border-aura-pink/50 -rotate-12')}>
                    <Check size={14} strokeWidth={4} />
                 </div>
                 <span className={clsx("font-semibold text-sm sm:text-base transition-all duration-300", t.status === 'done' ? 'text-aura-lavender/30 line-through' : 'text-white')}>
                    {t.title}
                 </span>
               </div>
               <button onClick={() => deleteTask(t.id)} className="text-aura-lavender/30 hover:text-red-400 p-2 sm:opacity-0 group-hover:opacity-100 transition-all active:scale-75">
                 <Trash2 size={18} />
               </button>
            </div>
         ))}
         {tasks.length === 0 && (
            <div className="text-center py-16 text-aura-lavender/30 flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-aura-panel rounded-full flex items-center justify-center border border-aura-border shadow-inner">
                 <Clock size={32} className="opacity-50" />
               </div>
               <p className="text-sm font-medium">No study tasks scheduled yet.</p>
            </div>
         )}
       </div>
    </div>
  );
}
