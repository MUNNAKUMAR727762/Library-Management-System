import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { extractApiError } from '@/contexts/AppContext';

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
  onConfirm,
}: ConfirmActionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              setError('');
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (confirmError) {
                setError(extractApiError(confirmError));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Please wait...' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
          This action will immediately update the live library records.
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </ResponsiveModal>
  );
}
