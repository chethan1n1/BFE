import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center bg-background px-4 select-none overflow-hidden">
      
      {/* 21st.dev inspired abstract mesh network & geometric dot grids */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        
        {/* Infinite Radial Dot Matrix Grid */}
        <div 
          style={{ 
            backgroundImage: 'radial-gradient(var(--border) 1.5px, transparent 1.5px)', 
            backgroundSize: '24px 24px' 
          }}
          className="absolute inset-0 opacity-[0.7] dark:opacity-[0.35]" 
        />

        {/* Ambient Floating Glow Blobs */}
        <div className="absolute -top-[15%] -left-[10%] w-[60vw] h-[60vh] rounded-full bg-primary/10 blur-[130px] dark:bg-primary/[0.04] animate-pulse duration-[8000ms]" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-amber-500/10 blur-[130px] dark:bg-amber-500/[0.03] animate-pulse duration-[10000ms]" />
        
        {/* Subtle Diagonal Scanline Sheen */}
        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-primary/[0.015] to-amber-500/[0.015] dark:via-primary/[0.005] dark:to-transparent" />
      </div>

      {/* Floating security card container (Glassmorphic panel style) */}
      <div className="w-full max-w-md bg-card/85 backdrop-blur-md border border-border/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden p-8 space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header logo & title */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-[0.25em] text-foreground">KANTAR</span>
            <span className="text-[9px] bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded border border-amber-500/20 tracking-wider">BSA</span>
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Capability Intelligence Platform</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Business Strategy & Analytics</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold animate-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-secondary/25 outline-hidden ring-offset-background placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-border bg-secondary/25 outline-hidden ring-offset-background placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center transition-colors rounded-sm focus:outline-hidden"
                style={{ contentVisibility: 'auto' }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 shadow-md cursor-pointer transition-all flex items-center justify-center tracking-wider uppercase"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              'Authorize Secure Session'
            )}
          </button>
        </form>

        <p className="text-[9px] text-muted-foreground/60 text-center font-medium leading-relaxed">
          Authorized personnel only. This is an official Kantar internal intelligence platform containing proprietary methodologies, expertise frameworks, and client experience footprints.
        </p>

      </div>
    </div>
  );
}
