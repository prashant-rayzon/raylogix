// frontend/src/components/transporters/DeleteConfirmationModal.tsx
import { AlertTriangle, X, CheckCircle, Trash2, Loader2, Truck } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  transporter: Transporter | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface Transporter {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'blocked';
  isAvailable?: boolean;
  isVerified?: boolean;
  gstNumber?: string;
  panNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export function DeleteConfirmationModal({ 
  isOpen, 
  transporter, 
  isDeleting, 
  onClose, 
  onConfirm 
}: DeleteConfirmationModalProps) {
  if (!isOpen || !transporter) return null;

  const isActive = (transporter.status || 'inactive') === 'active' && transporter.isAvailable !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Deactivate Transporter</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {transporter.name}
              </p>
              {transporter.companyName && (
                <p className="text-xs text-gray-400">{transporter.companyName}</p>
              )}
              <div className="flex flex-col gap-0.5 mt-0.5">
                {transporter.email && (
                  <p className="text-sm text-gray-500">{transporter.email}</p>
                )}
                {transporter.phone && (
                  <p className="text-xs text-gray-400">{transporter.phone}</p>
                )}
              </div>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Warning:</span> This action will deactivate this transporter's account. 
              They will lose access to the system immediately.
            </p>
            <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
              <li>Transporter will not be able to log in</li>
              <li>All active sessions will be terminated</li>
              <li>All associated bookings will be cancelled</li>
              <li>This action can be reversed by an admin</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || !isActive}
            className={`px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Deactivate Transporter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
