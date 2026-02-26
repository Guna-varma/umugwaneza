import { useEffect } from "react";
import { useLocation } from "wouter";
import { PublicHeader, PublicFooter } from "@/components/public-layout";
import { Button } from "@/components/ui/button";

const TITLE = "Rwanda Vehicle Rental | Umugwaneza Trusted Fleet Services";
const META_DESC = "Rwanda vehicle rental by Umugwaneza: trucks and fleet for construction, logistics, and business. Trusted vehicle rental across Kigali and Rwanda.";

export default function RwandaVehicleRentalPage() {
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
          Rwanda Vehicle Rental – Trusted Fleet Services Across Rwanda
        </h1>
        <p className="text-lg text-[#64748b] mb-8">
          Umugwaneza provides trusted Rwanda vehicle rental for businesses in Kigali and nationwide. From light trucks to heavy machinery, we offer clear contracts, maintenance support, and flexible terms so your projects stay on track.
        </p>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="vehicle-rental-overview">
          <h2 id="vehicle-rental-overview" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Why Choose Umugwaneza for Rwanda Vehicle Rental
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Rwanda vehicle rental with Umugwaneza means working with a partner that understands local logistics and compliance. We serve construction firms, agri-businesses, distributors, and NGOs that need reliable vehicles without the cost and hassle of ownership. Our fleet is maintained to high standards, and our rental terms are designed for both short-term projects and longer engagements.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Whether you need a single truck in Kigali or multiple vehicles across Rwanda, we provide a single point of contact and one platform for contracts, payments, and reporting. That makes us a preferred choice for Rwanda vehicle rental among B2B clients who value transparency and reliability.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="fleet-types">
          <h2 id="fleet-types" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Types of Vehicles Available for Rental in Rwanda
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Our Rwanda vehicle rental fleet includes light commercial vehicles for deliveries and staff transport, medium and heavy trucks for construction and logistics, and specialized machinery where applicable. We tailor solutions to your project size and duration, so you pay for what you use.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            For businesses that also need heavy equipment, we offer <a href="/trucks-and-machines-rental-rwanda" className="text-[#2563eb] hover:underline">trucks and machines rental in Rwanda</a> through the same trusted platform. Many of our Rwanda vehicle rental clients use us for both transport and equipment, simplifying procurement and reporting.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="service-areas">
          <h2 id="service-areas" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Rwanda Vehicle Rental in Kigali and Nationwide
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            We operate from Kigali and serve clients across Rwanda. Our Rwanda vehicle rental services are available for projects in the capital and in other provinces, with clear terms for pickup, return, and maintenance. We work with businesses that need vehicles for a few days or several months, and we scale with your needs.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            If you are looking for a trusted Rwanda vehicle rental partner that combines local presence with professional operations, Umugwaneza is here to support your business. We are also a leading <a href="/rwanda-wholesale-partner" className="text-[#2563eb] hover:underline">Rwanda wholesale partner</a>, so clients who need both supply chain and fleet solutions can work with one company.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="cta-vehicle">
          <h2 id="cta-vehicle" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Get Started with Rwanda Vehicle Rental
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-6">
            Contact us or sign in to explore our Rwanda vehicle rental options, request a quote, or manage your existing rentals. Umugwaneza is committed to being Rwanda&apos;s trusted partner for both wholesale and vehicle rental.
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
            <li><a href="/trucks-and-machines-rental-rwanda" className="text-[#2563eb] hover:underline">Trucks & Machines Rental Rwanda</a></li>
          </ul>
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
