import { Button } from "@/components/ui/button";
import { ArrowRight, LogOut } from "lucide-react";

type AuthUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AuthAction = (formData: FormData) => void | Promise<void>;

type AuthControlsProps = {
  user: AuthUser | null;
  signInAction: AuthAction;
  signOutAction: AuthAction;
};

export function AuthControls({
  user,
  signInAction,
  signOutAction,
}: AuthControlsProps) {
  if (user) {
    const label = user.name ?? user.email ?? "Signed-in user";

    return (
      <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/80 p-1 shadow-sm backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {label.slice(0, 1).toUpperCase()}
        </div>
        <div className="hidden min-w-0 pr-1 text-sm sm:block">
          <p className="truncate font-medium">{user.name ?? "Google user"}</p>
          {user.email ? (
            <p className="hidden truncate text-xs text-muted-foreground lg:block">
              {user.email}
            </p>
          ) : null}
        </div>
        <form action={signOutAction}>
          <Button
            aria-label="Sign out"
            className="min-w-11 px-3 sm:px-4"
            type="submit"
            variant="ghost"
          >
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={signInAction} className="w-full">
      <Button className="w-full" type="submit" size="lg">
        Continue with Google
        <ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Button>
    </form>
  );
}
