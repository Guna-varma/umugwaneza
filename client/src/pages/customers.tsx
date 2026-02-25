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
import { Plus, UserCheck } from "lucide-react";

export default function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["umugwaneza", "customers", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("customers").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: { customer_name: "", phone: "", address: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertCustomer) => {
      const { error } = await db().from("customers").insert({ ...values, business_id: businessId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "customers", businessId] });
      toast({ title: t("common.customer_created") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

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

      <Card className="border border-[#e2e8f0] bg-white">
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("customers.customer_name")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.phone")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.address")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("customers.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c, i) => (
                  <TableRow key={c.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-customer-${c.id}`}>
                    <TableCell className="font-medium text-[#1e293b]">{c.customer_name}</TableCell>
                    <TableCell className="text-[#64748b]">{c.phone || "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{c.address || "—"}</TableCell>
                    <TableCell className="text-[#64748b] max-w-[200px] truncate">{c.notes || "—"}</TableCell>
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
