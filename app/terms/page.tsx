import { Nav, Footer } from "@/components/chrome";
import { Container, Kicker } from "@/components/storefront/ui";

export const metadata = { title: "NoScalp · Terms" };

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Container className="py-16">
          <Kicker>Legal</Kicker>
          <h1 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Terms of use</h1>
          <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-mute">
            <p>
              NoScalp runs limited product drops as a random draw instead of first-come-first-served. By entering a
              drop you agree to one entry per verified person. Entering more than once, or using bots or multiple
              accounts, does not improve your odds and may forfeit your entry.
            </p>
            <p>
              Winners are selected by a published, independently verifiable random draw. You are only charged if you
              win and complete checkout within the claim window. Prices are set by the brand running the drop.
            </p>
            <p>
              This is a demonstration project built for a hackathon. Payments run in test mode, no real charges are
              made, and no real goods are shipped.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
