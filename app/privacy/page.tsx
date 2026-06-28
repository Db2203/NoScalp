import { Nav, Footer } from "@/components/chrome";
import { Container, Kicker } from "@/components/storefront/ui";

export const metadata = { title: "NoScalp · Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Container className="py-16">
          <Kicker>Legal</Kicker>
          <h1 className="display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Privacy</h1>
          <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-mute">
            <p>
              To keep drops fair we verify that each entrant is a real person. We store a one-way HMAC hash of your
              email or phone (never the raw value), and use it only to enforce one entry per person and to show you
              your own entries.
            </p>
            <p>
              We do not sell your data. Winners are chosen by a random draw anyone can independently verify; the draw
              uses no personal data beyond an anonymized entry id.
            </p>
            <p>
              This is a hackathon demonstration. Identity verification is mocked, payments run in test mode, and no
              real personal data is processed or retained.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
