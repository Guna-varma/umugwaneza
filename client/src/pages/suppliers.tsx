import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Supplier, InsertSupplier } from "@shared/schema";
import { insertSupplierSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Pencil } from "lucide-react";

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["umugwaneza", "suppliers", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("suppliers").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: { supplier_name: "", phone: "", address: "", notes: "" },
  });

  const editForm = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: { supplier_name: "", phone: "", address: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertSupplier) => {
      const { error } = await db().from("suppliers").insert({ ...values, business_id: businessId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "suppliers", businessId] });
      toast({ title: t("common.supplier_created") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: InsertSupplier) => {
      if (!editingSupplier) throw new Error("No supplier selected");
      const { error } = await db()
        .from("suppliers")
        .update({
          supplier_name: values.supplier_name,
          phone: values.phone || null,
          address: values.address || null,
          notes: values.notes || null,
        })
        .eq("id", editingSupplier.id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "suppliers", businessId] });
      toast({ title: t("common.supplier_updated") });
      setEditOpen(false);
      setEditingSupplier(null);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const startEdit = (s: Supplier) => {
    setEditingSupplier(s);
    editForm.reset({
      supplier_name: s.supplier_name,
      phone: s.phone || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setEditOpen(true);
  };

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("suppliers.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("suppliers.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-supplier"><Plus className="h-4 w-4 mr-2" /> {t("suppliers.add_supplier")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("suppliers.add_new_supplier")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="supplier_name" render={({ field }) => (
                  <FormItem><FormLabel>{t("suppliers.supplier_name")}</FormLabel><FormControl><Input {...field} data-testid="input-supplier-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("suppliers.phone")}</FormLabel><FormControl><Input {...field} value={field.value || ""} data-testid="input-supplier-phone" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>{t("suppliers.address")}</FormLabel><FormControl><Input {...field} value={field.value || ""} data-testid="input-supplier-address" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("suppliers.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} data-testid="input-supplier-notes" /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-supplier">
                  {createMutation.isPending ? t("suppliers.creating") : t("suppliers.create_supplier")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !suppliers?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("suppliers.no_suppliers")}</p>
              <p className="text-sm text-[#64748b]">{t("suppliers.add_first")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("suppliers.supplier_name")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("suppliers.phone")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("suppliers.address")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("suppliers.notes")}</TableHead>
                  <TableHead className="text-right text-[#64748b]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s, i) => (
                  <TableRow
                    key={s.id}
                    className="border-b border-[#e2e8f0] animate-row-slide"
                    style={{ animationDelay: `${i * 30}ms` }}
                    data-testid={`row-supplier-${s.id}`}
                  >
                    <TableCell className="font-medium text-[#1e293b]">{s.supplier_name}</TableCell>
                    <TableCell className="text-[#64748b]">{s.phone || "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{s.address || "—"}</TableCell>
                    <TableCell className="text-[#64748b] max-w-[200px] truncate">{s.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => startEdit(s)}
                        data-testid={`button-edit-supplier-${s.id}`}
                      >
                        <Pencil className="h-3 w-3 mr-1.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingSupplier(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit supplier</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
                className="space-y-4 pr-6 sm:pr-0"
              >
                <FormField
                  control={editForm.control}
                  name="supplier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.supplier_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-supplier-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.address")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-supplier-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.notes")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} data-testid="input-edit-supplier-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-supplier"
                >
                  {updateMutation.isPending ? t("common.saving") : "Update supplier"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
