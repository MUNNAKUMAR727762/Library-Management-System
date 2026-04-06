import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, Copy, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useQuery } from '@tanstack/react-query';
import { Seat } from '@/lib/mock-data';
import { seatsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

interface Props {
  seat: Seat;
  onClose: () => void;
}

export function QRCodePopup({ seat, onClose }: Props) {
  const { shifts } = useApp();
  const shift = shifts.find((item) => item.id === seat.shift);
  const linkQuery = useQuery({
    queryKey: ['seat-admission-link', seat.shift, seat.number],
    queryFn: () => seatsApi.admissionLink(seat.shift, seat.number),
  });

  const qrValue = linkQuery.data?.url ?? '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
          className="relative w-full max-w-sm card-surface rounded-xl overflow-hidden z-10 text-center"
          style={{ boxShadow: 'var(--shadow-modal)' }}
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">New Admission</h2>
            <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-secondary transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code to open the admission form for <span className="font-medium text-foreground">Seat {seat.number}</span> ({shift?.label})
            </p>
            <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Clock3 size={14} />
              This secure admission link expires in 5 minutes.
            </div>
            <div className="flex justify-center p-4 bg-white rounded-lg min-h-[212px] items-center">
              {linkQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Generating secure QR...</div>
              ) : linkQuery.isError ? (
                <div className="text-sm text-destructive">Unable to generate the secure link.</div>
              ) : (
                <QRCode value={qrValue} size={180} />
              )}
            </div>
            {qrValue ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrValue);
                }}
              >
                <Copy size={14} />
                Copy Link
              </Button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
