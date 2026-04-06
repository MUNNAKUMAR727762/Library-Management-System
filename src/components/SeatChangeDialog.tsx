import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { ShiftMultiSelect } from '@/components/ShiftMultiSelect';
import { extractApiError, useApp } from '@/contexts/AppContext';
import { Student } from '@/lib/mock-data';

interface SeatChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function SeatChangeDialog({ open, onOpenChange, student }: SeatChangeDialogProps) {
  const { shifts, changeStudentSeat } = useApp();
  const [seatNumber, setSeatNumber] = useState(1);
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!student) return;
    setSeatNumber(student.seatNumber);
    setSelectedShiftIds(student.shiftIds?.length ? student.shiftIds : [student.shift]);
    setError('');
  }, [student]);

  if (!student) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change Seat"
      description={`Move ${student.name} to a new seat and update one or more assigned shifts.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError('');
              if (selectedShiftIds.length === 0 || selectedShiftIds.length > 3) {
                setError('Please select between 1 and 3 shifts.');
                setSaving(false);
                return;
              }
              try {
                await changeStudentSeat(student.id, seatNumber, selectedShiftIds);
                onOpenChange(false);
              } catch (submissionError) {
                setError(extractApiError(submissionError));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving...' : 'Save Seat Change'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-seat">New Seat</Label>
          <Input id="new-seat" type="number" min={1} max={41} value={seatNumber} onChange={(event) => setSeatNumber(Number(event.target.value))} />
        </div>
      </div>
      <div className="mt-4">
        <ShiftMultiSelect
          shifts={shifts}
          selectedShiftIds={selectedShiftIds}
          onChange={setSelectedShiftIds}
          label="Assigned Shifts After Seat Change"
          helperText="Keep one shift or combine up to 3 shifts on the same seat."
        />
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </ResponsiveModal>
  );
}
