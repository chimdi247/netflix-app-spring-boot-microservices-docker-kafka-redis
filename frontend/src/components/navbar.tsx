import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Clapperboard, LogOut, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Logo } from "./logo";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // keep the box in sync when the URL changes (for example "Browse" clears the search)
  useEffect(() => {
    setQuery(location.pathname === "/" ? params.get("q") ?? "" : "");
  }, [location.pathname, params]);

  const onSearch = (value: string) => {
    setQuery(value);
    navigate(value.trim() ? `/?q=${encodeURIComponent(value)}` : "/", { replace: true });
  };

  if (!user) return null;
  const initials = user.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const link = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors", isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground");

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-colors duration-300", scrolled ? "bg-background/90 backdrop-blur" : "bg-gradient-to-b from-ink/90 to-transparent")}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-8">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/" end className={link}>
            Browse
          </NavLink>
          {isAdmin && (
            <NavLink to="/studio" className={link}>
              <span className="flex items-center gap-1.5">
                <Clapperboard className="h-4 w-4" /> Studio
              </span>
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search titles, directors and cast" value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Titles, people" className="h-9 w-56 bg-ink/60 pl-9" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account menu" className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="block font-medium">{user.fullName}</span>
                <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                {isAdmin && (
                  <span className="mt-1 flex items-center gap-1 text-xs font-normal text-amber">
                    <Shield className="h-3 w-3" /> Administrator
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
