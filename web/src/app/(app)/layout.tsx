import { UserButton } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-white">
        <span className="font-semibold text-sm tracking-tight">our-space</span>
        <UserButton />
      </header>
      <main className="flex-1 flex">{children}</main>
    </div>
  );
}
