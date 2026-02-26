import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAP = {
  name: "Umugwaneza LTD",
  address: "Kigali, Rwanda",
  phone: "+250 788 000 000",
  email: "contact@umugwaneza.com",
} as const;

export function PublicHeader() {
  const [, setLocation] = useLocation();
  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-12 gap-2">
      <a href="/" className="flex items-center gap-2 sm:gap-3 min-w-0" aria-label="Umugwaneza – Home">
        <Logo size="lg" inline decorative />
        <span className="text-base sm:text-lg font-bold text-[#1e293b] truncate">Umugwaneza</span>
      </a>
      <Button
        className="h-10 sm:h-12 px-5 sm:px-8 bg-[#2563eb] text-white text-sm sm:text-base flex-shrink-0 touch-manipulation"
        onClick={() => setLocation("/login")}
        data-testid="button-landing-signin"
      >
        Sign In
      </Button>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="relative z-10 py-8 border-t border-[#e2e8f0] bg-white/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Logo size="sm" inline decorative />
            <p className="text-sm font-medium text-[#1e293b]">{NAP.name}</p>
            <address className="text-sm text-[#64748b] not-italic text-center sm:text-left">
              {NAP.address}
              <br />
              <a href={`tel:${NAP.phone.replace(/\s/g, "")}`} className="hover:text-[#2563eb]">{NAP.phone}</a>
              <br />
              <a href={`mailto:${NAP.email}`} className="hover:text-[#2563eb]">{NAP.email}</a>
            </address>
          </div>
          <nav className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 text-sm" aria-label="Service pages">
            <a href="/rwanda-wholesale-partner" className="text-[#64748b] hover:text-[#2563eb]">Rwanda Wholesale Partner</a>
            <a href="/rwanda-vehicle-rental" className="text-[#64748b] hover:text-[#2563eb]">Rwanda Vehicle Rental</a>
            <a href="/trucks-and-machines-rental-rwanda" className="text-[#64748b] hover:text-[#2563eb]">Trucks & Machines Rental</a>
          </nav>
        </div>
        <p className="text-sm text-[#64748b] text-center sm:text-left mt-6 pt-6 border-t border-[#e2e8f0]">
          © {new Date().getFullYear()} {NAP.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
