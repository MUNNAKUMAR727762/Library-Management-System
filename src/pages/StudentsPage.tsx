import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentTable } from '@/components/StudentTable';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Sheet, UserPlus } from 'lucide-react';
import { StudentFormDialog } from '@/components/StudentFormDialog';
import { useApp } from '@/contexts/AppContext';
import { downloadCsv, downloadWordDocument, openPrintWindow } from '@/lib/export';
import { StudentDetailModal } from '@/components/StudentDetailModal';

export default function StudentsPage() {
  const { students, shifts } = useApp();
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStudentId = searchParams.get('studentId');
  const selectedStudent = selectedStudentId ? students.find((student) => student.id === selectedStudentId) ?? null : null;
  const initialTab = searchParams.get('tab') || undefined;
  const highlightBillingMonth = searchParams.get('billingMonth') || undefined;
  const rows = students.map((student) => ({
    name: student.name,
    mobile: student.mobile,
    fatherName: student.fatherName || '',
    fatherMobile: student.fatherNumber || '',
    aadharNumber: student.aadharNumber || '',
    seat: student.seatNumber,
    shifts: student.shiftIds.map((shiftId) => shifts.find((shift) => shift.id === shiftId)?.label ?? `Shift ${shiftId}`).join(', '),
    admissionDate: student.admissionDate,
    monthlyFee: student.monthlyFee,
    status: student.status,
  }));

  const openStudentDetail = (studentId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('studentId', studentId);
    if (!nextParams.get('tab')) {
      nextParams.set('tab', 'overview');
    }
    setSearchParams(nextParams);
  };

  const closeStudentDetail = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('studentId');
    nextParams.delete('tab');
    nextParams.delete('billingMonth');
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage student records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 self-start" onClick={() => downloadCsv('students-report.csv', rows)}>
            <Sheet size={16} /> Excel
          </Button>
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={() => downloadWordDocument('students-report.doc', 'Students Report', `
              <h1>Students Report</h1>
              <table>
                <thead><tr><th>Name</th><th>Mobile</th><th>Father Name</th><th>Father Mobile</th><th>Seat</th><th>Shifts</th><th>Admission</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>${rows.map((row) => `<tr><td>${row.name}</td><td>${row.mobile}</td><td>${row.fatherName}</td><td>${row.fatherMobile}</td><td>${row.seat}</td><td>${row.shifts}</td><td>${row.admissionDate}</td><td>${row.monthlyFee}</td><td>${row.status}</td></tr>`).join('')}</tbody>
              </table>
            `)}
          >
            <FileText size={16} /> Word
          </Button>
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={() => openPrintWindow('Students Report', `
              <h1>Students Report</h1>
              <table>
                <thead><tr><th>Name</th><th>Mobile</th><th>Father Name</th><th>Father Mobile</th><th>Seat</th><th>Shifts</th><th>Admission</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>${rows.map((row) => `<tr><td>${row.name}</td><td>${row.mobile}</td><td>${row.fatherName}</td><td>${row.fatherMobile}</td><td>${row.seat}</td><td>${row.shifts}</td><td>${row.admissionDate}</td><td>${row.monthlyFee}</td><td>${row.status}</td></tr>`).join('')}</tbody>
              </table>
            `)}
          >
            <Printer size={16} /> Print / PDF
          </Button>
          <Button className="gap-2 self-start" onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Add Student
          </Button>
        </div>
      </div>
      <StudentTable onViewStudent={openStudentDetail} />
      <StudentFormDialog open={open} onOpenChange={setOpen} />
      {selectedStudentId ? (
        <StudentDetailModal
          studentId={selectedStudentId}
          initialStudent={selectedStudent}
          initialTab={initialTab}
          highlightBillingMonth={highlightBillingMonth}
          onClose={closeStudentDetail}
        />
      ) : null}
    </div>
  );
}
