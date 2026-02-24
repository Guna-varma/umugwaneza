import { Building2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminOwnersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Create Owner</h1>
        <p className="text-sm text-[#64748b]">Assign owners to businesses</p>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <UserPlus className="h-12 w-12 text-[#64748b] mb-4" />
            <p className="text-[#1e293b] font-medium mb-2">Owner Management</p>
            <p className="text-sm text-[#64748b] max-w-md">
              Owner accounts are currently managed through dummy authentication.
              When production auth is enabled, this page will allow creating and assigning owner accounts to businesses.
            </p>
            <div className="mt-6 rounded-lg border border-[#e2e8f0] p-4 bg-[#f1f5f9] text-sm text-left w-full max-w-md">
              <p className="font-medium text-[#1e293b] mb-2">Current Demo Accounts:</p>
              <div className="space-y-1 text-[#64748b]">
                <p>System Admin: admin@umugwaneza.rw / 123456</p>
                <p>Business Owner: owner@umugwaneza.rw / 123456</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
