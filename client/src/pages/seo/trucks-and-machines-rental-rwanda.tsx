import { useEffect } from "react";
import { useLocation } from "wouter";
import { PublicHeader, PublicFooter } from "@/components/public-layout";
import { Button } from "@/components/ui/button";

const TITLE = "Umugwaneza Trucks and Machines Rental Rwanda | Trusted Partner";
const META_DESC = "Umugwaneza trucks and machines rental in Rwanda: trusted partner for construction, logistics, and heavy equipment. Flexible terms across Kigali and Rwanda.";

export default function TrucksAndMachinesRentalRwandaPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", META_DESC);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] overflow-x-hidden">
      <PublicHeader />
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1e293b] mb-6">
          Umugwaneza Trucks and Machines Rental – Trusted in Rwanda
        </h1>
        <p className="text-lg text-[#64748b] mb-8">
          Umugwaneza trucks and machines rental is the choice of businesses across Rwanda for construction, agriculture, and logistics. We offer transparent pricing, maintenance support, and flexible rental terms so you can run projects without the burden of owning equipment.
        </p>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="trucks-machines-overview">
          <h2 id="trucks-machines-overview" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Why Businesses Trust Umugwaneza for Trucks and Machines Rental in Rwanda
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            As a trusted Rwanda partner, Umugwaneza provides trucks and heavy machinery for short- and long-term rental. Our clients include construction companies, cooperatives, and enterprises that need reliable equipment without capital outlay. We focus on clear contracts, on-time availability, and responsive support so your operations are not delayed.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Umugwaneza trucks and machines rental is built for B2B use. We understand project timelines, maintenance requirements, and the need for accurate records. Whether you need a single truck in Kigali or multiple machines across Rwanda, we deliver a consistent, professional service that has made us a trusted name in Rwanda vehicle rental and equipment hire.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="what-we-rent">
          <h2 id="what-we-rent" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            What We Offer: Trucks and Heavy Machines Rental in Rwanda
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Our trucks and machines rental portfolio in Rwanda covers light to heavy trucks for transport and logistics, as well as machinery suited to construction and agriculture. Each unit is maintained to high standards, and we provide documentation and support so you can plan with confidence. Rental periods can be daily, weekly, or monthly depending on your project.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            We serve Kigali and all provinces, so no matter where your project is, Umugwaneza trucks and machines rental can support you. Many of our clients combine equipment rental with our <a href="/rwanda-vehicle-rental" className="text-[#2563eb] hover:underline">Rwanda vehicle rental</a> and <a href="/rwanda-wholesale-partner" className="text-[#2563eb] hover:underline">Rwanda wholesale partner</a> services for a single, trusted supplier.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="trusted-partner">
          <h2 id="trusted-partner" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Umugwaneza: A Trusted Partner for Rwanda Businesses
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Trust is at the core of Umugwaneza trucks and machines rental. We have built our reputation in Rwanda by delivering on promises: equipment that works, contracts that are clear, and support when you need it. Construction firms, farms, and logistics operators rely on us for critical assets, and we take that responsibility seriously.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Our team knows the local market and regulatory environment. We combine that knowledge with systems that track rentals, payments, and maintenance, so you have full visibility. Whether you are expanding in Kigali or running projects nationwide, Umugwaneza trucks and machines rental is designed to be the trusted partner you can count on.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="cta-trucks">
          <h2 id="cta-trucks" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Get Started with Trucks and Machines Rental in Rwanda
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-6">
            To explore Umugwaneza trucks and machines rental options, request a quote, or manage your existing rentals, sign in to your account or get in touch. We are here to support your business with trusted trucks and machines rental across Rwanda.
          </p>
          <Button
            className="bg-[#2563eb] text-white"
            onClick={() => setLocation("/login")}
          >
            Sign In to Your Account
          </Button>
        </section>

        <nav className="mt-12 pt-8 border-t border-[#e2e8f0]" aria-label="Related services">
          <p className="text-sm font-medium text-[#1e293b] mb-3">Related services</p>
          <ul className="flex flex-wrap gap-4 text-sm">
            <li><a href="/" className="text-[#2563eb] hover:underline">Home</a></li>
            <li><a href="/rwanda-wholesale-partner" className="text-[#2563eb] hover:underline">Rwanda Wholesale Partner</a></li>
            <li><a href="/rwanda-vehicle-rental" className="text-[#2563eb] hover:underline">Rwanda Vehicle Rental</a></li>
          </ul>
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
