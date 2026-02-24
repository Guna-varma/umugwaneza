import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminOwnersPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("admin.owners_title")}</h1>
        <p className="text-sm text-[#64748b]">{t("admin.owners_subtitle")}</p>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <UserPlus className="h-12 w-12 text-[#64748b] mb-4" />
            <p className="text-[#1e293b] font-medium mb-2">{t("admin.owners_title")}</p>
            <p className="text-sm text-[#64748b] max-w-md">
              {t("admin.owners_subtitle")}
            </p>
            <div className="mt-6 rounded-lg border border-[#e2e8f0] p-4 bg-[#f1f5f9] text-sm text-left w-full max-w-md">
              <p className="font-medium text-[#1e293b] mb-2">{t("admin.credentials_title")}:</p>
              <div className="space-y-1 text-[#64748b]">
                <p>{t("admin.admin_credential")}</p>
                <p>{t("admin.owner_credential")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
