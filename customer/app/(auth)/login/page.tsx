'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

const SAVED_ACCOUNTS_KEY = 'ardab_saved_customer_emails';

export default function LoginPage() {
  const { login, loginWithGoogle, loading, error, clearError, isAuthenticated } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, router]);

  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [selectedSavedEmail, setSelectedSavedEmail] = useState<string | null>(null);
  const [isUsingSavedEmail, setIsUsingSavedEmail] = useState<boolean>(false);

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Google Account Chooser Modal State
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState<string>('');
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Load saved accounts from localStorage safely on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validEmails = parsed.filter((e) => typeof e === 'string' && e.includes('@'));
          setSavedEmails(validEmails);
          if (validEmails.length > 0) {
            setSelectedSavedEmail(validEmails[0]);
            setIsUsingSavedEmail(true);
            setIdentifier(validEmails[0]);
          }
        }
      }
    } catch {
      // Storage access fallback
    }
  }, []);

  const handleSelectSavedEmail = (email: string) => {
    setSelectedSavedEmail(email);
    setIdentifier(email);
    setLoginMethod('email');
    clearError();
    setLocalError(null);
  };

  const handleRemoveSavedEmail = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = savedEmails.filter((e) => e !== emailToRemove);
    setSavedEmails(updated);
    try {
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch {}
    if (selectedSavedEmail === emailToRemove) {
      if (updated.length > 0) {
        setSelectedSavedEmail(updated[0]);
        setIdentifier(updated[0]);
      } else {
        setSelectedSavedEmail(null);
        setIsUsingSavedEmail(false);
        setIdentifier('');
      }
    }
  };

  const handleSwitchToDifferentAccount = () => {
    setIsUsingSavedEmail(false);
    setSelectedSavedEmail(null);
    setIdentifier('');
    setPassword('');
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setLocalError(
        loginMethod === 'phone'
          ? (language === 'am' ? 'እባክዎ ስልክ ቁጥር ያስገቡ' : 'Please enter your phone number')
          : (language === 'am' ? 'እባክዎ ኢሜይል ያስገቡ' : 'Please enter your email')
      );
      return;
    }

    if (!password) {
      setLocalError(language === 'am' ? 'እባክዎ የይለፍ ቃል ያስገቡ' : 'Please enter your password');
      return;
    }

    try {
      const res = await login({ identifier: cleanId, password });
      if (res && res.success) {
        // If email was used, store it safely in saved accounts
        if (cleanId.includes('@')) {
          try {
            const currentList = savedEmails.filter((e) => e.toLowerCase() !== cleanId.toLowerCase());
            const newList = [cleanId.toLowerCase(), ...currentList].slice(0, 5);
            localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(newList));
          } catch {}
        }
        router.push('/');
      }
    } catch (err: any) {
      setLocalError(
        err.message || (language === 'am' ? 'መግባት አልተሳካም። እባክዎ መረጃዎን ያረጋግጡ።' : 'Sign in failed. Please check your credentials.')
      );
    }
  };

  const handleGoogleAccountSelect = async (emailToLogin: string) => {
    const clean = emailToLogin.trim().toLowerCase();
    if (!clean) return;

    setGoogleLoading(true);
    setGoogleError(null);
    clearError();
    setLocalError(null);

    try {
      const res = await loginWithGoogle({ email: clean });
      if (res && res.success) {
        // Add to saved accounts on device
        try {
          const currentList = savedEmails.filter((e) => e.toLowerCase() !== clean);
          const newList = [clean, ...currentList].slice(0, 5);
          localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(newList));
        } catch {}
        setShowGoogleModal(false);
        router.push('/');
      }
    } catch (err: any) {
      setGoogleError(
        err.message || (language === 'am' ? 'በጉግል መግባት አልተሳካም። ይህ ኢሜይል መመዝገቡን ያረጋግጡ።' : 'Google sign-in failed. Please verify this email is registered.')
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            {/* Header */}
            <div className="card-header bg-success text-white text-center py-4 border-0">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 shadow mb-3 border border-2 border-white object-fit-cover"
                style={{ width: '56px', height: '56px' }}
              />
              <h3 className="fw-bold mb-0">
                {language === 'am' ? 'ወደ አርዳብ ገበያ ይግቡ' : 'Sign In to Ardab Market'}
              </h3>
              <p className="small text-white-70 mb-0">
                {language === 'am' ? 'በኢሜይል ወይም በስልክ ቁጥርዎ በቀላሉ ይግቡ' : 'Enter your credentials to access your account'}
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              {/* Feedback Error Alert */}
              {(localError || error) && (
                <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2 fs-5"></i>
                  <div className="small">{localError || error}</div>
                </div>
              )}

              {/* Saved Email Quick Selectors (if available on device) */}
              {savedEmails.length > 0 && (
                <div className="mb-3 p-3 bg-light rounded-3 border border-light-subtle">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-semibold text-secondary">
                      <i className="bi bi-clock-history me-1 text-success"></i>
                      {language === 'am' ? 'የተቀመጡ ኢሜይሎች' : 'Saved Accounts'}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary small">
                      {savedEmails.length}
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {savedEmails.map((email) => {
                      const isSelected = identifier.toLowerCase() === email.toLowerCase();
                      return (
                        <div
                          key={email}
                          className={`d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill border small transition-all ${
                            isSelected
                              ? 'bg-success text-white border-success fw-semibold'
                              : 'bg-white text-dark border-secondary-subtle'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSelectSavedEmail(email)}
                        >
                          <i className={`bi bi-person-circle ${isSelected ? 'text-white' : 'text-success'}`}></i>
                          <span>{email}</span>
                          <button
                            type="button"
                            className={`btn btn-link p-0 ms-1 line-height-1 ${isSelected ? 'text-white' : 'text-muted'}`}
                            style={{ fontSize: '0.85rem' }}
                            title={language === 'am' ? 'አስወግድ' : 'Remove'}
                            onClick={(e) => handleRemoveSavedEmail(e, email)}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                {/* Identifier Input (Always directly visible and active) */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold mb-0" htmlFor="login-identifier">
                      {loginMethod === 'phone'
                        ? (language === 'am' ? 'ስልክ ቁጥር' : 'Phone Number')
                        : (language === 'am' ? 'ኢሜይል አድራሻ' : 'Email Address')}{' '}
                      <span className="text-danger">*</span>
                    </label>

                    {/* Toggle login method */}
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-success p-0 text-decoration-none small"
                      onClick={() => {
                        setLoginMethod(loginMethod === 'email' ? 'phone' : 'email');
                        setIdentifier('');
                        clearError();
                        setLocalError(null);
                      }}
                    >
                      {loginMethod === 'email'
                        ? (language === 'am' ? 'በስልክ ቁጥር ይግቡ' : 'Use phone instead')
                        : (language === 'am' ? 'በኢሜይል ይግቡ' : 'Use email instead')}
                    </button>
                  </div>

                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <i className={`bi ${loginMethod === 'phone' ? 'bi-phone' : 'bi-envelope'}`}></i>
                    </span>
                    <input
                      type={loginMethod === 'phone' ? 'tel' : 'email'}
                      id="login-identifier"
                      name="identifier"
                      required
                      autoComplete={loginMethod === 'email' ? 'email' : 'tel'}
                      className="form-control"
                      placeholder={
                        loginMethod === 'phone'
                          ? 'e.g. 0911223344 or +251 9...'
                          : 'e.g. name@domain.com'
                      }
                      value={identifier}
                      onChange={(e) => {
                        clearError();
                        setLocalError(null);
                        setIdentifier(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* Password Input (ALWAYS required for real authentication - No fake auto-login) */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold mb-0" htmlFor="login-password">
                      {language === 'am' ? 'የይለፍ ቃል' : 'Password'} <span className="text-danger">*</span>
                    </label>
                    <Link href="/forgot-password" className="text-success small fw-semibold text-decoration-none">
                      {language === 'am' ? 'የይለፍ ቃል ረሱ?' : 'Forgot Password?'}
                    </Link>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <i className="bi bi-lock"></i>
                    </span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      id="login-password"
                      name="password"
                      required
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        clearError();
                        setLocalError(null);
                        setPassword(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPass(!showPass)}
                      title="Toggle password visibility"
                      aria-label="Toggle password visibility"
                    >
                      <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !identifier || !password}
                  className="btn btn-fresh w-100 py-2 rounded-pill fw-bold shadow-sm mt-3"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {language === 'am' ? 'በመግባት ላይ...' : 'Signing In...'}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-1"></i>
                      {language === 'am' ? 'ይግቡ' : 'Sign In'}
                    </>
                  )}
                </button>
              </form>

              {/* 1.3 GOOGLE & SECONDARY METHODS PLACED BELOW PRIMARY LOGIN */}
              <div className="position-relative my-4 text-center">
                <hr className="border-secondary opacity-25" />
                <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 small text-muted text-uppercase fw-semibold">
                  {language === 'am' ? 'ወይም' : 'OR'}
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                {/* Secondary Option: Continue with Phone (if not currently in phone mode) */}
                {loginMethod === 'email' && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 py-2 rounded-pill fw-semibold small d-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      setIsUsingSavedEmail(false);
                      setLoginMethod('phone');
                      setIdentifier('');
                      clearError();
                      setLocalError(null);
                    }}
                  >
                    <i className="bi bi-telephone text-success"></i>
                    <span>{language === 'am' ? 'በስልክ ቁጥር ይቀጥሉ' : 'Continue with Phone'}</span>
                  </button>
                )}

                {/* Secondary Option: Continue with Google (Prompts device saved emails & logs in) */}
                <button
                  type="button"
                  onClick={() => {
                    setGoogleError(null);
                    setGoogleCustomEmail('');
                    setShowGoogleModal(true);
                  }}
                  className="btn btn-white border w-100 py-2 rounded-pill fw-semibold small d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{language === 'am' ? 'በጉግል ይቀጥሉ' : 'Continue with Google'}</span>
                </button>
              </div>
            </div>

            <div className="card-footer bg-light text-center py-3 border-0">
              <span className="text-muted small">
                {language === 'am' ? 'መለያ የለዎትም?' : "Don't have an account?"}{' '}
              </span>
              <Link href="/signup" className="text-success fw-bold text-decoration-none small ms-1">
                {language === 'am' ? 'ይመዝገቡ' : 'Sign Up'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Google Device Account Chooser Modal */}
      {showGoogleModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1060 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              {/* Google Header */}
              <div className="modal-header border-bottom bg-light px-4 py-3 align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <div>
                    <h6 className="modal-title fw-bold text-dark mb-0">
                      {language === 'am' ? 'መለያ ይምረጡ' : 'Choose an account'}
                    </h6>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {language === 'am' ? 'ወደ አርዳብ ገበያ ለመቀጠል' : 'to continue to Ardab Market'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowGoogleModal(false)}
                  disabled={googleLoading}
                  aria-label="Close"
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                {googleError && (
                  <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill flex-shrink-0 text-danger"></i>
                    <div>{googleError}</div>
                  </div>
                )}

                {/* List of Device Saved Accounts */}
                {savedEmails.length > 0 ? (
                  <div className="mb-4">
                    <label className="text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: '0.7rem' }}>
                      {language === 'am' ? 'በመሳሪያው ላይ የተቀመጡ መለያዎች' : 'Saved accounts on this device'}
                    </label>
                    <div className="list-group rounded-3 shadow-none border">
                      {savedEmails.map((email) => (
                        <button
                          key={email}
                          type="button"
                          disabled={googleLoading}
                          onClick={() => handleGoogleAccountSelect(email)}
                          className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-bottom text-start"
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: '#198754',
                                fontSize: '1rem',
                              }}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '220px' }}>
                                {email}
                              </div>
                              <small className="text-muted">
                                {language === 'am' ? 'የተመዘገበ የጉግል መለያ' : 'Registered Google account'}
                              </small>
                            </div>
                          </div>
                          <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 mb-3 bg-light rounded-3 p-3">
                    <i className="bi bi-person-badge fs-2 text-muted mb-2"></i>
                    <p className="text-muted small mb-0">
                      {language === 'am'
                        ? 'በዚህ መሳሪያ ላይ የተቀመጠ መለያ አልተገኘም። እባክዎ የተመዘገበውን የጉግል ኢሜይል ያስገቡ።'
                        : 'No saved accounts on this device yet. Enter your registered Google email below.'}
                    </p>
                  </div>
                )}

                {/* Add / Choose Another Google Account */}
                <div>
                  <label className="text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: '0.7rem' }}>
                    {language === 'am' ? 'ሌላ የጉግል መለያ ይጠቀሙ' : 'Use another Google account'}
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (googleCustomEmail.trim()) {
                        handleGoogleAccountSelect(googleCustomEmail.trim());
                      }
                    }}
                  >
                    <div className="input-group mb-3">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        required
                        disabled={googleLoading}
                        value={googleCustomEmail}
                        onChange={(e) => setGoogleCustomEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="form-control border-start-0"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={googleLoading || !googleCustomEmail.trim()}
                      className="btn btn-fresh w-100 py-2 rounded-pill fw-semibold shadow-sm"
                    >
                      {googleLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {language === 'am' ? 'በማረጋገጥ ላይ...' : 'Verifying & Signing In...'}
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-1"></i>
                          {language === 'am' ? 'በዚህ ኢሜይል ይግቡ' : 'Sign In with this Google Email'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light px-4 py-2 border-top justify-content-between">
                <small className="text-muted">
                  <i className="bi bi-shield-check text-success me-1"></i>
                  {language === 'am' ? 'የተጠበቀ የደህንነት ማረጋገጫ' : 'Encrypted Platform Security'}
                </small>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-secondary text-decoration-none"
                  onClick={() => setShowGoogleModal(false)}
                  disabled={googleLoading}
                >
                  {language === 'am' ? 'ዝጋ' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
