import { Navbar } from '@/components/layout/Navbar';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Dashboard />
    </div>
  );
}
