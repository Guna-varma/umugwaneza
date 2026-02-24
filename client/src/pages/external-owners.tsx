import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, UserPlus } from "lucide-react";

export default function ExternalOwnersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: owners, isLoading } = useQuery<ExternalAssetOwner[]>({
    queryKey: ["/api/external-owners"],
  });

  const form = useForm<InsertExternalOwner>({
    resolver: zodResolver(insertExternalOwnerSchema),
    defaultValues: { owner_name: "", phone: "", address: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertExternalOwner) => {
      await apiRequest("POST", "/api/external-owners", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-owners"] });
      toast({ title: "External owner added successfully" });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">External Asset Owners</h1>
          <p className="text-sm text-[#64748b]">Manage external vehicle/machinery owners</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb]" data-testid="button-add-owner"><Plus className="h-4 w-4 mr-2" /> Add Owner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add External Owner</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="owner_name" render={({ field }) => (
                  <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} data-testid="input-owner-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-owner">
                  {createMutation.isPending ? "Adding..." : "Add Owner"}
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
          ) : !owners?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserPlus className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">No external owners yet</p>
              <p className="text-sm text-[#64748b]">Add external asset owners for incoming rentals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">Name</TableHead>
                  <TableHead className="text-[#64748b]">Phone</TableHead>
                  <TableHead className="text-[#64748b]">Address</TableHead>
                  <TableHead className="text-[#64748b]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((o) => (
                  <TableRow key={o.id} className="border-b border-[#e2e8f0]" data-testid={`row-owner-${o.id}`}>
                    <TableCell className="font-medium text-[#1e293b]">{o.owner_name}</TableCell>
                    <TableCell className="text-[#64748b]">{o.phone || "—"}</TableCell>
                    <TableCell className="text-[#64748b]">{o.address || "—"}</TableCell>
                    <TableCell className="text-[#64748b] max-w-[200px] truncate">{o.notes || "—"}</TableCell>
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
