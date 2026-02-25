import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LayoutDashboard, Building2 } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export default function NotFound() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "SYSTEM_ADMIN";
  const homeUrl = isAdmin ? "/admin/businesses" : "/dashboard";
  const homeLabel = isAdmin ? "Go to Admin" : "Back to Dashboard";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4">
      <Card className="w-full max-w-md border-[#e2e8f0] bg-white">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fef2f2]">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-[#1e293b]">Page not found</h1>
          </div>
          <p className="text-sm text-[#64748b] mb-6">
            The page at <span className="font-mono text-[#1e293b]">{location || "/"}</span> could not be found.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="h-12 bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Link href={homeUrl}>
                {isAdmin ? <Building2 className="h-4 w-4 mr-2" /> : <LayoutDashboard className="h-4 w-4 mr-2" />}
                {homeLabel}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
