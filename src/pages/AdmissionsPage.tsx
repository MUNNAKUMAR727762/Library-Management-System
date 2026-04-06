import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AdmissionApprovalDialog } from '@/components/AdmissionApprovalDialog';
import { AdmissionRejectDialog } from '@/components/AdmissionRejectDialog';

export default function AdmissionsPage() {
  const { admissionRequests, shifts } = useApp();
  const [activeAction, setActiveAction] = useState<{ type: 'approve' | 'reject'; requestId: string } | null>(null);

  const approvingRequest =
    activeAction?.type === 'approve'
      ? admissionRequests.find((request) => request.id === activeAction.requestId) ?? null
      : null;
  const rejectingRequest =
    activeAction?.type === 'reject'
      ? admissionRequests.find((request) => request.id === activeAction.requestId) ?? null
      : null;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Review QR-based public admission requests</p>
        </div>

        <div className="card-surface rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Applicant', 'Mobile', 'Seat', 'Shift', 'Submitted', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="text-left px-4 py-3 label-caps whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admissionRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No admission requests yet.
                    </td>
                  </tr>
                ) : (
                  admissionRequests.map((request) => (
                    <tr key={request.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{request.name}</div>
                        {request.fatherName ? <div className="text-xs text-muted-foreground mt-1">Father Name: {request.fatherName}</div> : null}
                        {request.fatherNumber ? <div className="text-xs text-muted-foreground mt-1">Father Mobile: {request.fatherNumber}</div> : null}
                        {request.aadharNumber ? <div className="text-xs text-muted-foreground mt-1">Aadhar: {request.aadharNumber}</div> : null}
                        {request.notes ? <div className="text-xs text-muted-foreground mt-1">{request.notes}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{request.mobile}</td>
                      <td className="px-4 py-3 text-sm text-foreground">#{request.seatNumber}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{shifts.find((shift) => shift.id === request.shiftId)?.label}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{request.createdAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          request.status === 'approved' ? 'bg-status-available/10 text-status-available' :
                          request.status === 'rejected' ? 'bg-status-occupied/10 text-status-occupied' :
                          'bg-status-pending/10 text-status-pending'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setActiveAction({ type: 'approve', requestId: request.id })}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => setActiveAction({ type: 'reject', requestId: request.id })}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{request.rejectionReason || 'Reviewed'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdmissionApprovalDialog
        key={`approve-${approvingRequest?.id ?? 'none'}`}
        open={Boolean(approvingRequest)}
        onOpenChange={(open) => { if (!open) setActiveAction(null); }}
        request={approvingRequest}
      />
      <AdmissionRejectDialog
        key={`reject-${rejectingRequest?.id ?? 'none'}`}
        open={Boolean(rejectingRequest)}
        onOpenChange={(open) => { if (!open) setActiveAction(null); }}
        request={rejectingRequest}
      />
    </>
  );
}
