import { notFound } from "next/navigation";
import { Nav, Footer } from "@/components/chrome";
import { DropExperience } from "@/components/DropExperience";
import { getDrop } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Server-render the real drop so the first paint shows the correct price and
  // status (works without JS, no "Closed · $0.00" flash before the client fetch).
  // A malformed id makes getDrop throw (Postgres 22P02) — treat that as not found.
  let initialDrop = null;
  try {
    initialDrop = await getDrop(id);
  } catch {
    initialDrop = null;
  }
  if (!initialDrop) notFound();

  return (
    <>
      <Nav />
      <main className="flex-1">
        <DropExperience dropId={id} initialDrop={initialDrop} />
      </main>
      <Footer />
    </>
  );
}
