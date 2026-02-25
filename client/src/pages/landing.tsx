import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Building2, Package, Truck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] overflow-x-hidden">
      <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-12 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#2563eb]">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold text-[#1e293b] truncate">{t("app.name")}</span>
        </div>
        <Button
          className="h-10 sm:h-12 px-5 sm:px-8 bg-[#2563eb] text-white text-sm sm:text-base flex-shrink-0 touch-manipulation"
          onClick={() => setLocation("/login")}
          data-testid="button-landing-signin"
        >
          {t("landing.cta_signin")}
        </Button>
      </header>

      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#2563eb]/5 animate-landing-blob-1" />
          <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-[#2563eb]/3 animate-landing-blob-2" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-[#1e293b]/3 animate-landing-blob-3" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 md:pt-24 md:pb-32 text-center">
          <div className="animate-landing-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Rwanda · B2B Platform
            </div>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1e293b] max-w-4xl leading-tight animate-landing-fade-up px-1"
            style={{ animationDelay: "100ms" }}
            data-testid="text-landing-title"
          >
            {t("landing.hero_title")}
          </h1>

          <p
            className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-[#64748b] max-w-2xl leading-relaxed animate-landing-fade-up px-2"
            style={{ animationDelay: "200ms" }}
          >
            {t("landing.hero_subtitle")}
          </p>

          <div
            className="mt-8 sm:mt-10 animate-landing-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              className="h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base bg-[#2563eb] text-white touch-manipulation"
              onClick={() => setLocation("/login")}
              data-testid="button-landing-signin-hero"
            >
              {t("landing.cta_signin")}
            </Button>
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Package, titleKey: "landing.feature1_title", descKey: "landing.feature1_desc", delay: "400ms" },
              { icon: Truck, titleKey: "landing.feature2_title", descKey: "landing.feature2_desc", delay: "500ms" },
              { icon: FileText, titleKey: "landing.feature3_title", descKey: "landing.feature3_desc", delay: "600ms" },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
              <div
                key={feature.titleKey}
                className="group bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6 transition-transform duration-200 hover:scale-[1.02] animate-landing-fade-up"
                style={{ animationDelay: feature.delay }}
                data-testid={`card-feature-${feature.titleKey.split(".")[1]}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2563eb]/10 mb-4">
                  <Icon className="h-6 w-6 text-[#2563eb]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1e293b] mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{t(feature.descKey)}</p>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <footer className="relative z-10 py-8 text-center border-t border-[#e2e8f0]">
        <p className="text-sm text-[#64748b]">{t("app.copyright", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
