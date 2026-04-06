import { DashboardCards } from '@/components/DashboardCards';
import { DashboardCharts } from '@/components/DashboardCharts';
import { ShiftTabs } from '@/components/ShiftTabs';
import { SeatGrid } from '@/components/SeatGrid';
import { StorageStatusCard } from '@/components/StorageStatusCard';

export default function Index() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of library operations</p>
      </div>

      <DashboardCards />
      <DashboardCharts />
      <StorageStatusCard />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Seat Map</h2>
        <ShiftTabs />
        <SeatGrid />
      </div>
    </div>
  );
}
