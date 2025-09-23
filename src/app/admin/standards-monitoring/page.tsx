import { Metadata } from 'next';
import { StandardsMonitoringDashboard } from '@/components/dashboard/standards-monitoring-dashboard';

export const metadata: Metadata = {
  title: 'Monitoring des Standards | SIGB UdM',
  description: 'Surveillance et métriques de performance des standards bibliographiques',
};

export default function StandardsMonitoringPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <StandardsMonitoringDashboard />
    </div>
  );
}