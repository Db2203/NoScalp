import { Nav, Footer } from "@/components/chrome";
import { FairnessWalkthrough } from "@/components/storefront/FairnessWalkthrough";

export const metadata = {
  title: "NoScalp · How drops stay fair",
};

export default function FairnessPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <FairnessWalkthrough />
      </main>
      <Footer />
    </>
  );
}
