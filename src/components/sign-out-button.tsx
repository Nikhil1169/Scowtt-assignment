import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-2.5 text-sm font-medium text-zinc-200 shadow-sm transition hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/40 active:scale-[0.99] sm:w-auto"
      >
        Log out
      </button>
    </form>
  );
}
