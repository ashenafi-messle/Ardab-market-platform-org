import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeatureSection from '@/components/landing/FeatureSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      <LandingHeader />
      <main className="flex-grow-1">
        <HeroSection />
        <FeatureSection />
      </main>
      <LandingFooter />
    </div>
  );
}
