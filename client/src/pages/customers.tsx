import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Customer, InsertCustomer } from "@shared/schema";
import { insertCustomerSchema } from "@shared/schema";
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
import { Plus, UserCheck, Pencil, Trash2 } from "lucide-react";

export default function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["umugwaneza", "customers", businessId, "GROCERY"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .eq("segment", "GROCERY")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const getSearchable = useCallback((c: Customer) =>
    [c.customer_name, c.phone, c.address, c.notes].filter(Boolean).join(" "), []);
  const list = useListTable(
    customers ?? [],
    ["customer_name", "phone", "address", "notes"],
    getSearchable,
    10
  );

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: { customer_name: "", phone: "", address: "", notes: "" },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: { customer_name: "", phone: "", address: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertCustomer) => {
      const { error } = await db()
        .from("customers")
        .insert({
          customer_name: values.customer_name,
          phone: values.phone || null,
          address: values.address || null,
          notes: values.notes || null,
          segment: "GROCERY",
          business_id: businessId,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId, "GROCERY"] });
      toast({ title: t("common.customer_created") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: InsertCustomer) => {
      if (!editingCustomer) throw new Error("No customer selected");
      const { error } = await db()
        .from("customers")
        .update({
          customer_name: values.customer_name,
          phone: values.phone || null,
          address: values.address || null,
          notes: values.notes || null,
        })
        .eq("id", editingCustomer.id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId, "GROCERY"] });
      toast({ title: t("common.customer_updated") });
      setEditOpen(false);
      setEditingCustomer(null);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("customers")
        .update({ is_active: false })
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId, "GROCERY"] });
      toast({ title: t("common.customer_updated"), description: "Customer deleted." });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (e: unknown) =>
      toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const startEdit = (c: Customer) => {
    setEditingCustomer(c);
    editForm.reset({
      customer_name: c.customer_name,
      phone: c.phone || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (c: Customer) => {
    setCustomerToDelete(c);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) deleteMutation.mutate(customerToDelete.id);
  };

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("customers.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("customers.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-customer"><Plus className="h-4 w-4 mr-2" /> {t("customers.add_customer")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("customers.add_new_customer")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="customer_name" render={({ field }) => (
                  <FormItem><FormLabel>{t("customers.customer_name")}</FormLabel><FormControl><Input {...field} data-testid="input-customer-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("customers.phone")}</FormLabel><FormControl><Input {...field} value={field.value || ""} data-testid="input-customer-phone" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>{t("customers.address")}</FormLabel><FormControl><Input {...field} value={field.value || ""} data-testid="input-customer-address" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("customers.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} data-testid="input-customer-notes" /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-customer">
                  {createMutation.isPending ? t("customers.creating") : t("customers.create_customer")}
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
          ) : !customers?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("customers.no_customers")}</p>
              <p className="text-sm text-[#64748b]">{t("customers.add_first")}</p>
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
                      <TableHead className="text-[#64748b]">{t("customers.customer_name")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("customers.phone")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("customers.address")}</TableHead>
                      <TableHead className="text-[#64748b]">{t("customers.notes")}</TableHead>
                      <TableHead className="text-right text-[#64748b]">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.pageItems.map((c, i) => (
                      <TableRow
                        key={c.id}
                        className="border-b border-[#e2e8f0] animate-row-slide hover:bg-[#f8fafc]"
                        style={{ animationDelay: `${i * 30}ms` }}
                        data-testid={`row-customer-${c.id}`}
                      >
                        <TableCell className="font-medium text-[#1e293b]">{c.customer_name}</TableCell>
                        <TableCell className="text-[#64748b]">{c.phone || "—"}</TableCell>
                        <TableCell className="text-[#64748b]">{c.address || "—"}</TableCell>
                        <TableCell className="text-[#64748b] max-w-[200px] truncate">{c.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => startEdit(c)}
                              data-testid={`button-edit-customer-${c.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-1.5" />
                              {t("common.edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => openDeleteDialog(c)}
                              data-testid={`button-delete-customer-${c.id}`}
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
        itemName={customerToDelete?.customer_name ?? ""}
        entityKey="entity_customer"
        departmentKey="department_grocery"
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingCustomer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
                className="space-y-4 pr-6 sm:pr-0"
              >
                <FormField
                  control={editForm.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customers.customer_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-customer-name" />
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
                      <FormLabel>{t("customers.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-customer-phone" />
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
                      <FormLabel>{t("customers.address")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-customer-address" />
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
                      <FormLabel>{t("customers.notes")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} data-testid="input-edit-customer-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-customer"
                >
                  {updateMutation.isPending ? t("common.saving") : "Update customer"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
