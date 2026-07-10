// frontend/src/components/users/DeleteConfirmationModal.tsx
import { AlertTriangle, X, CheckCircle, Trash2, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  user: User | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  user, 
  isDeleting, 
  onClose, 
  onConfirm 
}: DeleteConfirmationModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Deactivate User</h3>
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
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-medium text-gray-600">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Warning:</span> This action will deactivate this user's account. 
              They will lose access to the system immediately.
            </p>
            <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
              <li>User will not be able to log in</li>
              <li>All active sessions will be terminated</li>
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
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Deactivate User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
