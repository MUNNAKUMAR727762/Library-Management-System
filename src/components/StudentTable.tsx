import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { User, Trash2 } from 'lucide-react';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { Button } from '@/components/ui/button';

interface StudentTableProps {
  onViewStudent: (studentId: string) => void;
}

export function StudentTable({ onViewStudent }: StudentTableProps) {
  const { students, removeStudent, searchQuery, shifts } = useApp();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getShiftLabel = (shiftIds: number[]) =>
    shiftIds.map((shiftId) => shifts.find((shift) => shift.id === shiftId)?.label ?? `Shift ${shiftId}`).join(', ');

  const filtered = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.mobile.includes(query) ||
      (student.fatherName || '').toLowerCase().includes(query) ||
      (student.fatherNumber || '').includes(query) ||
      (student.aadharNumber || '').includes(query) ||
      String(student.seatNumber).includes(query) ||
      getShiftLabel(student.shiftIds).toLowerCase().includes(query) ||
      student.status.toLowerCase().includes(query)
    );
  });

  const deletingStudent = students.find((student) => student.id === deletingId) ?? null;

  return (
    <>
      <div className="card-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Student', 'Mobile', 'Seat', 'Shift', 'Admission', 'Fee', 'Status', 'Actions'].map((header) => (
                  <th key={header} className="text-left px-4 py-3 label-caps whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No students found. Add one to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-foreground">{student.mobile}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-foreground">#{student.seatNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{getShiftLabel(student.shiftIds)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{student.admissionDate}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-foreground">Rs.{student.monthlyFee}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        student.status === 'active' ? 'bg-status-available/10 text-status-available' :
                        student.status === 'pending' ? 'bg-status-pending/10 text-status-pending' :
                        'bg-status-occupied/10 text-status-occupied'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onViewStudent(student.id)}>
                          Check / Update
                        </Button>
                        <button
                          onClick={() => setDeletingId(student.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmActionDialog
        open={Boolean(deletingStudent)}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        title="Remove Student"
        description={deletingStudent ? `Remove ${deletingStudent.name} from the system?` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (deletingStudent) {
            await removeStudent(deletingStudent.id);
            setDeletingId(null);
          }
        }}
      />
    </>
  );
}
