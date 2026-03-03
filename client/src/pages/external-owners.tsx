import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { ExternalAssetOwner, InsertExternalOwner } from "@shared/schema";
import { insertExternalOwnerSchema } from "@shared/schema";
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
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ListTableToolbar } from "@/components/ListTableToolbar";
import { useListTable } from "@/hooks/useListTable";
import { Plus, UserPlus, Pencil, Trash2 } from "lucide-react";

export default function ExternalOwnersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<ExternalAssetOwner | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<ExternalAssetOwner | null>(null);

  const { data: owners, isLoading } = useQuery<ExternalAssetOwner[]>({
    queryKey: ["umugwaneza", "external_asset_owners", businessId],
    queryFn: async () => {
      const { data, error } = await db()
        .from("external_asset_owners")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const getSearchable = useCallback((o: ExternalAssetOwner) =>
    [o.owner_name, o.phone, o.address, o.notes].filter(Boolean).join(" "), []);
  const list = useListTable(
    owners ?? [],
    ["owner_name", "phone", "address", "notes"],
    getSearchable,
    10
  );

  const form = useForm<InsertExternalOwner>({
    resolver: zodResolver(insertExternalOwnerSchema),
    defaultValues: { owner_name: "", phone: "", address: "", notes: "" },
  });

  const editForm = useForm<InsertExternalOwner>({
    resolver: zodResolver(insertExternalOwnerSchema),
    defaultValues: { owner_name: "", phone: "", address: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertExternalOwner) => {
      const { error } = await db().from("external_asset_owners").insert({ ...values, business_id: businessId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "external_asset_owners", businessId] });
      toast({ title: t("common.owner_created") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: InsertExternalOwner) => {
      if (!editingOwner) throw new Error("No owner selected");
      const { error } = await db()
        .from("external_asset_owners")
        .update({
          owner_name: values.owner_name,
          phone: values.phone || null,
          address: values.address || null,
          notes: values.notes || null,
        })
        .eq("id", editingOwner.id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "external_asset_owners", businessId] });
      toast({ title: t("common.owner_updated") });
      setEditOpen(false);
      setEditingOwner(null);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("external_asset_owners")
        .update({ is_active: false })
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "external_asset_owners", businessId] });
      toast({ title: t("common.owner_updated"), description: "External owner deleted." });
      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
    },
    onError: (e: unknown) =>
      toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const startEdit = (o: ExternalAssetOwner) => {
    setEditingOwner(o);
    editForm.reset({
      owner_name: o.owner_name,
      phone: o.phone || "",
      address: o.address || "",
      notes: o.notes || "",
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (o: ExternalAssetOwner) => {
    setOwnerToDelete(o);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ownerToDelete) deleteMutation.mutate(ownerToDelete.id);
  };

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("external_owners.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("external_owners.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-owner"><Plus className="h-4 w-4 mr-2" /> {t("external_owners.add_owner")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("external_owners.add_new_owner")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="owner_name" render={({ field }) => (
                  <FormItem><FormLabel>{t("external_owners.owner_name")}</FormLabel><FormControl><Input {...field} data-testid="input-owner-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("external_owners.phone")}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>{t("external_owners.address")}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("external_owners.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-owner">
                  {createMutation.isPending ? t("external_owners.creating") : t("external_owners.create_owner")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !owners?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserPlus className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("external_owners.no_owners")}</p>
              <p className="text-sm text-[#64748b]">{t("external_owners.add_first")}</p>
            </div>
          ) : (
            <>
              <ListTableToolbar
                search={list.search}
                onSearchChange={(v) => { list.setSearch(v); list.resetPage(); }}
                pageSize={list.pageSize}
                pageSizes={list.pageSizes}
                onPageSizeChange={list.setPageSize}
                from={list.from}
                to={list.to}
                total={list.totalItems}
                page={list.page}
                totalPages={list.totalPages}
                onPageChange={list.setPage}
              />
              {list.pageItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[#64748b] font-medium">{t("common.no_results_search")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#e2e8f0]">
                      <TableHead className="text-[#64748b]">{t("external_owners.owner_name")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("external_owners.phone")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("external_owners.address")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("external_owners.notes")}</TableHead>
                      <TableHead className="text-right text-[#64748b]">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.pageItems.map((o, i) => (
                      <TableRow
                        key={o.id}
                        className="border-b border-[#e2e8f0] animate-row-slide hover:bg-[#f8fafc]"
                        style={{ animationDelay: `${i * 30}ms` }}
                        data-testid={`row-owner-${o.id}`}
                      >
                        <TableCell className="font-medium text-[#1e293b]">{o.owner_name}</TableCell>
                        <TableCell className="text-[#64748b]">{o.phone || "—"}</TableCell>
                        <TableCell className="text-[#64748b]">{o.address || "—"}</TableCell>
                        <TableCell className="text-[#64748b] max-w-[200px] truncate">{o.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => startEdit(o)}
                              data-testid={`button-edit-owner-${o.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-1.5" />
                              {t("common.edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => openDeleteDialog(o)}
                              data-testid={`button-delete-owner-${o.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1.5" />
                              {t("common.delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={ownerToDelete?.owner_name ?? ""}
        entityKey="entity_external_owner"
        departmentKey="department_rental"
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingOwner(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit owner</DialogTitle>
          </DialogHeader>
          {editingOwner && (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
                className="space-y-4 pr-6 sm:pr-0"
              >
                <FormField
                  control={editForm.control}
                  name="owner_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("external_owners.owner_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-owner-name" />
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
                      <FormLabel>{t("external_owners.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-owner-phone" />
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
                      <FormLabel>{t("external_owners.address")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-owner-address" />
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
                      <FormLabel>{t("external_owners.notes")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} data-testid="input-edit-owner-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-owner"
                >
                  {updateMutation.isPending ? t("common.saving") : "Update owner"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
