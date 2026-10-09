import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 pt-40">
      <p className="font-display text-8xl font-semibold text-primary">404</p>
      <h1 className="text-3xl font-semibold">This scene was cut.</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild>
        <Link to="/">Back to browse</Link>
      </Button>
    </main>
  );
}
