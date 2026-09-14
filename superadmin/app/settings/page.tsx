'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { isSubAdmin } = useAuth();

  useEffect(() => {
    // Platform settings removed from Super Admin scope
    if (isSubAdmin) {
      router.replace('/subadmin/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [isSubAdmin, router]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="text-center p-4">
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
        <p className="text-muted small mb-0">Redirecting to active operations dashboard...</p>
      </div>
    </div>
  );
}
