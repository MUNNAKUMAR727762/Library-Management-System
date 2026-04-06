import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';

export function ShiftTabs() {
  const { activeShift, setActiveShift, shifts } = useApp();

  return (
    <div className="flex gap-1 p-1 bg-secondary rounded-lg">
      {shifts.map(shift => (
        <button
          key={shift.id}
          onClick={() => setActiveShift(shift.id)}
          className="relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
        >
          {activeShift === shift.id && (
            <motion.div
              layoutId="activeShift"
              className="absolute inset-0 bg-card rounded-md"
              style={{ boxShadow: 'var(--shadow-card)' }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            />
          )}
          <span className={`relative z-10 ${activeShift === shift.id ? 'text-foreground' : 'text-muted-foreground'}`}>
            <span className="hidden sm:inline">{shift.label}: </span>
            <span className="text-xs">{shift.time}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
