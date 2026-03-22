import { UserButton } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0C0C0E]">
      <header className="border-b border-[#27272B] px-6 py-3 flex items-center justify-between bg-[#0C0C0E] shrink-0">
        <span className="font-semibold text-sm tracking-tight text-[#EDEDEF]">our-space</span>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
            },
          }}
        />
      </header>
      <main className="flex-1 flex overflow-hidden">{children}</main>
    </div>
  );
}
