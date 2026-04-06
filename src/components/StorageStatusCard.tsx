import { useApp } from '@/contexts/AppContext';

function formatBytes(value: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export function StorageStatusCard() {
  const { storageSummary } = useApp();

  return (
    <div className="card-surface rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Atlas Storage</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor usage against the 512 MB free-cluster limit.</p>
        </div>
        <span className="text-sm font-semibold text-foreground">{storageSummary.percentUsed}% used</span>
      </div>

      <div className="space-y-2">
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${storageSummary.percentUsed > 80 ? 'bg-status-occupied' : storageSummary.percentUsed > 60 ? 'bg-status-pending' : 'bg-status-available'}`}
            style={{ width: `${Math.min(storageSummary.percentUsed, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Used: {formatBytes(storageSummary.usedBytes)}</span>
          <span>Free: {formatBytes(storageSummary.remainingBytes)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-secondary rounded-lg p-3">
          <p className="label-caps mb-1">Limit</p>
          <p className="text-sm font-semibold text-foreground">{formatBytes(storageSummary.limitBytes)}</p>
        </div>
        <div className="bg-secondary rounded-lg p-3">
          <p className="label-caps mb-1">Collections</p>
          <p className="text-sm font-semibold text-foreground">{storageSummary.collections}</p>
        </div>
        <div className="bg-secondary rounded-lg p-3">
          <p className="label-caps mb-1">Objects</p>
          <p className="text-sm font-semibold text-foreground">{storageSummary.objects}</p>
        </div>
        <div className="bg-secondary rounded-lg p-3">
          <p className="label-caps mb-1">Avg Object</p>
          <p className="text-sm font-semibold text-foreground">{formatBytes(storageSummary.avgObjectSize)}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg bg-secondary p-4">
          <p className="label-caps mb-3">Collection Breakdown</p>
          <div className="space-y-2">
            {(storageSummary.collectionBreakdown ?? []).slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.name}</span>
                <span className="text-muted-foreground">{formatBytes(item.storageBytes)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-secondary p-4">
          <p className="label-caps mb-3">Photo Usage</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-foreground">Files</span>
              <span className="text-muted-foreground">{storageSummary.photoUsage?.fileCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">Chunks</span>
              <span className="text-muted-foreground">{storageSummary.photoUsage?.chunkCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">Bytes</span>
              <span className="text-muted-foreground">{formatBytes(storageSummary.photoUsage?.totalBytes ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
