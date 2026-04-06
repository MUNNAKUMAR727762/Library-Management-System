import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractApiError, useApp } from '@/contexts/AppContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters'); return; }

    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (loginError) {
      setError(extractApiError(loginError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
        className="w-full max-w-sm"
      >
        <div className="card-surface rounded-xl p-8" style={{ boxShadow: 'var(--shadow-modal)' }}>
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" showTagline />
            <p className="text-sm text-muted-foreground mt-4">Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-caps block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gyansthal.com"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 input-surface"
              />
            </div>

            <div>
              <label className="label-caps block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 input-surface"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
