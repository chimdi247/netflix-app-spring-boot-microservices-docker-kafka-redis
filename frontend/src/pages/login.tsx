import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/queries";
import type { Genre } from "@/lib/types";
import { Logo } from "@/components/logo";
import { PosterArt } from "@/components/poster-art";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
});
type RegisterValues = z.infer<typeof registerSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const SHOWCASE: { title: string; genre: Genre; releaseYear: number }[] = [
  { title: "Neon Horizon", genre: "SCI_FI", releaseYear: 2024 },
  { title: "Paper Lanterns", genre: "DRAMA", releaseYear: 2023 },
  { title: "Static Bloom", genre: "THRILLER", releaseYear: 2022 },
  { title: "The Long Quiet", genre: "DOCUMENTARY", releaseYear: 2021 },
  { title: "Saltwater", genre: "ROMANCE", releaseYear: 2024 },
  { title: "Ember Run", genre: "ACTION", releaseYear: 2023 },
  { title: "Midnight Orchard", genre: "HORROR", releaseYear: 2020 },
  { title: "Pocket Moon", genre: "ANIMATION", releaseYear: 2022 },
];

/** Two columns of generated posters drifting in opposite rhythm. The lists are doubled so the loop is seamless. */
function Showcase() {
  const column = (items: typeof SHOWCASE, cls: string) => (
    <div className="overflow-hidden">
      <div className={`flex flex-col gap-4 ${cls}`}>
        {[...items, ...items].map((m, i) => (
          <div key={i} className="aspect-[2/3] w-full overflow-hidden rounded-md ring-1 ring-white/10">
            <PosterArt movie={{ ...m, thumbnailUrl: null }} />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div aria-hidden className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-4 opacity-70">
      {column(SHOWCASE.slice(0, 4).concat(SHOWCASE.slice(0, 2)), "drift")}
      {column(SHOWCASE.slice(2).concat(SHOWCASE.slice(0, 2)), "drift-slow")}
      {column(SHOWCASE.slice(4).concat(SHOWCASE.slice(0, 4)), "drift")}
    </div>
  );
}

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const [tab, setTab] = useState("signin");

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { fullName: "", email: "", password: "" } });

  if (user) return <Navigate to="/" replace />;

  const onLogin = loginForm.handleSubmit(async ({ email, password }) => {
    try {
      await signIn(email, password);
    } catch (e) {
      toast.error("Couldn't sign you in", { description: errorMessage(e) });
    }
  });

  const onRegister = registerForm.handleSubmit(async (values) => {
    try {
      await signUp(values);
      toast.success("Welcome", { description: "Your account is ready." });
    } catch (e) {
      toast.error("Couldn't create your account", { description: errorMessage(e) });
    }
  });

  const le = loginForm.formState.errors;
  const re = registerForm.formState.errors;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Showcase />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/10 via-ink/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo className="text-3xl" />
          <div className="max-w-md">
            <h2 className="rise-in text-6xl font-semibold leading-[0.95]" style={{ animationDelay: "0.1s" }}>
              Stories,
              <br />
              on demand.
            </h2>
            <p className="rise-in mt-5 max-w-sm text-lg text-white/70" style={{ animationDelay: "0.3s" }}>
              Adaptive streaming from your own private library: it picks the best quality for your connection, second by second.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 block text-3xl lg:hidden" />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="text-3xl font-semibold">Welcome back</h1>
              <form onSubmit={onLogin} className="mt-5 space-y-4" noValidate>
                <Field label="Email" error={le.email?.message}>
                  <Input type="email" autoComplete="email" aria-invalid={!!le.email} {...loginForm.register("email")} />
                </Field>
                <Field label="Password" error={le.password?.message}>
                  <Input type="password" autoComplete="current-password" aria-invalid={!!le.password} {...loginForm.register("password")} />
                </Field>
                <Button type="submit" className="w-full" size="lg" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting && <Loader2 className="animate-spin" />}
                  Sign in
                </Button>
              </form>
              <div className="mt-6 rounded-md border border-dashed p-4 text-sm">
                <p className="font-medium">Demo accounts</p>
                <p className="mt-1 text-muted-foreground">Both use the password <code className="text-foreground">password123</code>.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["admin@example.com", "Admin: can manage the catalog"],
                    ["viewer@example.com", "Viewer: watch only"],
                  ].map(([email, hint]) => (
                    <Button
                      key={email}
                      type="button"
                      size="sm"
                      variant="outline"
                      title={hint}
                      onClick={() => {
                        loginForm.setValue("email", email);
                        loginForm.setValue("password", "password123");
                      }}
                    >
                      {email.split("@")[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="text-3xl font-semibold">Create your account</h1>
              <form onSubmit={onRegister} className="mt-5 space-y-4" noValidate>
                <Field label="Full name" error={re.fullName?.message}>
                  <Input autoComplete="name" aria-invalid={!!re.fullName} {...registerForm.register("fullName")} />
                </Field>
                <Field label="Email" error={re.email?.message}>
                  <Input type="email" autoComplete="email" aria-invalid={!!re.email} {...registerForm.register("email")} />
                </Field>
                <Field label="Password" error={re.password?.message}>
                  <Input type="password" autoComplete="new-password" aria-invalid={!!re.password} {...registerForm.register("password")} />
                </Field>
                <Button type="submit" className="w-full" size="lg" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting && <Loader2 className="animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
