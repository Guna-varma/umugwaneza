import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (!success) {
      setError("Invalid email or password.");
    }
  };

  const handleQuickLogin = (role: "admin" | "owner") => {
    if (role === "admin") {
      login("admin@umugwaneza.rw", "123456");
    } else {
      login("owner@umugwaneza.rw", "123456");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#2563eb] mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-app-title">UMUGWANEZA LTD</h1>
          <p className="text-sm text-[#64748b] mt-1">Wholesale Trading + Fleet & Machinery Rental</p>
        </div>

        <Card className="border border-[#e2e8f0] bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#1e293b]">Sign In</CardTitle>
            <CardDescription className="text-[#64748b]">Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1e293b]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-[#e2e8f0]"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1e293b]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#e2e8f0]"
                  data-testid="input-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg" data-testid="text-error">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-[#2563eb] text-white" data-testid="button-login">
                Sign In
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#e2e8f0]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[#64748b]">Quick Access</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="h-12 border-[#e2e8f0] text-[#1e293b]"
                  onClick={() => handleQuickLogin("admin")}
                  data-testid="button-quick-admin"
                >
                  System Admin
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-[#e2e8f0] text-[#1e293b]"
                  onClick={() => handleQuickLogin("owner")}
                  data-testid="button-quick-owner"
                >
                  Business Owner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#64748b] mt-6">
          &copy; {new Date().getFullYear()} UMUGWANEZA LTD. All rights reserved.
        </p>
      </div>
    </div>
  );
}
