'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, clearError } = useCustomerAuth();
  const { language } = useLanguage();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError(
        language === 'am'
          ? 'እባክዎ ኢሜይልዎን ያስገቡ'
          : 'Please enter your email address'
      );
      return;
    }

    try {
      await forgotPassword(trimmed);
      setSubmitted(true);
    } catch (err: any) {
      // Keep enumeration-safe UX even on failure unless network failure
      setLocalError(
        err.message ||
          (language === 'am'
            ? 'ጥያቄውን ማስተናገድ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
            : 'Unable to process request. Please try again.')
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
                {language === 'am' ? 'የይለፍ ቃል ረሱ?' : 'Forgot Password?'}
              </h3>
              <p className="small text-white-50 mb-0">
                {language === 'am'
                  ? 'መለያዎን መልሰው ለማግኘት ኢሜይልዎን ያስገቡ'
                  : 'Enter your email to receive a password reset link'}
              </p>
            </div>

            {/* Body */}
            <div className="card-body p-4 p-md-5">
              {submitted ? (
                <div className="text-center py-3">
                  <div className="mb-3">
                    <span className="badge rounded-pill bg-success-subtle text-success p-3 fs-3">
                      <i className="bi bi-envelope-check-fill"></i>
                    </span>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">
                    {language === 'am' ? 'የማስተካከያ ሊንክ ተልኳል' : 'Reset Link Sent'}
                  </h4>
                  <p className="text-muted small mb-4">
                    {language === 'am'
                      ? 'በዚህ ኢሜይል መለያ ካለ የይለፍ ቃልዎን የሚቀይሩበት ደህንነቱ የተጠበቀ ሊንክ ልከንልዎታል። እባክዎ የገቢ መልዕክት ሳጥንዎን ይመልከቱ።'
                      : 'If an account exists with this email address, we have sent a secure password reset link. Please check your inbox and spam folder.'}
                  </p>

                  <div className="bg-light p-3 rounded-3 text-start small mb-4 border">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-info-circle-fill text-success me-2 mt-1 flex-shrink-0"></i>
                      <span className="text-muted">
                        {language === 'am'
                          ? 'ሊንኩ ለ 60 ደቂቃዎች ብቻ የሚያገለግል ነው። ካልደረስዎ ከጥቂት ደቂቃዎች በኋላ እንደገና መሞከር ይችላሉ።'
                          : 'The link is valid for 60 minutes. If you do not see the email, please check your spam folder.'}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="btn btn-outline-secondary rounded-pill py-2 fw-semibold"
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      {language === 'am' ? 'በሌላ ኢሜይል እንደገና ይሞክሩ' : 'Try Another Email'}
                    </button>
                    <Link
                      href="/login"
                      className="btn btn-fresh rounded-pill py-2 fw-bold text-decoration-none shadow-sm"
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      {language === 'am' ? 'ወደ መግቢያ ተመለስ' : 'Back to Sign In'}
                    </Link>
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

                  <div className="mb-4">
                    <label className="form-label fw-semibold" htmlFor="reset-email">
                      {language === 'am' ? 'የመለያ ኢሜይል' : 'Account Email'}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        id="reset-email"
                        required
                        className="form-control"
                        placeholder="example@domain.com"
                        value={email}
                        onChange={(e) => {
                          clearError();
                          setLocalError(null);
                          setEmail(e.target.value);
                        }}
                      />
                    </div>
                    <div className="form-text small text-muted">
                      {language === 'am'
                        ? 'በተመዘገቡበት ኢሜይል ላይ የይለፍ ቃል ማስተካከያ ሊንክ ይላክልዎታል'
                        : 'We will send a password reset link to this email'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="btn btn-fresh w-100 py-2 rounded-pill fw-bold shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {language === 'am' ? 'በመላክ ላይ...' : 'Sending Link...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-1"></i>
                        {language === 'am' ? 'የማስተካከያ ሊንክ ላክ' : 'Send Reset Link'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="card-footer bg-light text-center py-3 border-0">
              <span className="text-muted small">
                {language === 'am' ? 'የይለፍ ቃልዎን አስታወሱ?' : 'Remember your password?'}{' '}
              </span>
              <Link href="/login" className="text-success fw-bold text-decoration-none small ms-1">
                {language === 'am' ? 'ይግቡ' : 'Sign In'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
