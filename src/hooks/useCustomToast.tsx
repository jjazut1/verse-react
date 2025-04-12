import { useState, useCallback } from 'react';

export interface ToastOptions {
  title: string;
  description?: string;
  status: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

export const useCustomToast = () => {
  const [toastMessage, setToastMessage] = useState<ToastOptions | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToastMessage(options);
    setTimeout(() => {
      setToastMessage(null);
    }, options.duration);
  }, []);

  return { toastMessage, showToast };
};

export const ToastComponent = ({ toastMessage }: { toastMessage: ToastOptions | null }) => {
  if (!toastMessage) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg text-white ${getStatusColor(
        toastMessage.status
      )} shadow-lg transition-opacity duration-300`}
      style={{ zIndex: 1000 }}
    >
      <h3 className="font-bold">{toastMessage.title}</h3>
      {toastMessage.description && (
        <p className="mt-1">{toastMessage.description}</p>
      )}
    </div>
  );
}; 