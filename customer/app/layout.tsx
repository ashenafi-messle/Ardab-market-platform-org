import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/marketplace.css';

import { LanguageProvider } from '@/context/LanguageContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import CustomerHeader from '@/components/Header/CustomerHeader';
import CustomerFooter from '@/components/Footer/CustomerFooter';
import MobileBottomNav from '@/components/Navigation/MobileBottomNav';

export const metadata: Metadata = {
  title: 'አርዳብ ገበያ | Ardab Market - የኢትዮጵያ ቀዳሚ የገበያ ቦታ',
  description: 'በአርዳብ ገበያ ትኩስ አትክልት፣ ፍራፍሬ፣ እህሎችና ሌሎች ጥራት ያላቸው የሀገር ውስጥ ምርቶችን በቀጥታ ከአምራቾችና ነጋዴዎች ያግኙ። Buy fresh groceries, grains, and produce across Ethiopia.',
  icons: {
    icon: 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg',
    apple: 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="am" dir="ltr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body>
        <LanguageProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="d-flex flex-column min-vh-100">
                  <CustomerHeader />
                  <main className="flex-grow-1">
                    {children}
                  </main>
                  <div className="d-block pb-5 pb-md-0">
                    <CustomerFooter />
                  </div>

                  <MobileBottomNav />
                </div>
              </WishlistProvider>
            </CartProvider>
          </CustomerAuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
