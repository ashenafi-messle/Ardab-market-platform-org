'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { language, t } = useLanguage();

  const isAm = language === 'am';

  return (
    <div className="about-page">
      {/* 1. HERO SECTION */}
      <section className="bg-white py-5 border-bottom position-relative overflow-hidden">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-7 text-center text-lg-start">
              <div className="d-flex align-items-center justify-content-center justify-content-lg-start gap-2 mb-3">
                <img
                  src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                  alt="Ardab Market Logo"
                  className="rounded-3 shadow-sm object-fit-cover"
                  style={{ width: '36px', height: '36px' }}
                />
                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-semibold fs-6">
                  {isAm ? 'ስለ አርዳብ ገበያ' : 'About Ardab Market'}
                </span>
              </div>

              <h1 className="display-4 fw-extrabold text-dark mb-3 lh-sm animate-fade-in-up delay-100">
                {isAm ? (
                  <>
                    የከተማዎ ገበያ። <span className="text-success">በአርዳብ ይደርሳል።</span>
                  </>
                ) : (
                  <>
                    Your City. Your Marketplace. <span className="text-success">Delivered by Ardab.</span>
                  </>
                )}
              </h1>

              <p className="lead text-muted mb-4 fs-5 animate-fade-in-up delay-200">
                {isAm
                  ? 'አርዳብ ገበያ ጥራት ያላቸውን ምርቶች፣ ትኩስ እህሎችን፣ ቡናና ቅመማ ቅመሞችን እንዲሁም የቤት ውስጥ ፍጆታዎችን ከተረጋገጡ የክልሉ ነጋዴዎችና አምራቾች በቀጥታ ከአስተማማኝ የከተማ ማድረሻ አገልግሎት ጋር የሚያገናኝ የገበያ መድረክ ነው።'
                  : 'Ardab Market bridges regional merchants and shoppers through a verified city marketplace supported by dedicated logistics, reliable doorstep delivery, and safe regional trade.'}
              </p>

              <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start animate-fade-in-up delay-300">
                <Link href="/products" className="btn btn-fresh btn-lg px-4 py-3 rounded-pill fw-bold shadow-sm hover-elevate">
                  <i className="bi bi-basket3-fill me-2"></i>
                  {t('shop_now', 'Start Shopping')}
                </Link>
                <Link href="/signup" className="btn btn-outline-secondary btn-lg px-4 py-3 rounded-pill fw-bold hover-elevate">
                  <i className="bi bi-person-plus me-2"></i>
                  {t('sign_up', 'Sign Up')}
                </Link>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="position-relative p-2">
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden float-hero-img">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80"
                    alt="Ardab Fresh Marketplace"
                    className="w-100 object-fit-cover"
                    style={{ height: '340px' }}
                  />
                  <div className="card-body p-3 bg-dark text-white text-start">
                    <div className="fw-bold">{isAm ? 'የተረጋገጡ የሀገር ውስጥ ነጋዴዎች' : 'Verified Regional Commerce'}</div>
                    <small className="text-white-75">{isAm ? 'ጎንደር፣ ባህር ዳር፣ አዲስ አበባ' : 'Active across Gondar, Bahir Dar & Addis Ababa'}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW ARDAB WORKS (DETAILED VISUAL SEQUENCE) */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
              {isAm ? 'የአሰራር ሂደት' : 'How It Operates'}
            </span>
            <h2 className="h3 fw-bold mb-2">
              {isAm ? 'አርዳብ ገበያ እንዴት ይሰራል?' : 'How Ardab Works For You'}
            </h2>
            <p className="text-muted small">
              {isAm
                ? 'ከምርት ፍለጋ እስከ ደጃፍዎ ማድረሻ ድረስ ያለው ግልጽ እና ደህንነቱ የተጠበቀ ሂደት'
                : 'A seamless 6-step journey from product discovery to doorstep fulfillment'}
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                step: '1',
                icon: 'bi-search',
                title: isAm ? 'ምርቶችን ያስሱ (Discover)' : 'Discover',
                desc: isAm
                  ? 'ከበርካታ የተረጋገጡ ሻጮች ምርቶችን፣ ዋጋዎችንና ዝርዝሮችን በቀላሉ ይፈልጉ እና ያወዳድሩ።'
                  : 'Search through authentic regional commodities, compare vendors, and review clear specifications.',
              },
              {
                step: '2',
                icon: 'bi-check2-square',
                title: isAm ? 'ይመርጡ (Choose)' : 'Choose',
                desc: isAm
                  ? 'የሚፈልጉትን የምርት መጠን፣ ክብደት ወይም አይነት መርጠው ወደ ግዢ ጋሪዎ ያክሉ።'
                  : 'Select your preferred size, grade, or packaging and add items to your unified cart.',
              },
              {
                step: '3',
                icon: 'bi-bag-check',
                title: isAm ? 'ትዕዛዝ ያስቀምጡ (Order)' : 'Order',
                desc: isAm
                  ? 'የማድረሻ አድራሻዎንና ከተማዎን ይግለጹ፤ ትዕዛዝዎ በስርዓቱ ወዲያው ይመዘገባል።'
                  : 'Specify your delivery address and contact details with transparent breakdown of item totals.',
              },
              {
                step: '4',
                icon: 'bi-credit-card-2-front',
                title: isAm ? 'በደህንነት ይክፈሉ (Pay)' : 'Pay',
                desc: isAm
                  ? 'በቴሌብር፣ በሲቢኢ ብር ወይም ትዕዛዝዎ ሲደርስ በእጅ በእጅ ይክፈሉ።'
                  : 'Choose instant mobile transfer via Telebirr or CBE Birr, or opt for Cash on Delivery.',
              },
              {
                step: '5',
                icon: 'bi-truck',
                title: isAm ? 'የአርዳብ ማድረሻ (Ardab Delivery)' : 'Ardab Delivery',
                desc: isAm
                  ? 'የአርዳብ ሎጂስቲክስ ቡድን እቃውን በጥንቃቄ ተረክቦ የደጃፍ ጉዞውን ይጀምራል።'
                  : 'Ardab Dedicated Logistics receives, inspects, stages, and dispatches your order securely.',
              },
              {
                step: '6',
                icon: 'bi-house-check-fill',
                title: isAm ? 'ይረከቡ (Receive)' : 'Receive',
                desc: isAm
                  ? 'ትዕዛዝዎን በደጃፍዎ ይቀበሉ፤ እቃውን ይፈትሹና አስተያየትዎን ያጋሩ።'
                  : 'Receive your goods at your doorstep, verify the quality, and track every phase in real time.',
              },
            ].map((item) => (
              <div key={item.step} className="col-12 col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate transition-all position-relative">
                  <div
                    className="position-absolute top-0 start-0 m-3 badge rounded-pill bg-success fw-bold"
                    style={{ width: '28px', height: '28px', lineHeight: '20px' }}
                  >
                    {item.step}
                  </div>
                  <div className="rounded-circle bg-success bg-opacity-10 text-success mx-auto d-flex align-items-center justify-content-center mb-3 mt-3" style={{ width: '58px', height: '58px' }}>
                    <i className={`bi ${item.icon} fs-3`}></i>
                  </div>
                  <h5 className="fw-bold text-dark text-center mb-2">{item.title}</h5>
                  <p className="text-muted small text-center mb-0 lh-base">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. MARKETPLACE & VERIFIED MERCHANTS */}
      <section className="py-5 bg-white border-top">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
                <i className="bi bi-patch-check-fill me-1"></i>
                {isAm ? 'የተረጋገጠ የገበያ መድረክ' : 'Verified Marketplace'}
              </span>
              <h2 className="display-6 fw-bold text-dark mb-3">
                {isAm ? 'ከታመኑ ነጋዴዎች ጋር በቀጥታ ይገናኙ' : 'Connecting Shoppers with Verified Merchants'}
              </h2>
              <p className="text-muted mb-4 lh-base">
                {isAm
                  ? 'አርዳብ ገበያ ደንበኞችን ከታመኑ የክልሉ አምራቾችና ነጋዴዎች ጋር የሚያገናኝ አስተማማኝ ድልድይ ነው። በገበያው ላይ የሚሳተፍ እያንዳንዱ ነጋዴ ህጋዊ ማንነቱ፣ የንግድ ፈቃዱና የምርት ጥራቱ የተረጋገጠ ነው።'
                  : 'Ardab Market operates as a curated commercial platform where every supplier and merchant undergoes verification. Customers can browse authentic grain dealers, coffee roasters, spice traders, and retail shops with complete confidence in product accuracy.'}
              </p>

              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="p-3 bg-light rounded-3 border h-100">
                    <i className="bi bi-search text-success fs-4 mb-2 d-block"></i>
                    <strong className="d-block text-dark mb-1">{isAm ? 'ቀላል ፍለጋና ማወዳደሪያ' : 'Smart Search & Filters'}</strong>
                    <small className="text-muted">{isAm ? 'ምርቶችን በዋጋ፣ በምድብና በከተማ ተደራሽነት ይፈልጉ' : 'Filter by category, price range, city availability, and ratings'}</small>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-3 bg-light rounded-3 border h-100">
                    <i className="bi bi-star-fill text-warning fs-4 mb-2 d-block"></i>
                    <strong className="d-block text-dark mb-1">{isAm ? 'የደንበኞች አስተያየት' : 'Authentic Reviews'}</strong>
                    <small className="text-muted">{isAm ? 'ትክክለኛ የገዢዎችን አስተያየትና ደረጃ ይመልከቱ' : 'Genuine feedback from verified customers who received goods'}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
                  alt="Ethiopian regional spices and coffee"
                  className="w-100 object-fit-cover"
                  style={{ height: '360px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DEDICATED CITY DELIVERY OPERATIONS */}
      <section className="py-5 bg-light border-top">
        <div className="container">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6 order-lg-2">
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
                <i className="bi bi-truck me-1"></i>
                {isAm ? 'የአርዳብ ማድረሻ አገልግሎት' : 'Ardab Dedicated Logistics'}
              </span>
              <h2 className="display-6 fw-bold text-dark mb-3">
                {isAm ? 'እስከ ደጃፍዎ ድረስ አስተማማኝ ማድረሻ' : 'Professional Logistics to Your Doorstep'}
              </h2>
              <p className="text-muted mb-4 lh-base">
                {isAm
                  ? 'አርዳብ ለሶስተኛ ወገን ሳያስተላልፍ የራሱን የተመደበ የማጓጓዣ አውታረ መረብ በመጠቀም እያንዳንዱን ትዕዛዝ በንጽህናና በጥንቃቄ ተቀብሎ እስከ ደጃፍዎ ያደርሳል። ከጅምላ እህሎች እስከ ስስ የቤት ፍጆታዎች ድረስ ጥራቱ ተጠብቆ ይደርሳል።'
                  : 'Ardab manages fulfillment internally rather than offloading deliveries to untracked couriers. From 5,000kg cargo-capable regional transit to urban dispatch, orders are handled with temperature and hygiene awareness.'}
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 mt-1">
                    <i className="bi bi-geo-alt-fill fs-5"></i>
                  </div>
                  <div>
                    <strong className="text-dark d-block">{isAm ? 'የከተማ ሎጂስቲክስ ማዕከላት' : 'Active City Hubs'}</strong>
                    <small className="text-muted">{isAm ? 'ጎንደር ማዕከላዊ መጋዘን፣ ባህር ዳር እና አዲስ አበባ' : 'Warehousing and staging points in Gondar, Bahir Dar, and Addis Ababa'}</small>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 mt-1">
                    <i className="bi bi-clock-history fs-5"></i>
                  </div>
                  <div>
                    <strong className="text-dark d-block">{isAm ? 'የትዕዛዝ ክትትል' : 'Real-Time Visibility'}</strong>
                    <small className="text-muted">{isAm ? 'ትዕዛዝዎ ከመዘጋጀት ጀምሮ እስከ ደጃፍዎ እስኪደርስ ድረስ ያለውን ደረጃ ይከታተሉ' : 'Clear timeline milestones from order confirmation to dispatch and final handoff'}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6 order-lg-1">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
                  alt="Ardab Distribution Logistics"
                  className="w-100 object-fit-cover"
                  style={{ height: '360px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST & SECURITY SECTION */}
      <section className="py-5 bg-white border-top">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
              <i className="bi bi-shield-lock-fill me-1"></i>
              {isAm ? 'ደህንነት እና አስተማማኝነት' : 'Trust & Security'}
            </span>
            <h2 className="h3 fw-bold mb-2">
              {isAm ? 'የመረጃዎና የገንዘብዎ ደህንነት የተጠበቀ ነው' : 'Platform Security & Integrity'}
            </h2>
            <p className="text-muted small">
              {isAm
                ? 'በአርዳብ ገበያ ላይ የተተገበሩ ትክክለኛ የደህንነትና የጥበቃ እርምጃዎች'
                : 'Implemented technical and procedural standards protecting customer accounts and transactions'}
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-light hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '52px', height: '52px' }}>
                  <i className="bi bi-link-45deg fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{isAm ? 'የኢሜይል ሊንክ ማረጋገጫ' : 'Link-Based Verification'}</h5>
                <p className="text-muted small mb-0 lh-base">
                  {isAm
                    ? 'ምዝገባና የይለፍ ቃል ቅየራ በደህንነቱ በተጠበቀና በአንድ ጊዜ ብቻ በሚያገለግል የኢሜይል ሊንክ ይከናወናል።'
                    : 'Account confirmation and password resets rely on cryptographic single-use email links rather than interceptable numeric codes.'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-light hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '52px', height: '52px' }}>
                  <i className="bi bi-key-fill fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{isAm ? 'የይለፍ ቃል ጥበቃ' : 'Hashed Credentials'}</h5>
                <p className="text-muted small mb-0 lh-base">
                  {isAm
                    ? 'የይለፍ ቃሎች በከፍተኛ የደህንነት ደረጃ (Bcrypt) ተመስጥረው የሚቀመጡ ሲሆን ማንም ሰው ሊያያቸው አይችልም።'
                    : 'Customer passwords are salt-hashed with industry-standard bcrypt algorithms and never stored or sent in plaintext.'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-light hover-elevate transition-all">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mb-3" style={{ width: '52px', height: '52px' }}>
                  <i className="bi bi-shield-check fs-3"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{isAm ? 'የክፍያ ማረጋገጫ' : 'Payment Reconciliation'}</h5>
                <p className="text-muted small mb-0 lh-base">
                  {isAm
                    ? 'በቴሌብርና ሲቢኢ ብር የሚፈጸሙ ክፍያዎች በስርዓቱ ከተረጋገጡ በኋላ ብቻ ምርቱ ለጭነት ይዘጋጃል።'
                    : 'Mobile payments through Telebirr and CBE Birr are verified before cargo staging, eliminating fraudulent transactions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-5 bg-light border-top">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold small mb-2">
              {isAm ? 'ተደጋግመው የሚጠየቁ ጥያቄዎች' : 'Common Questions'}
            </span>
            <h2 className="h3 fw-bold mb-2">
              {isAm ? 'ስለ አርዳብ ገበያ ጥያቄ አለዎት?' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-muted small">
              {isAm
                ? 'ስለ ግዢ፣ ክፍያና ማድረሻ ማወቅ የሚፈልጓቸውን መረጃዎች ያግኙ'
                : 'Clear answers on ordering, payments, and city logistics'}
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="accordion accordion-flush bg-white rounded-4 shadow-sm p-3 p-md-4" id="aboutFaqAccordion">
                {[
                  {
                    id: 'faq1',
                    q: isAm ? 'አርዳብ ገበያ በየትኞቹ ከተሞች ይሰራል?' : 'In which cities does Ardab Market operate?',
                    a: isAm
                      ? 'በአሁኑ ሰዓት በጎንደር፣ በባህር ዳር እና በአዲስ አበባ ከተሞች የሙሉ ማድረሻና የንግድ አገልግሎት ይሰጣል፤ ወደ ሌሎች ከተሞችም እየሰፋ ይገኛል።'
                      : 'Ardab Market currently operates central logistics and delivery hubs in Gondar, Bahir Dar, and Addis Ababa, with ongoing expansion to other regional centers.',
                  },
                  {
                    id: 'faq2',
                    q: isAm ? 'ምርቶቹ የሚደርሱት በምን ያህል ጊዜ ውስጥ ነው?' : 'How long does delivery take?',
                    a: isAm
                      ? 'በከተማ ውስጥ የሚደረጉ ማድረሻዎች በትዕዛዝ ሰዓቱና በምርቱ አይነት መሰረት በተመሳሳይ ቀን ወይም በሚቀጥለው ቀን ደጃፍዎ ይደርሳሉ።'
                      : 'Intra-city deliveries typically arrive the same day or next morning depending on when the order was placed and verified.',
                  },
                  {
                    id: 'faq3',
                    q: isAm ? 'በምን አይነት የክፍያ አማራጮች መክፈል እችላለሁ?' : 'What payment methods are supported?',
                    a: isAm
                      ? 'በቴሌብር (Telebirr)፣ በሲቢኢ ብር (CBE Birr) እንዲሁም እቃውን ሲረከቡ በእጅ በእጅ (Cash on Delivery) መክፈል ይችላሉ።'
                      : 'You can pay instantly using Telebirr, CBE Birr mobile money, or choose Cash on Delivery at handoff.',
                  },
                  {
                    id: 'faq4',
                    q: isAm ? 'እንዴት መለያ መክፈት እችላለሁ?' : 'How do I create a customer account?',
                    a: isAm
                      ? 'በቀላሉ በኢሜይልዎ፣ በስልክ ቁጥርዎና በከተማዎ ይመዝገቡ፤ ወደ ኢሜይልዎ በሚላከው ሊንክ የይለፍ ቃልዎን በማዘጋጀት ወዲያው መሸመት ይችላሉ።'
                      : 'Simply sign up using your email, phone, and city. Click the verification link sent to your email to set your password and begin shopping immediately.',
                  },
                ].map((item, idx) => (
                  <div className="accordion-item border-bottom py-2" key={item.id}>
                    <h2 className="accordion-header" id={`heading-${item.id}`}>
                      <button
                        className={`accordion-button ${idx !== 0 ? 'collapsed' : ''} fw-bold text-dark bg-transparent shadow-none px-0`}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${item.id}`}
                        aria-expanded={idx === 0 ? 'true' : 'false'}
                        aria-controls={`collapse-${item.id}`}
                      >
                        {item.q}
                      </button>
                    </h2>
                    <div
                      id={`collapse-${item.id}`}
                      className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                      aria-labelledby={`heading-${item.id}`}
                      data-bs-parent="#aboutFaqAccordion"
                    >
                      <div className="accordion-body text-muted small px-0 lh-base">
                        {item.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="py-5 text-white" style={{ background: 'linear-gradient(135deg, #108A4E 0%, #0B6B3C 100%)' }}>
        <div className="container text-center py-4">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <img
                src="https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg"
                alt="Ardab Market Logo"
                className="rounded-3 shadow mb-3 border border-2 border-white object-fit-cover"
                style={{ width: '56px', height: '56px' }}
              />
              <h2 className="display-6 fw-bold mb-3">
                {isAm ? 'የአርዳብ ገበያ አባል ይሁኑ' : 'Join Ardab Market Today'}
              </h2>
              <p className="lead mb-4 text-white-70 fs-6">
                {isAm
                  ? 'ትኩስና ጥራት ያላቸውን ምርቶች በቀጥታ ከታመኑ ነጋዴዎች በደጃፍዎ ማድረሻ ይዘዙ።'
                  : 'Start ordering quality regional commodities and everyday goods delivered securely to your home.'}
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-3">
                <Link href="/signup" className="btn btn-light btn-lg rounded-pill px-4 fw-bold text-success shadow hover-elevate">
                  <i className="bi bi-person-plus-fill me-2"></i>
                  {t('sign_up', 'Sign Up')}
                </Link>
                <Link href="/products" className="btn btn-outline-light btn-lg rounded-pill px-4 fw-bold hover-elevate">
                  {t('explore_products', 'Explore Products')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
