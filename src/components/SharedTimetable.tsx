import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { useSocket } from './SocketProvider';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
}

export default function SharedTimetable({ connectionId, partner }: { connectionId: string, partner: any }) {
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Study Math Chapter 4', status: 'todo' },
    { id: '2', title: 'Review Physics Notes', status: 'done' },
  ]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (!socket) return;
    const handleSync = (data: { tasks: Task[] }) => setTasks(data.tasks);
    socket.on('timetable_sync', handleSync);
    return () => { socket.off('timetable_sync', handleSync); };
  }, [socket]);

  const syncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    socket?.emit('timetable_update', { connectionId, tasks: newTasks });
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const t = [...tasks, { id: Date.now().toString(), title: newTask, status: 'todo' as const }];
    syncTasks(t);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    syncTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'todo' ? 'done' : 'todo' } : t));
  };

  const deleteTask = (id: string) => {
    syncTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden w-full p-6">
       <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-aura-pink/20 text-aura-pink rounded-xl flex items-center justify-center">
             <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Shared Timetable</h3>
            <p className="text-aura-lavender/50 text-sm">Sync your study sessions with {partner.username}</p>
          </div>
       </div>

       <form onSubmit={addTask} className="flex gap-2 mb-6">
         <input 
           type="text" 
           placeholder="Add a new study session or task..." 
           value={newTask}
           onChange={e => setNewTask(e.target.value)}
           className="flex-1 bg-aura-panel border border-aura-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-aura-pink transition-colors"
         />
         <button type="submit" className="bg-aura-pink hover:opacity-80 text-white p-2 px-4 rounded-lg font-medium flex items-center gap-2 transition-opacity">
           <Plus size={18} /> Add
         </button>
       </form>

       <div className="flex-1 overflow-y-auto space-y-3 pr-2">
         {tasks.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-aura-panel rounded-xl border border-aura-border group hover:border-aura-pink transition-colors">
               <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(t.id)}>
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${t.status === 'done' ? 'bg-aura-pink border-aura-pink text-white' : 'border-aura-border text-transparent group-hover:border-aura-pink/50'}`}>
                    ✓
                 </div>
                 <span className={`font-medium transition-colors ${t.status === 'done' ? 'text-aura-lavender/40 line-through' : 'text-white'}`}>
                    {t.title}
                 </span>
               </div>
               <button onClick={() => deleteTask(t.id)} className="text-aura-lavender/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2">
                 <Trash2 size={18} />
               </button>
            </div>
         ))}
         {tasks.length === 0 && (
            <div className="text-center text-aura-lavender/40 mt-10">
               <Clock size={40} className="mx-auto mb-3 opacity-50" />
               <p>No study tasks scheduled.</p>
            </div>
         )}
       </div>
    </div>
  );
}
