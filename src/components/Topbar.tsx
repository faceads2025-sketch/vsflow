import { HelpCircle } from "lucide-react";

export default function Topbar({ title }: { title?: string }) {
  return (
    <header className="flex items-center justify-between px-8 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <HelpCircle className="h-5 w-5 text-ink-faint" />
        <div className="relative grid h-8 w-8 place-items-center rounded-full bg-gray-900 text-xs font-semibold text-white">
          KC
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-green" />
        </div>
      </div>
    </header>
  );
}
