import VehicleRequestsPage from '../VehicleRequestsPage';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export default function InboundPage() {
  const user = useSelector((state: RootState) => state.auth.user);

  const isRestricted = user?.team && user.team !== 'general' && user.team !== 'inbound';

  if (isRestricted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You don't have permission to view Inbound requests</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate 
      permission="inbound.read"
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have permission to view Inbound requests</p>
          </div>
        </div>
      }
    >
      <VehicleRequestsPage requestType="inbound" />
    </PermissionGate>
  );
}
