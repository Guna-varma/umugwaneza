import { useState } from "react";
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
import { Plus, UserCheck, Pencil } from "lucide-react";

export default function FleetCustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["umugwaneza", "customers", businessId, "FLEET"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .eq("segment", "FLEET")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const createForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: { customer_name: "", phone: "", address: "", notes: "", segment: "FLEET" },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: { customer_name: "", phone: "", address: "", notes: "", segment: "FLEET" },
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
          segment: "FLEET",
          business_id: businessId,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId, "FLEET"] });
      toast({ title: t("fleet_customers.customer_created") });
      createForm.reset({ customer_name: "", phone: "", address: "", notes: "", segment: "FLEET" });
      setCreateOpen(false);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
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
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId, "FLEET"] });
      toast({ title: t("fleet_customers.customer_updated") });
      setEditOpen(false);
      setEditingCustomer(null);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.reset({
      customer_name: customer.customer_name,
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
      segment: "FLEET",
    });
    setEditOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-page-fade max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] truncate" data-testid="text-page-title">
            {t("fleet_customers.title")}
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">{t("fleet_customers.subtitle")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto min-h-[44px] h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02] touch-manipulation flex-shrink-0" data-testid="button-add-fleet-customer">
              <Plus className="h-4 w-4 mr-2" /> {t("fleet_customers.add_customer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("fleet_customers.add_new_customer")}</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4 pr-6 sm:pr-0"
              >
                <FormField
                  control={createForm.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customers.customer_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-fleet-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customers.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-fleet-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customers.address")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-fleet-customer-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("customers.notes")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} data-testid="input-fleet-customer-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-fleet-customer"
                >
                  {createMutation.isPending ? t("customers.creating") : t("customers.create_customer")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !customers?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("fleet_customers.no_customers")}</p>
              <p className="text-sm text-[#64748b]">{t("fleet_customers.add_first")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("customers.customer_name")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.phone")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.address")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.notes")}</TableHead>
                  <TableHead className="text-right text-[#64748b]">{t("fleet_customers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c, i) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-[#e2e8f0] animate-row-slide"
                    style={{ animationDelay: `${i * 30}ms` }}
                    data-testid={`row-fleet-customer-${c.id}`}
                  >
                    <TableCell className="font-medium text-[#1e293b]">{c.customer_name}</TableCell>
                    <TableCell className="text-[#64748b]">{c.phone || "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{c.address || "—"}</TableCell>
                    <TableCell className="text-[#64748b] max-w-[220px] truncate">
                      {c.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => startEdit(c)}
                        data-testid={`button-edit-fleet-customer-${c.id}`}
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

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setEditingCustomer(null);
      }}>
        <DialogContent className="max-w-lg">
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
                        <Input {...field} data-testid="input-edit-fleet-customer-name" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-edit-fleet-customer-phone" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-edit-fleet-customer-address" />
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
                        <Textarea {...field} value={field.value || ""} data-testid="input-edit-fleet-customer-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-fleet-customer"
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

