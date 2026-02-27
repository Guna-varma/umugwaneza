import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Item, InsertItem } from "@shared/schema";
import { insertItemSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Pencil } from "lucide-react";

export default function ItemsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["umugwaneza", "items", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("items").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: { item_name: "", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
  });

  const editForm = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: { item_name: "", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertItem) => {
      const { data, error } = await db()
        .from("items")
        .insert({ ...values, business_id: businessId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Item;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Item[]>(["umugwaneza", "items", businessId], (prev) =>
        prev ? [newItem, ...prev] : [newItem]
      );
      toast({ title: t("common.item_created") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: InsertItem) => {
      if (!editingItem) throw new Error("No item selected");
      const { error } = await db()
        .from("items")
        .update({
          item_name: values.item_name,
          measurement_type: values.measurement_type,
          base_unit: values.base_unit,
          is_active: values.is_active,
        })
        .eq("id", editingItem.id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "items", businessId] });
      toast({ title: t("common.item_updated") });
      setEditOpen(false);
      setEditingItem(null);
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const startEdit = (item: Item) => {
    setEditingItem(item);
    editForm.reset({
      item_name: item.item_name,
      measurement_type: item.measurement_type,
      base_unit: item.base_unit,
      is_active: item.is_active,
    });
    setEditOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-page-fade max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] truncate" data-testid="text-page-title">{t("items.title")}</h1>
          <p className="text-sm text-[#64748b] mt-0.5">{t("items.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto min-h-[44px] h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02] touch-manipulation flex-shrink-0" data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" /> {t("items.add_item")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("items.add_new_item")}</DialogTitle>
              <DialogDescription>{t("items.add_first_item")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pr-6 sm:pr-0">
                <FormField control={form.control} name="item_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("items.item_name")}</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="measurement_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("items.measurement_type")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-measurement-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="WEIGHT">{t("items.weight")}</SelectItem>
                        <SelectItem value="VOLUME">{t("items.volume")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="base_unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("items.base_unit")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-base-unit"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="LITRE">Litre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-[#e2e8f0] p-4">
                    <FormLabel>{t("items.active")}</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-item">
                  {createMutation.isPending ? t("items.creating") : t("items.create_item")}
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
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !items?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("items.no_items")}</p>
              <p className="text-sm text-[#64748b]">{t("items.add_first_item")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("items.item_name")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("items.measurement_type")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("items.base_unit")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("items.status")}</TableHead>
                  <TableHead className="text-right text-[#64748b]">{t("fleet_customers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#e2e8f0] animate-row-slide"
                    style={{ animationDelay: `${i * 30}ms` }}
                    data-testid={`row-item-${item.id}`}
                  >
                    <TableCell className="font-medium text-[#1e293b]">{item.item_name}</TableCell>
                    <TableCell className="text-[#64748b]">{item.measurement_type}</TableCell>
                    <TableCell className="text-[#64748b]">{item.base_unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? t("items.active") : t("items.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => startEdit(item)}
                        data-testid={`button-edit-item-${item.id}`}
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
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
                className="space-y-4 pr-6 sm:pr-0"
              >
                <FormField
                  control={editForm.control}
                  name="item_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("items.item_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="measurement_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("items.measurement_type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-measurement-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEIGHT">{t("items.weight")}</SelectItem>
                          <SelectItem value="VOLUME">{t("items.volume")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="base_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("items.base_unit")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-base-unit">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="LITRE">Litre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-[#e2e8f0] p-4">
                      <FormLabel>{t("items.active")}</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-item"
                >
                  {updateMutation.isPending ? t("common.saving") : "Update item"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
