import { Button } from "@/components/ui/button";

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
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {label.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{user.name ?? "Google user"}</p>
          {user.email ? (
            <p className="truncate text-muted-foreground">{user.email}</p>
          ) : null}
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={signInAction}>
      <Button type="submit" size="lg">
        Continue with Google
      </Button>
    </form>
  );
}
