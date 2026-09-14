'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SecurityPage() {
  const router = useRouter();
  const { isSubAdmin } = useAuth();

  useEffect(() => {
    // Security & Audit management is strictly handled by Sub Admin
    if (isSubAdmin) {
      router.replace('/subadmin/security');
    } else {
      router.replace('/dashboard');
    }
  }, [isSubAdmin, router]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="text-center p-4">
        <div className="spinner-border text-teal mb-3" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
        <p className="text-muted small mb-0">Redirecting to authorized command center...</p>
      </div>
    </div>
  );
}
