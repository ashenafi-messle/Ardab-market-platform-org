'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

function SetPasswordContent() {
  const { setPassword, loading, error, clearError } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [password, setPasswordVal] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tParam = searchParams.get('token');
    if (tParam) setToken(tParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!token) {
      setLocalError(
        language === 'am'
          ? 'የማረጋገጫ ቶክን ያስፈልጋል'
          : 'Verification token is required'
      );
      return;
    }

    if (password.length < 6) {
      setLocalError(
        language === 'am'
          ? 'የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች ሊኖሩት ይገባል'
          : 'Password must be at least 6 characters long'
      );
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(
        language === 'am'
          ? 'የይለፍ ቃሎቹ አይመሳሰሉም'
          : 'Passwords do not match'
      );
      return;
    }

    try {
      const emailParam = searchParams.get('email');
      const res = await setPassword(token, password, emailParam || undefined);
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err: any) {
      setLocalError(
        err.message ||
          (language === 'am'
            ? 'የይለፍ ቃል ማዘጋጀት አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
            : 'Failed to configure password. Please try again.')
      );
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-success text-white text-center py-4 border-0">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 shadow mb-3 border border-2 border-white object-fit-cover"
                style={{ width: '56px', height: '56px' }}
              />
              <h3 className="fw-bold mb-1">
                {language === 'am' ? 'አዲስ የይለፍ ቃል ያዘጋጁ' : 'Create Your Password'}
              </h3>
              <p className="small text-white-50 mb-0">
                {language === 'am'
                  ? 'ለመለያዎ አዲስ እና ጠንካራ የይለፍ ቃል ያስገቡ'
                  : 'Configure a secure password to complete your account setup'}
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              {success ? (
                <div className="text-center py-3">
                  <i className="bi bi-check-circle-fill text-success display-2 mb-3 d-inline-block"></i>
                  <h4 className="fw-bold text-success mb-2">
                    {language === 'am' ? 'የይለፍ ቃልዎ ተቀናብሯል!' : 'Password Set Successfully!'}
                  </h4>
                  <p className="text-muted mb-3">
                    {language === 'am'
                      ? 'የይለፍ ቃልዎ ተቀናብሯል! በራስ-ሰር በመግባት ወደ ገበያው በመሸጋገር ላይ...'
                      : 'Password configured! Signing you in and redirecting to the marketplace...'}
                  </p>
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {(localError || error) && (
                    <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
                      <div className="small">{localError || error}</div>
                    </div>
                  )}

                  {!searchParams.get('token') && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold" htmlFor="pass-token">
                        {language === 'am' ? 'የማረጋገጫ ሊንክ ቶክን' : 'Verification Token'}{' '}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="pass-token"
                        className="form-control"
                        placeholder="Paste verification token here"
                        value={token}
                        onChange={(e) => setToken(e.target.value.trim())}
                        required
                      />
                    </div>
                  )}

                  {/* Password */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="pass-input">
                      {language === 'am' ? 'አዲስ የይለፍ ቃል' : 'New Password'}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        id="pass-input"
                        className="form-control"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPasswordVal(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPass(!showPass)}
                        title="Toggle password visibility"
                      >
                        <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
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
                    <label className="form-label fw-semibold" htmlFor="confirm-pass-input">
                      {language === 'am' ? 'የይለፍ ቃል ማረጋገጫ' : 'Confirm Password'}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-lock-fill"></i>
                      </span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        id="confirm-pass-input"
                        className="form-control"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="btn btn-fresh w-100 py-2 rounded-pill fw-bold shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {language === 'am' ? 'በማስቀመጥ ላይ...' : 'Configuring...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2 me-1"></i>{' '}
                        {language === 'am' ? 'የይለፍ ቃል አስቀምጥና ግባ' : 'Set Password & Sign In'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-success"></div></div>}>
      <SetPasswordContent />
    </Suspense>
  );
}
