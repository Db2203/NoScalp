import { Nav, Footer } from "@/components/chrome";
import { DropExperience } from "@/components/DropExperience";

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Nav />
      <main className="flex-1">
        <DropExperience dropId={id} />
      </main>
      <Footer />
    </>
  );
}
