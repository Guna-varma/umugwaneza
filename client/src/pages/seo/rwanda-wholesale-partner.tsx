import { useEffect } from "react";
import { useLocation } from "wouter";
import { PublicHeader, PublicFooter } from "@/components/public-layout";
import { Button } from "@/components/ui/button";

const TITLE = "Rwanda Wholesale Partner | Umugwaneza";
const META_DESC = "Umugwaneza is Rwanda's trusted wholesale partner. Bulk supply, B2B trading, and inventory solutions for businesses in Kigali and across Rwanda.";

export default function RwandaWholesalePartnerPage() {
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
          Rwanda Wholesale Partner – Trusted B2B Supply Across Rwanda
        </h1>
        <p className="text-lg text-[#64748b] mb-8">
          Umugwaneza is a trusted Rwanda wholesale partner for businesses in Kigali and nationwide. We help retailers, distributors, and institutions with bulk supply, inventory management, and B2B trading so you can scale with confidence.
        </p>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="what-we-offer">
          <h2 id="what-we-offer" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            What Our Rwanda Wholesale Partner Services Include
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            As a Rwanda wholesale partner, we focus on the needs of B2B buyers and sellers. Our platform supports bulk ordering, supplier management, purchase and sales tracking, and payments—all in one place. Whether you are in Kigali or elsewhere in Rwanda, you get the same reliable processes and visibility.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            We work with cooperatives, traders, and institutional buyers who need consistent supply of goods. Our wholesale services are designed for businesses that want to reduce paperwork, avoid stockouts, and keep clear records for compliance and growth.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="why-choose">
          <h2 id="why-choose" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Why Choose Umugwaneza as Your Rwanda Wholesale Partner
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Trust is central to our Rwanda wholesale partner offering. We provide transparent pricing, on-time delivery expectations, and a single system for orders, invoices, and payments. Many businesses in Kigali and across Rwanda rely on us for daily wholesale operations.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Our team understands local market dynamics and compliance requirements. We combine this with a modern platform so you can manage suppliers, customers, and finances without spreadsheets or manual ledgers. The result is a trusted Rwanda wholesale partner that grows with your business.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="who-its-for">
          <h2 id="who-its-for" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Who Benefits from Our Wholesale Services in Rwanda
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Retailers and shop owners in Kigali and other cities use Umugwaneza to restock inventory and manage supplier relationships. Distributors use our platform to track orders and payments across multiple customers. Cooperatives and agri-businesses use us for bulk procurement and sales reporting.
          </p>
          <p className="text-[#64748b] leading-relaxed mb-4">
            Schools, hospitals, and government-related entities can also benefit from a structured Rwanda wholesale partner for transparent procurement and audit trails. Whatever your sector, we aim to be the trusted wholesale partner that simplifies your supply chain in Rwanda.
          </p>
        </section>

        <section className="prose prose-slate max-w-none mb-10" aria-labelledby="next-steps">
          <h2 id="next-steps" className="text-2xl font-bold text-[#1e293b] mt-10 mb-4">
            Get Started with Umugwaneza
          </h2>
          <p className="text-[#64748b] leading-relaxed mb-6">
            If you are looking for a Rwanda wholesale partner that combines local presence with reliable systems, Umugwaneza is here to help. We also offer <a href="/rwanda-vehicle-rental" className="text-[#2563eb] hover:underline">Rwanda vehicle rental</a> and <a href="/trucks-and-machines-rental-rwanda" className="text-[#2563eb] hover:underline">trucks and machines rental in Rwanda</a> for businesses that need both wholesale and fleet solutions.
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
            <li><a href="/rwanda-vehicle-rental" className="text-[#2563eb] hover:underline">Rwanda Vehicle Rental</a></li>
            <li><a href="/trucks-and-machines-rental-rwanda" className="text-[#2563eb] hover:underline">Trucks & Machines Rental Rwanda</a></li>
          </ul>
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
