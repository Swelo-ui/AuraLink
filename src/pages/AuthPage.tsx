import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authenication failed');
      
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-aura-navy flex items-center justify-center p-4">
      <div className="bg-aura-panel p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-aura-border">
        <h1 className="text-4xl font-extrabold text-white text-center mb-2 tracking-tight">AURALINK</h1>
        <p className="text-aura-lavender/70 text-center mb-8 text-sm">
          {isLogin ? 'Welcome back to your workspace' : 'Link Your Aura, Study in Sync'}
        </p>
        
        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-aura-lavender mb-1">Username</label>
            <input 
              type="text" 
              className="w-full bg-aura-navy border border-aura-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-aura-primary transition-colors"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-aura-lavender mb-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-aura-navy border border-aura-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-aura-primary transition-colors"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-aura-primary hover:bg-aura-primary-hover text-white font-semibold py-2.5 px-4 rounded-lg transition-colors mt-4"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-aura-primary hover:text-aura-lavender text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
