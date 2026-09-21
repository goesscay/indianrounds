import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <Image src="/brand/logo.jpeg" alt="Indian Rounds" width={320} height={94} priority />
      <p className="font-script text-3xl text-brand-red">Travel Beyond Borders</p>
      <p className="text-muted">Homepage build starts in Phase 1.</p>
    </main>
  );
}
