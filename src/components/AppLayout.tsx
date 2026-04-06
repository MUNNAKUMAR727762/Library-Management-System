import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TopNavbar } from '@/components/TopNavbar';
import { BackgroundActivityIndicator } from '@/components/BackgroundActivityIndicator';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNavbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
          <BackgroundActivityIndicator />
        </div>
      </div>
    </SidebarProvider>
  );
}
