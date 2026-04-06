import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { AdmissionRequest } from '@/lib/mock-data';
import { extractApiError, useApp } from '@/contexts/AppContext';

interface AdmissionRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AdmissionRequest | null;
}

export function AdmissionRejectDialog({ open, onOpenChange, request }: AdmissionRejectDialogProps) {
  const { rejectAdmissionRequest } = useApp();
  const [reason, setReason] = useState('Seat no longer available');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('Seat no longer available');
    setError('');
    setSaving(false);
  }, [open, request?.id]);

  if (!request) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reject Admission Request"
      description={`Share a reason for rejecting ${request.name}'s request.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError('');
              try {
                await rejectAdmissionRequest(request.id, reason);
                onOpenChange(false);
              } catch (submissionError) {
                setError(extractApiError(submissionError));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="reject-reason">Reason</Label>
        <Input id="reject-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </ResponsiveModal>
  );
}
