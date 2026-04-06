import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export function BackgroundActivityIndicator() {
  const activeFetches = useIsFetching();
  const activeMutations = useIsMutating();
  const isWorking = activeFetches + activeMutations > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (isWorking) {
      timer = window.setTimeout(() => setVisible(true), 180);
    } else {
      setVisible(false);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isWorking]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60]">
      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 size={18} className="animate-spin" />
        </div>
        <div className="pr-1">
          <p className="text-sm font-semibold text-foreground">
            {activeMutations > 0 ? 'Saving changes' : 'Syncing data'}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeMutations > 0 ? 'The system is updating in the background.' : 'Fresh data is loading in the background.'}
          </p>
        </div>
      </div>
    </div>
  );
}
