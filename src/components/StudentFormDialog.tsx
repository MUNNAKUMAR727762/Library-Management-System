import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp, extractApiError } from '@/contexts/AppContext';
import { Student } from '@/lib/mock-data';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { ShiftMultiSelect } from '@/components/ShiftMultiSelect';
import { Loader2 } from 'lucide-react';

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

const defaultForm = {
  name: '',
  mobile: '',
  fatherName: '',
  fatherNumber: '',
  aadharNumber: '',
  seatNumber: 1,
  shiftIds: [1],
  admissionDate: '',
  monthlyFee: 800,
  status: 'active',
  photo: '',
};

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
  const { addStudent, updateStudent, shifts } = useApp();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name,
        mobile: student.mobile,
        fatherName: student.fatherName || '',
        fatherNumber: student.fatherNumber || '',
        aadharNumber: student.aadharNumber || '',
        seatNumber: student.seatNumber,
        shiftIds: student.shiftIds?.length ? student.shiftIds : [student.shift],
        admissionDate: student.admissionDate,
        monthlyFee: student.monthlyFee,
        status: student.status,
        photo: student.photo || '',
      });
      return;
    }

    setForm({
      ...defaultForm,
      shiftIds: [shifts[0]?.id ?? 1],
      admissionDate: new Date().toISOString().slice(0, 10),
    });
  }, [open, shifts, student]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const mobilePattern = /^[6-9]\d{9}$/;
    if (!mobilePattern.test(form.mobile)) {
      setError('Student mobile must be a valid 10-digit Indian mobile number.');
      setSaving(false);
      return;
    }
    if (form.fatherNumber && !mobilePattern.test(form.fatherNumber)) {
      setError('Father mobile number must be a valid 10-digit Indian mobile number.');
      setSaving(false);
      return;
    }
    if (form.aadharNumber && !/^\d{12}$/.test(form.aadharNumber)) {
      setError('Aadhar number must be 12 digits.');
      setSaving(false);
      return;
    }
    if (!form.shiftIds.length || form.shiftIds.length > 3) {
      setError('Please select between 1 and 3 shifts.');
      setSaving(false);
      return;
    }
    try {
      if (student) {
        await updateStudent(student.id, {
          name: form.name,
          mobile: form.mobile,
          father_name: form.fatherName,
          father_number: form.fatherNumber,
          aadhar_number: form.aadharNumber,
          shift_ids: form.shiftIds,
          admission_date: form.admissionDate,
          monthly_fee: Number(form.monthlyFee),
          status: form.status,
          photo_url: form.photo,
        });
      } else {
        await addStudent({
          name: form.name,
          mobile: form.mobile,
          father_name: form.fatherName,
          father_number: form.fatherNumber,
          aadhar_number: form.aadharNumber,
          seat_number: Number(form.seatNumber),
          shift_ids: form.shiftIds,
          admission_date: form.admissionDate,
          monthly_fee: Number(form.monthlyFee),
          status: form.status,
          photo_url: form.photo,
        });
      }
      onOpenChange(false);
    } catch (submissionError) {
      setError(extractApiError(submissionError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={student ? 'Edit Student' : 'Add Student'}
      description="Create or update a student profile with seat and up to 3 selected shifts."
      className="max-w-2xl"
      footer={
        <Button type="submit" form="student-form" className="w-full sm:w-auto" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Saving...' : student ? 'Save Changes' : 'Create Student'}
        </Button>
      }
    >
        <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">Name</Label>
            <Input
              id="student-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-mobile">Mobile</Label>
            <Input
              id="student-mobile"
              value={form.mobile}
              onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-father-name">Father Name</Label>
              <Input
                id="student-father-name"
                value={form.fatherName}
                onChange={(event) => setForm((current) => ({ ...current, fatherName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-father-number">Father Mobile Number</Label>
              <Input
                id="student-father-number"
                value={form.fatherNumber}
                onChange={(event) => setForm((current) => ({ ...current, fatherNumber: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-aadhar-number">Aadhar Number</Label>
            <Input
              id="student-aadhar-number"
              value={form.aadharNumber}
              onChange={(event) => setForm((current) => ({ ...current, aadharNumber: event.target.value }))}
            />
          </div>
          {!student && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-seat">Seat</Label>
                <Input
                  id="student-seat"
                  type="number"
                  min={1}
                  max={41}
                  value={form.seatNumber}
                  onChange={(event) => setForm((current) => ({ ...current, seatNumber: Number(event.target.value) }))}
                  required
                />
              </div>
              <ShiftMultiSelect shifts={shifts} selectedShiftIds={form.shiftIds} onChange={(shiftIds) => setForm((current) => ({ ...current, shiftIds }))} />
            </div>
          )}
          {student ? (
            <ShiftMultiSelect shifts={shifts} selectedShiftIds={form.shiftIds} onChange={(shiftIds) => setForm((current) => ({ ...current, shiftIds }))} />
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admission-date">Admission Date</Label>
              <Input
                id="admission-date"
                type="date"
                value={form.admissionDate}
                onChange={(event) => setForm((current) => ({ ...current, admissionDate: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-fee">Monthly Fee</Label>
              <Input
                id="student-fee"
                type="number"
                min={0}
                value={form.monthlyFee}
                onChange={(event) => setForm((current) => ({ ...current, monthlyFee: Number(event.target.value) }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-status">Status</Label>
              <select
                id="student-status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-photo">Photo URL</Label>
              <Input
                id="student-photo"
                value={form.photo}
                onChange={(event) => setForm((current) => ({ ...current, photo: event.target.value }))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
    </ResponsiveModal>
  );
}
