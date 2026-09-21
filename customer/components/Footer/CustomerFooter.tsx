'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export function CustomerFooter() {
  const { t, language } = useLanguage();

  return (
    <footer
      className="bg-dark text-white border-top mt-auto"
      style={{
        height: 'auto',
        minHeight: 'auto',
        overflow: 'visible',
      }}
    >
      <div className="container py-5">
        <div className="row g-4">
          {/* Column 1: Brand & Mission */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="d-flex align-items-center mb-3">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 me-2 shadow-sm object-fit-cover"
                style={{
                  width: '42px',
                  height: '42px',
                }}
              />
              <span className="fw-bold fs-4 text-white letter-spacing-1">ARDAB MARKET</span>
            </div>
            <p className="text-white-50 small mb-3 lh-base">
              {language === 'am'
                ? 'አርዳብ ገበያ ጥራት ያላቸውን ምርቶች ከታመኑ ሻጮች በቀጥታ እስከ ደጃፍዎ በፍጥነት እና በደህንነት የሚያደርስ የከተማዎ የገበያ መድረክ ነው።'
                : 'Ardab Market connects you directly with verified regional merchants and delivers fresh quality groceries, fashion, and essentials straight to your doorstep.'}
            </p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 py-2 px-3 rounded-pill small">
                <i className="bi bi-patch-check-fill me-1"></i> {language === 'am' ? 'የተረጋገጡ ሻጮች' : 'Verified Merchants'}
              </span>
              <span className="badge bg-light text-dark py-2 px-3 rounded-pill small">
                <i className="bi bi-truck me-1 text-success"></i> {language === 'am' ? 'የከተማ ማድረሻ' : 'City Delivery'}
              </span>
            </div>
          </div>

          {/* Column 2: Marketplace Links */}
          <div className="col-6 col-md-3 col-lg-2">
            <h6 className="text-white fw-bold mb-3 text-uppercase fs-7 letter-spacing-1">
              {language === 'am' ? 'ፈጣን ማውጫ' : 'Marketplace'}
            </h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link href="/" className="text-white-50 text-decoration-none hover-white">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white-50 text-decoration-none hover-white">
                  {t('about', 'About')}
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-white-50 text-decoration-none hover-white">
                  {t('products')}
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-white-50 text-decoration-none hover-white">
                  {t('categories')}
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-white-50 text-decoration-none hover-white">
                  {t('shopping_cart')}
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-white-50 text-decoration-none hover-white">
                  {t('wishlist')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div className="col-6 col-md-3 col-lg-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase fs-7 letter-spacing-1">
              {language === 'am' ? 'የደንበኞች አገልግሎት' : 'Customer Care'}
            </h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link href="/orders" className="text-white-50 text-decoration-none hover-white">
                  {t('my_orders')}
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-white-50 text-decoration-none hover-white">
                  {t('my_account')}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white-50 text-decoration-none hover-white">
                  {t('sign_in')}
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-white-50 text-decoration-none hover-white">
                  {t('sign_up')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Operations */}
          <div className="col-12 col-md-6 col-lg-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase fs-7 letter-spacing-1">
              {language === 'am' ? 'አድራሻ እና አገልግሎት' : 'Hubs & Contact'}
            </h6>
            <p className="text-white-50 small mb-2 d-flex align-items-start gap-2">
              <i className="bi bi-geo-alt-fill text-success mt-1"></i>
              <span>{language === 'am' ? 'ጎንደር ማዕከላዊ መጋዘን እና ሎጂስቲክስ ማዕከል' : 'Gondar Central Logistics & Warehouse'}</span>
            </p>
            <p className="text-white-50 small mb-2 d-flex align-items-start gap-2">
              <i className="bi bi-geo-alt-fill text-success mt-1"></i>
              <span>{language === 'am' ? 'ባህር ዳር እና አዲስ አበባ ተደራሽነት' : 'Bahir Dar & Addis Ababa Operations'}</span>
            </p>
            <p className="text-white-50 small mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock-fill text-success"></i>
              <span>{language === 'am' ? 'ቴሌብር እና ሲቢኢ ብር ክፍያዎች' : 'Telebirr & CBE Birr Supported'}</span>
            </p>
          </div>
        </div>

        <hr className="my-4 border-secondary opacity-25" />

        {/* Bottom Bar */}
        <div className="row align-items-center g-2 small text-white-50">
          <div className="col-12 col-md-6 text-center text-md-start">
            <div className="mb-1">
              © {new Date().getFullYear()} Ardab Market Platform. {language === 'am' ? 'መብቱ በህግ የተጠበቀ ነው።' : 'All rights reserved.'}
            </div>
            <div className="text-white-50 small opacity-75" style={{ fontSize: '0.8rem' }}>
              {language === 'am'
                ? 'በአርዳብ ቴክ ሶሉሽንስ አ.ማ. የበለፀገ — Powered by Ardab Tech Solutions S.C.'
                : 'Powered by Ardab Tech Solutions S.C.'}
            </div>
          </div>
          <div className="col-12 col-md-6 text-center text-md-end">
            <span className="me-3">
              <i className="bi bi-shield-check text-success me-1"></i> {language === 'am' ? 'የተረጋገጠ የገበያ ቦታ' : 'Verified Marketplace'}
            </span>
            <span>
              <i className="bi bi-credit-card-2-front text-success me-1"></i> {language === 'am' ? 'አስተማማኝ ክፍያ' : 'Secure Payments'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default CustomerFooter;
