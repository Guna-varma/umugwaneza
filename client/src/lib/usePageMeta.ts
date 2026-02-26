import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const SITE_NAME = "Umugwaneza";

/** Route → translation key for page title (nav or page title) */
const routeTitleKey: Record<string, string> = {
  "/": "landing.hero_title",
  "/login": "auth.signin",
  "/dashboard": "dashboard.title",
  "/items": "nav.items",
  "/suppliers": "nav.suppliers",
  "/customers": "nav.customers",
  "/purchases": "nav.purchases",
  "/sales": "nav.sales",
  "/payments": "nav.payments",
  "/vehicles": "vehicles.title",
  "/external-owners": "external_owners.title",
  "/rentals/outgoing": "rentals.outgoing_title",
  "/rentals/incoming": "rentals.incoming_title",
  "/reports": "nav.reports",
  "/notifications": "nav.notifications",
  "/admin/businesses": "admin.businesses_title",
  "/admin/owners": "admin.owners_title",
};

/**
 * Sets document title (and optionally meta description) per route.
 * Format: "Page Name | Umugwaneza" for B2B consistency.
 * Call with current path from useLocation() so it updates on client-side navigation.
 */
export function usePageMeta(path: string) {
  const { t } = useTranslation();

  useEffect(() => {
    const basePath = (path || "/").replace(/\/$/, "") || "/";
    const key = routeTitleKey[basePath] ?? routeTitleKey["/"];
    const pageTitle = t(key);
    const title = pageTitle ? `${pageTitle} | ${SITE_NAME}` : `${SITE_NAME} | B2B Wholesale & Fleet Platform`;
    document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && basePath !== "/" && basePath !== "/login") {
      const desc = t("app.tagline");
      if (desc) metaDesc.setAttribute("content", desc);
    }
  }, [path, t]);
}
