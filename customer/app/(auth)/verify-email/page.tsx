'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

function VerifyEmailContent() {
  const { verifyEmail, resendVerification } = useCustomerAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Execution guard: Guarantee verification executes EXACTLY ONCE per mount (prevents React StrictMode/loop duplication)
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;

    if (!tokenParam) {
      setErrorMessage(
        language === 'am'
          ? 'የማረጋገጫ ሊንኩ ልክ ያልሆነ ወይም የጎደለ ነው። እባክዎ ከኢሜይልዎ ላይ ሙሉውን ሊንክ ይክፈቱ።'
          : 'Invalid or missing verification token. Please open the link sent directly to your email.'
      );
      return;
    }

    hasExecutedRef.current = true;
    setVerifying(true);
    setErrorMessage(null);

    async function executeVerification() {
      try {
        const res = await verifyEmail(tokenParam as string, emailParam || undefined);

        if (res && (res.success || res.verified)) {
          if (res.alreadyVerified) {
            setAlreadyVerified(true);
          } else {
            setSuccess(true);
          }

          // Seamless redirect to Set Password with token and email context
          setTimeout(() => {
            const redirectEmail = emailParam ? `&email=${encodeURIComponent(emailParam)}` : '';
            router.push(`/set-password?token=${encodeURIComponent(tokenParam as string)}${redirectEmail}`);
          }, 1400);
        } else {
          setErrorMessage(
            language === 'am'
              ? 'የማረጋገጫ ሊንኩ ጊዜው አልፎበታል ወይም ጥቅም ላይ ውሏል። እባክዎ አዲስ ሊንክ ይጠይቁ።'
              : 'This verification link is invalid or has expired. Please request a new link.'
          );
        }
      } catch (err: any) {
        const msg = err.message || '';
        const isExp = msg.toLowerCase().includes('expired') || msg.includes('TOKEN_EXPIRED');
        setIsExpired(isExp);

        if (isExp) {
          setErrorMessage(
            language === 'am'
              ? 'የማረጋገጫ ሊንኩ ጊዜው አልፎበታል። እባክዎ አዲስ የማረጋገጫ ኢሜይል ይጠይቁ።'
              : 'Your verification link has expired. Please request a new verification email.'
          );
        } else {
          setErrorMessage(
            msg ||
              (language === 'am'
                ? 'ኢሜይል ማረጋገጥ አልተሳካም። ሊንኩ ጊዜው አልፎበት ሊሆን ስለሚችል እባክዎ እንደገና ይሞክሩ።'
                : 'Email verification failed. The link may have expired or is invalid.')
          );
        }
      } finally {
        setVerifying(false);
      }
    }

    executeVerification();
  }, [tokenParam, emailParam, router, verifyEmail, language]);

  const handleResend = async () => {
    if (!emailParam) {
      router.push('/signup');
      return;
    }
    setResending(true);
    setResendStatus(null);
    try {
      await resendVerification(emailParam);
      setResendStatus(
        language === 'am'
          ? 'አዲስ የማረጋገጫ ሊንክ ወደ ኢሜይልዎ ተልኳል። እባክዎ ኢሜይልዎን ይመልከቱ።'
          : 'A fresh verification link has been sent to your email. Please check your inbox.'
      );
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden text-center">
            <div className="card-header bg-success text-white py-4 border-0">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 shadow mb-3 border border-2 border-white object-fit-cover"
                style={{ width: '56px', height: '56px' }}
              />
              <h3 className="fw-bold mb-0">
                {language === 'am' ? 'ኢሜይልዎን ማረጋገጥ' : 'Verifying Your Email'}
              </h3>
            </div>

            <div className="card-body p-4 p-md-5">
              {verifying && (
                <div className="py-4">
                  <div className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">
                    {language === 'am' ? 'ኢሜይልዎን በማረጋገጥ ላይ...' : 'Verifying your email address...'}
                  </h5>
                  <p className="text-muted small">
                    {language === 'am' ? 'እባክዎ ጥቂት ሰከንዶች ይጠብቁ' : 'Please wait a moment while we confirm your account'}
                  </p>
                </div>
              )}

              {(success || alreadyVerified) && (
                <div className="py-3">
                  <i className="bi bi-check-circle-fill text-success display-2 mb-3"></i>
                  <h4 className="fw-bold text-success mb-2">
                    {alreadyVerified
                      ? (language === 'am' ? 'ኢሜይልዎ ቀደም ሲል ተረጋግጧል!' : 'Email Already Verified!')
                      : (language === 'am' ? 'ኢሜይልዎ በተሳካ ሁኔታ ተረጋግጧል!' : 'Email Verified Successfully!')}
                  </h4>
                  <p className="text-muted mb-4 small">
                    {language === 'am'
                      ? 'ወደ የይለፍ ቃል ማዘጋጃ ገጽ በመሸጋገር ላይ... እባክዎ ይጠብቁ።'
                      : 'Continuing to set your password...'}
                  </p>
                  <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                </div>
              )}

              {errorMessage && !verifying && !success && !alreadyVerified && (
                <div className="py-2">
                  <i className="bi bi-exclamation-triangle-fill text-danger display-3 mb-3"></i>
                  <h5 className="fw-bold text-danger mb-2">
                    {isExpired
                      ? (language === 'am' ? 'የማረጋገጫ ሊንኩ ጊዜው አልፎበታል' : 'Verification Link Expired')
                      : (language === 'am' ? 'ማረጋገጥ አልተቻለም' : 'Verification Issue')}
                  </h5>
                  <div className="alert alert-danger py-2 small mb-4">{errorMessage}</div>

                  {resendStatus && (
                    <div className="alert alert-info py-2 small mb-3">{resendStatus}</div>
                  )}

                  <div className="d-flex flex-column gap-2">
                    {emailParam ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="btn btn-fresh w-100 py-2 rounded-pill fw-bold"
                      >
                        {resending ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            {language === 'am' ? 'በመላክ ላይ...' : 'Sending...'}
                          </>
                        ) : (
                          <>
                            <i className="bi bi-envelope-arrow-up me-1"></i>
                            {language === 'am' ? 'አዲስ የማረጋገጫ ሊንክ ላክ' : 'Send New Verification Email'}
                          </>
                        )}
                      </button>
                    ) : (
                      <Link href="/signup" className="btn btn-fresh w-100 py-2 rounded-pill fw-bold">
                        <i className="bi bi-arrow-repeat me-1"></i>
                        {language === 'am' ? 'በድጋሚ ይመዝገቡ' : 'Sign Up Again'}
                      </Link>
                    )}

                    <Link href="/login" className="btn btn-outline-secondary w-100 py-2 rounded-pill small">
                      {language === 'am' ? 'ወደ መግቢያ ተመለስ' : 'Back to Sign In'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
