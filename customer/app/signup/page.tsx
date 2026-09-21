'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SignUpPage() {
  const { register, resendVerification, loading, error, clearError } = useCustomerAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    city: 'Addis Ababa',
  });

  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const ethCities = [
    'Addis Ababa',
    'Hawassa',
    'Bahir Dar',
    'Adama',
    'Dire Dawa',
    'Mekelle',
    'Gondar',
    'Jimma',
    'Dessie',
    'Bishoftu',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    clearError();
    setFormError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate email
    if (!formData.email || !formData.email.includes('@')) {
      setFormError(language === 'am' ? 'ትክክለኛ ኢሜይል ያስገቡ' : 'Please enter a valid email address');
      return;
    }

    // Validate phone
    if (!formData.phone || formData.phone.trim().length < 9) {
      setFormError(language === 'am' ? 'ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Please enter a valid phone number');
      return;
    }

    try {
      const res = await register({
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
      });

      if (res && res.success) {
        setRegisteredEmail(formData.email);
        setSuccessMessage(
          language === 'am'
            ? `የማረጋገጫ ሊንክ ወደ ${formData.email} ተልኳል። እባክዎ ኢሜይልዎን በማረጋገጥ የይለፍ ቃልዎን ያዘጋጁ። መለያዎ የሚፈጠረው ማረጋገጫው ከተጠናቀቀ በኋላ ነው።`
            : `Please verify your email address using the link sent to ${formData.email}. Your customer account will be created once verification succeeds.`
        );
      }
    } catch (err: any) {
      setFormError(err.message || 'Sign up failed. Please check your information.');
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendStatus(language === 'am' ? 'በመላክ ላይ...' : 'Sending verification link...');
    try {
      await resendVerification(registeredEmail);
      setResendStatus(
        language === 'am'
          ? 'አዲስ የማረጋገጫ ሊንክ ተልኳል። እባክዎ ኢሜይልዎን ይመልከቱ።'
          : 'A fresh verification link has been sent to your email.'
      );
    } catch (err: any) {
      setResendStatus(err.message || (language === 'am' ? 'ሊንኩን መላክ አልተቻለም' : 'Failed to resend verification link.'));
    } finally {
      setIsResending(false);
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
              <h3 className="fw-bold mb-0">
                {language === 'am' ? 'በአርዳብ ገበያ ይመዝገቡ' : 'Sign Up for Ardab Market'}
              </h3>
              <p className="small text-white-70 mb-0">
                {language === 'am'
                  ? 'ትኩስ ምርቶችን በቀጥታ ከሻጮች በደጃፍዎ ማድረሻ ይዘዙ'
                  : 'Order fresh groceries and commodities delivered to your door'}
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              {successMessage ? (
                <div className="text-center py-3">
                  <div className="text-success mb-3">
                    <i className="bi bi-envelope-check-fill display-2"></i>
                  </div>
                  <h4 className="fw-bold text-success mb-2">
                    {language === 'am' ? 'ኢሜይልዎን ይመልከቱ' : 'Check Your Email'}
                  </h4>
                  <p className="text-muted mb-4 small lh-base">{successMessage}</p>

                  <div className="alert alert-light border border-success-subtle py-2 px-3 mb-4 rounded-3 small text-muted text-start">
                    <i className="bi bi-info-circle-fill text-success me-2"></i>
                    {language === 'am'
                      ? 'የማረጋገጫ ሊንኩን ሲጫኑ የይለፍ ቃል ማዘጋጃ ገጽ ይከፈትልዎታል፤ የይለፍ ቃልዎን ሲያዘጋጁ በቀጥታ ይገባሉ።'
                      : 'Clicking the link in your email will take you to set your password and automatically sign you in.'}
                  </div>

                  {resendStatus && (
                    <div className="alert alert-info py-2 small mb-3">{resendStatus}</div>
                  )}

                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      className="btn btn-outline-success w-100 py-2 rounded-pill fw-bold"
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      {language === 'am' ? 'የማረጋገጫ ሊንክ በድጋሚ ላክ' : 'Resend Verification Link'}
                    </button>
                    <Link href="/login" className="btn btn-link text-muted small text-decoration-none">
                      {language === 'am' ? 'ወደ መግቢያ ተመለስ' : 'Back to Sign In'}
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {(formError || error) && (
                    <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
                      <div>{formError || error}</div>
                    </div>
                  )}

                  {/* Clarification Note to user: Full Name is automatically generated from Email */}
                  <div className="alert alert-light border border-success-subtle py-2 px-3 mb-4 rounded-3 small text-muted">
                    <i className="bi bi-info-circle-fill text-success me-2"></i>
                    {language === 'am'
                      ? 'የሙሉ ስም ማስገባት አያስፈልግም፤ ከመለያ ኢሜይልዎ በቀጥታ ይወሰዳል።'
                      : 'No full name required; your display name is generated from your email.'}
                  </div>

                  {/* Email Input */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="reg-email">
                      {language === 'am' ? 'ኢሜይል' : 'Email'} <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        id="reg-email"
                        name="email"
                        required
                        className="form-control"
                        placeholder="example@domain.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="reg-phone">
                      {language === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'} <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-telephone"></i>
                      </span>
                      <input
                        type="tel"
                        id="reg-phone"
                        name="phone"
                        required
                        className="form-control"
                        placeholder="0911223344"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* City Selector */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold" htmlFor="reg-city">
                      {language === 'am' ? 'ከተማ' : 'City'} <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-geo-alt"></i>
                      </span>
                      <select
                        id="reg-city"
                        name="city"
                        required
                        className="form-select"
                        value={formData.city}
                        onChange={handleChange}
                      >
                        {ethCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-fresh w-100 py-2 rounded-pill fw-bold shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {language === 'am' ? 'በመላክ ላይ...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-1"></i>
                        {language === 'am' ? 'ይመዝገቡ' : 'Sign Up'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="card-footer bg-light text-center py-3 border-0">
              <span className="text-muted small">
                {language === 'am' ? 'መለያ አለዎት?' : 'Already have an account?'}
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
