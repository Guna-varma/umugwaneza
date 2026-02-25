import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { db } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AdminBusinessesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["umugwaneza", "businesses"],
    queryFn: async () => {
      const { data, error } = await db().from("businesses").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const id = "biz_" + Date.now();
      const { error } = await db().from("businesses").insert({ id, name, currency: "RWF" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "businesses"] });
      toast({ title: t("common.business_created") });
      setName("");
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("admin.businesses_title")}</h1>
          <p className="text-sm text-[#64748b]">{t("admin.businesses_subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-create-business"><Plus className="h-4 w-4 mr-2" /> {t("admin.create_business")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.create_business")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.business_name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("admin.business_name")} data-testid="input-business-name" />
              </div>
              <Button className="w-full h-12 bg-[#2563eb]" onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} data-testid="button-submit-business">
                {createMutation.isPending ? t("admin.creating") : t("admin.create_business")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !businesses?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("admin.no_businesses")}</p>
              <p className="text-sm text-[#64748b]">{t("admin.add_first_business")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">ID</TableHead>
                  <TableHead className="text-[#64748b]">{t("admin.business_name")}</TableHead>
                  <TableHead className="text-[#64748b]">Currency</TableHead>
                  <TableHead className="text-[#64748b]">{t("common.created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((b: any, i: number) => (
                  <TableRow key={b.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell className="font-mono text-xs text-[#64748b]">{b.id}</TableCell>
                    <TableCell className="font-medium text-[#1e293b]">{b.name}</TableCell>
                    <TableCell className="text-[#64748b]">{b.currency}</TableCell>
                    <TableCell className="text-[#64748b]">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
