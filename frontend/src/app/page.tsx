import Navbar from "@/components/landing/navbar"
import HeroSection from "@/components/landing/hero-section"
import FeatureCarousel from "@/components/landing/feature-carousel"
import CopilotDemo from "@/components/landing/copilot-demo"
import CTAStrip from "@/components/landing/cta-strip"
import Footer from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <FeatureCarousel />
      <CopilotDemo />
      <CTAStrip />
      <Footer />
    </main>
  )
}
