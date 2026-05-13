import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { validateCredentials } from '../lib/authSecurity';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateCredentials(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim());
      const authEmail = isEmail ? username.trim().toLowerCase() : `${username.trim().toLowerCase()}@auralink.app`;
      const displayUsername = isEmail ? username.trim().split('@')[0] : username.trim();

      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password,
        });

        if (signInError) throw signInError;
        if (!data.session) throw new Error('No session returned');

        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userToSet = existingUser || { id: data.user.id, username: displayUsername };

        if (!existingUser) {
          await supabase.from('users').insert([{ id: data.user.id, username: displayUsername }]);
        }

        setAuth(data.session.access_token, {
          id: userToSet.id,
          username: userToSet.username,
          avatarUrl: userToSet.avatar_url || undefined,
        });
        navigate('/dashboard');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: password,
          options: {
            data: { username: displayUsername }
          }
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setSuccess('Account created! Check your email to verify, then sign in.');
          setLoading(false);
          return;
        }

        const { error: profileError } = await supabase.from('users').upsert([
          { id: data.user!.id, username: displayUsername }
        ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Auto-connect with AuraBot
        const { data: botData } = await supabase
          .from('users')
          .select('id')
          .eq('username', 'AuraBot')
          .single();

        if (botData) {
          await supabase.from('connections').insert([
            { user1_id: data.user!.id, user2_id: botData.id, status: 'accepted' }
          ]);
        }

        setAuth(data.session.access_token, { id: data.user!.id, username: displayUsername });
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect username or password. Please try again.');
      } else if (msg.includes('User already registered')) {
        setError('This account already exists. Try signing in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [username, password, isLogin, setAuth, navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-5 relative overflow-hidden bg-aura-navy">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-30 blur-[100px]" style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[100px]" style={{ background: 'radial-gradient(circle, #E879F9, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] rounded-full opacity-10 blur-[80px]" style={{ background: 'radial-gradient(circle, #A78BFA, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-sm z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative"
          >
            <div className="w-[72px] h-[72px] rounded-[22px] gradient-primary flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.4)]">
              <Zap className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-aura-teal flex items-center justify-center shadow-lg">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-white">
              AuraLink
            </h1>
            <p className="text-xs text-aura-lavender/50 mt-1 font-medium tracking-wide">
              Connect · Chat · Collaborate
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-5 glass-strong shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          {/* Tab Switcher */}
          <div className="flex bg-aura-navy/60 rounded-xl p-1 mb-5 border border-aura-border/50">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin ? 'bg-aura-primary text-white shadow-md shadow-aura-primary/25' : 'text-aura-lavender/50 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin ? 'bg-aura-primary text-white shadow-md shadow-aura-primary/25' : 'text-aura-lavender/50 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          {/* Error/Success Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-sm border border-red-500/20 font-medium"
                role="alert"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl mb-4 text-sm border border-emerald-500/20 font-medium"
                role="status"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-semibold mb-2 text-aura-lavender/60"
              >
                {isLogin ? 'Username or Email' : 'Choose a Username'}
              </label>
              <input
                type="text"
                id="auth-username"
                className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all border bg-aura-navy/80 border-aura-border focus:border-aura-primary focus:ring-2 focus:ring-aura-primary/20 placeholder:text-aura-lavender/30"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={isLogin ? 'username or email@example.com' : 'your_username'}
                minLength={3}
                maxLength={50}
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                required
                disabled={loading}
              />
              {!isLogin && (
                <p className="text-[11px] text-aura-lavender/30 mt-1.5 px-1">
                  3-24 characters, letters, numbers, and underscores only
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold mb-2 text-aura-lavender/60"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none transition-all border bg-aura-navy/80 border-aura-border focus:border-aura-primary focus:ring-2 focus:ring-aura-primary/20 placeholder:text-aura-lavender/30"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  maxLength={128}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-aura-lavender/40 hover:text-white transition-colors rounded-lg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-[11px] text-aura-lavender/30 mt-1.5 px-1">
                  Minimum 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 gradient-primary shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.5)]"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-aura-lavender/25 mt-5">
            By continuing, you agree to AuraLink's Terms of Service
          </p>
        </div>
      </motion.div>
    </div>
  );
}
