import { Bell, ChevronDown, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function TopNavbar() {
  const { notifications, markNotificationRead, logout, currentUser } = useApp();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <span className="hidden md:block text-sm font-semibold text-foreground">Gyan Sthal Library</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label="Notifications"
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 card-surface rounded-xl overflow-hidden z-50"
                style={{ boxShadow: 'var(--shadow-modal)' }}
              >
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        void markNotificationRead(n.id);
                        setShowNotifs(false);
                        navigate(n.targetPath || '/');
                      }}
                      className={`w-full text-left px-3 py-3 border-b border-border last:border-0 hover:bg-secondary transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-sm text-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                      <p className="text-[11px] font-medium text-primary mt-1">{n.targetLabel || 'Open'}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            aria-label="Profile menu"
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={16} className="text-primary" />
            </div>
            <ChevronDown size={14} className="hidden md:block" />
          </button>
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-48 card-surface rounded-xl overflow-hidden z-50"
                style={{ boxShadow: 'var(--shadow-modal)' }}
              >
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Admin</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email ?? 'admin@gyansthal.com'}</p>
                </div>
                <button
                  onClick={() => { void logout(); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
