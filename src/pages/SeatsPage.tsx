import { ShiftTabs } from '@/components/ShiftTabs';
import { SeatGrid } from '@/components/SeatGrid';
import { useApp } from '@/contexts/AppContext';

export default function SeatsPage() {
  const { seats, activeShift } = useApp();
  const shiftSeats = seats.filter(s => s.shift === activeShift);
  const occupied = shiftSeats.filter(s => s.status === 'occupied').length;
  const available = shiftSeats.filter(s => s.status === 'available').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seat Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage library seating across shifts</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="card-surface px-4 py-2 rounded-lg">
            <span className="text-muted-foreground">Occupied: </span>
            <span className="font-semibold tabular-nums text-foreground">{occupied}</span>
          </div>
          <div className="card-surface px-4 py-2 rounded-lg">
            <span className="text-muted-foreground">Available: </span>
            <span className="font-semibold tabular-nums text-foreground">{available}</span>
          </div>
        </div>
      </div>

      <ShiftTabs />
      <SeatGrid />
    </div>
  );
}
