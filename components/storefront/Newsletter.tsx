import { Container } from "./ui";

export function Newsletter() {
  return (
    <section>
      <Container className="py-16 sm:py-20">
        <div className="rounded-3xl border border-edge bg-soft px-7 py-12 text-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Never miss a drop.
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-mute">
                Early access and restock alerts the moment a drop opens. No spam, just the goods.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-2 justify-self-end" action="/#drops">
              <input
                type="email"
                required
                placeholder="you@email.com"
                aria-label="Email address"
                className="h-12 flex-1 rounded-full border border-edge bg-canvas px-5 text-sm text-fg placeholder:text-mute outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-full bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-ink"
              >
                Notify me
              </button>
            </form>
          </div>
        </div>
      </Container>
    </section>
  );
}
