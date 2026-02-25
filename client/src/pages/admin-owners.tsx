import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/supabase";

export default function AdminOwnersPage() {
  const { t } = useTranslation();
  const { data: users, isLoading } = useQuery({
    queryKey: ["umugwaneza", "users"],
    queryFn: async () => {
      const { data, error } = await db().from("users").select("id, email, full_name, role, business_id, is_active, created_at").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("admin.owners_title")}</h1>
        <p className="text-sm text-[#64748b]">{t("admin.owners_subtitle")}</p>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : users?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("admin.email")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("admin.full_name")}</TableHead>
                  <TableHead className="text-[#64748b]">Role</TableHead>
                  <TableHead className="text-[#64748b]">Business</TableHead>
                  <TableHead className="text-[#64748b]">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id} className="border-b border-[#e2e8f0]">
                    <TableCell className="text-[#1e293b]">{u.email}</TableCell>
                    <TableCell className="text-[#64748b]">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{u.role}</TableCell>
                    <TableCell className="text-[#64748b] font-mono text-xs">{u.business_id ?? "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{u.is_active ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center p-8">
              <UserPlus className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium mb-2">{t("admin.owners_title")}</p>
              <p className="text-sm text-[#64748b] max-w-md">{t("admin.owners_subtitle")}</p>
              <div className="mt-6 rounded-lg border border-[#e2e8f0] p-4 bg-[#f1f5f9] text-sm text-left w-full max-w-md">
                <p className="font-medium text-[#1e293b] mb-2">{t("admin.credentials_title")}:</p>
                <div className="space-y-1 text-[#64748b]">
                  <p>{t("admin.admin_credential")}</p>
                  <p>{t("admin.owner_credential")}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
