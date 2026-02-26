import { useLocation } from "wouter";
import { Package, Truck, FileText } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PublicHeader, PublicFooter } from "@/components/public-layout";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] overflow-x-hidden">
      <PublicHeader />

      <main className="relative" id="main-content">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#2563eb]/5 animate-landing-blob-1" />
          <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-[#2563eb]/3 animate-landing-blob-2" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-[#1e293b]/3 animate-landing-blob-3" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 md:pt-24 md:pb-32 text-center">
          <div className="animate-landing-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Logo size="xs" inline decorative />
              Rwanda · B2B Platform
            </div>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1e293b] max-w-4xl leading-tight animate-landing-fade-up px-1"
            style={{ animationDelay: "100ms" }}
            data-testid="text-landing-title"
          >
            Rwanda Trusted Wholesale Partner & Vehicle Rental – Umugwaneza
          </h1>

          <p
            className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-[#475569] max-w-2xl leading-relaxed animate-landing-fade-up px-2"
            style={{ animationDelay: "200ms" }}
          >
            Umugwaneza is Rwanda&apos;s trusted wholesale partner and vehicle rental company. We offer trucks, heavy machines, and bulk supply solutions for businesses across Kigali and Rwanda.
          </p>

          <div
            className="mt-8 sm:mt-10 animate-landing-fade-up flex flex-wrap gap-3 justify-center"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              className="h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base bg-[#2563eb] text-white touch-manipulation"
              onClick={() => setLocation("/login")}
              data-testid="button-landing-signin-hero"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              className="h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base border-[#e2e8f0] text-[#1e293b] touch-manipulation"
              onClick={() => setLocation("/rwanda-wholesale-partner")}
            >
              Rwanda Wholesale Partner
            </Button>
          </div>
        </div>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">What we offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Package, title: "Wholesale Trading", desc: "Manage inventory, purchases, sales, and supplier payments with full financial tracking.", href: "/rwanda-wholesale-partner" },
              { icon: Truck, title: "Fleet & Vehicle Rental", desc: "Track vehicles and machinery across projects. Rwanda vehicle rental for construction and logistics.", href: "/rwanda-vehicle-rental" },
              { icon: FileText, title: "Trucks & Machines Rental", desc: "Outgoing and incoming rental contracts, payments, and reports. Trusted trucks and machines rental in Rwanda.", href: "/trucks-and-machines-rental-rwanda" },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <a
                  key={feature.href}
                  href={feature.href}
                  className="group bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6 transition-transform duration-200 hover:scale-[1.02] animate-landing-fade-up block text-left"
                  data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2563eb]/10 mb-4">
                    <Icon className="h-6 w-6 text-[#2563eb]" />
                  </div>
                <h3 className="text-lg font-semibold text-[#1e293b] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#475569] leading-relaxed">{feature.desc}</p>
                </a>
              );
            })}
          </div>
        </section>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="wholesale-heading">
          <h2 id="wholesale-heading" className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-6 text-center">
            Wholesale Services in Rwanda
          </h2>
          <p className="text-[#475569] text-center max-w-3xl mx-auto mb-8">
            As a trusted Rwanda wholesale partner, Umugwaneza helps businesses in Kigali and across Rwanda with bulk supply, inventory management, and B2B trading. Our platform streamlines purchases, sales, and payments so you can focus on growth.
          </p>
          <div className="text-center">
            <a href="/rwanda-wholesale-partner" className="text-[#2563eb] font-medium hover:underline">
              Learn more about our Rwanda wholesale partner services →
            </a>
          </div>
        </section>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="vehicle-rental-heading">
          <h2 id="vehicle-rental-heading" className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-6 text-center">
            Rwanda Vehicle Rental Services
          </h2>
          <p className="text-[#475569] text-center max-w-3xl mx-auto mb-8">
            From light trucks to heavy machinery, Umugwaneza provides reliable Rwanda vehicle rental for construction, logistics, and agriculture. Available across Kigali and nationwide with clear contracts and support.
          </p>
          <div className="text-center">
            <a href="/rwanda-vehicle-rental" className="text-[#2563eb] font-medium hover:underline">
              Explore Rwanda vehicle rental options →
            </a>
          </div>
        </section>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="trucks-heading">
          <h2 id="trucks-heading" className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-6 text-center">
            Trucks & Heavy Machines Rental
          </h2>
          <p className="text-[#475569] text-center max-w-3xl mx-auto mb-8">
            Umugwaneza trucks and machines rental is trusted by businesses in Rwanda for project-based and long-term use. We offer transparent pricing, maintenance support, and flexible terms.
          </p>
          <div className="text-center">
            <a href="/trucks-and-machines-rental-rwanda" className="text-[#2563eb] font-medium hover:underline">
              View trucks and machines rental in Rwanda →
            </a>
          </div>
        </section>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="trusted-heading">
          <h2 id="trusted-heading" className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-6 text-center">
            Why Umugwaneza is a Trusted Partner
          </h2>
          <p className="text-[#475569] text-center max-w-3xl mx-auto mb-10">
            Businesses across Rwanda choose Umugwaneza for wholesale and vehicle rental because we combine local presence with reliable operations, clear contracts, and dedicated support in Kigali and beyond.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center">
              <p className="text-3xl font-bold text-[#2563eb] mb-1">B2B Focus</p>
              <p className="text-sm text-[#475569]">Built for wholesalers, contractors, and fleet operators in Rwanda.</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center">
              <p className="text-3xl font-bold text-[#2563eb] mb-1">Transparent</p>
              <p className="text-sm text-[#475569]">Clear pricing and terms for wholesale and rental.</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center">
              <p className="text-3xl font-bold text-[#2563eb] mb-1">Nationwide</p>
              <p className="text-sm text-[#475569]">Serving Kigali and Rwanda with consistent service.</p>
            </div>
          </div>
        </section>

        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-8 text-center">
            Trusted by Businesses in Rwanda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <p className="text-[#1e293b] mb-4">&ldquo;Umugwaneza is our go-to Rwanda wholesale partner. Reliable supply and clear reporting.&rdquo;</p>
              <footer className="text-sm text-[#475569]">— B2B supplier, Kigali</footer>
            </blockquote>
            <blockquote className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <p className="text-[#1e293b] mb-4">&ldquo;We use Umugwaneza for trucks and machines rental. Professional and trusted.&rdquo;</p>
              <footer className="text-sm text-[#475569]">— Construction company, Rwanda</footer>
            </blockquote>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
