'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

function ResetPasswordContent() {
  const { resetPassword, loading, error, clearError } = useCustomerAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tParam = searchParams.get('token');
    const eParam = searchParams.get('email');
    if (tParam) setToken(tParam);
    if (eParam) setEmail(eParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!token) {
      setLocalError(
        language === 'am'
          ? 'የማረጋገጫ ሊንኩ ልክ ያልሆነ ወይም የጎደለ ነው። እባክዎ ከኢሜይልዎ ላይ ሙሉውን ሊንክ ይክፈቱ።'
          : 'Invalid or missing reset token. Please open the link directly from your email.'
      );
      return;
    }

    if (newPassword.length < 6) {
      setLocalError(
        language === 'am'
          ? 'የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች ሊኖሩት ይገባል'
          : 'Password must be at least 6 characters long'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(
        language === 'am'
          ? 'የይለፍ ቃሎቹ አይመሳሰሉም'
          : 'Passwords do not match'
      );
      return;
    }

    try {
      const res = await resetPassword({
        token,
        email: email || undefined,
        password: newPassword,
      });

      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setLocalError(
        err.message ||
          (language === 'am'
            ? 'የይለፍ ቃል መቀየር አልተሳካም። ሊንኩ ጊዜው አልፎበት ሊሆን ስለሚችል አዲስ ሊንክ ይጠይቁ።'
            : 'Password reset failed. The link may have expired or is invalid.')
      );
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            {/* Header */}
            <div className="card-header bg-success text-white text-center py-4 border-0">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 shadow mb-3 border border-2 border-white object-fit-cover"
                style={{ width: '56px', height: '56px' }}
              />
              <h3 className="fw-bold mb-1">
                {language === 'am' ? 'አዲስ የይለፍ ቃል ያዘጋጁ' : 'Reset Your Password'}
              </h3>
              <p className="small text-white-50 mb-0">
                {language === 'am'
                  ? 'ለመለያዎ አዲስ እና ጠንካራ የይለፍ ቃል ያስገቡ'
                  : 'Create a new secure password for your account'}
              </p>
            </div>

            {/* Body */}
            <div className="card-body p-4 p-md-5">
              {success ? (
                <div className="text-center py-3">
                  <i className="bi bi-check-circle-fill text-success display-2 mb-3 d-inline-block"></i>
                  <h4 className="fw-bold text-success mb-2">
                    {language === 'am' ? 'የይለፍ ቃልዎ ተቀይሯል!' : 'Password Changed!'}
                  </h4>
                  <p className="text-muted small mb-4">
                    {language === 'am'
                      ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል። ወደ መግቢያ ገጽ በመሸጋገር ላይ...'
                      : 'Your password has been reset successfully. Redirecting you to sign in...'}
                  </p>
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {(localError || error) && (
                    <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
                      <div className="small">{localError || error}</div>
                    </div>
                  )}

                  {!searchParams.get('token') && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold" htmlFor="reset-token">
                        {language === 'am' ? 'የማረጋገጫ ኮድ / ቶክን' : 'Reset Token'}{' '}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="reset-token"
                        required
                        className="form-control"
                        placeholder="Paste reset token here"
                        value={token}
                        onChange={(e) => setToken(e.target.value.trim())}
                      />
                    </div>
                  )}

                  {/* New Password */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="new-pass">
                      {language === 'am' ? 'አዲስ የይለፍ ቃል' : 'New Password'}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-pass"
                        required
                        minLength={6}
                        className="form-control"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => {
                          clearError();
                          setLocalError(null);
                          setNewPassword(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        title="Toggle password visibility"
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                    <div className="form-text small text-muted">
                      {language === 'am'
                        ? 'ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት'
                        : 'Must be at least 6 characters long'}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold" htmlFor="confirm-pass">
                      {language === 'am' ? 'የይለፍ ቃል ማረጋገጫ' : 'Confirm Password'}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-lock-fill"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirm-pass"
                        required
                        minLength={6}
                        className="form-control"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          clearError();
                          setLocalError(null);
                          setConfirmPassword(e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="btn btn-fresh w-100 py-2 rounded-pill fw-bold shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {language === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check me-1"></i>
                        {language === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset Password'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="card-footer bg-light text-center py-3 border-0">
              <Link href="/login" className="text-success fw-bold text-decoration-none small">
                <i className="bi bi-arrow-left me-1"></i>
                {language === 'am' ? 'ወደ መግቢያ ተመለስ' : 'Back to Sign In'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
