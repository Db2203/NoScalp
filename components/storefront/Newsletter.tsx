"use client";

import { useState } from "react";
import { Container } from "./ui";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true);
  }

  return (
    <section>
      <Container className="py-16 sm:py-20">
        <div className="rounded-3xl border border-edge bg-soft px-7 py-12 text-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {done ? "You're on the list." : "Want a heads-up before the next one?"}
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-mute">
                {done
                  ? "We'll email you the moment a drop opens. That's the only time you'll hear from us."
                  : "We'll email you when a drop opens. No spam, no weekly newsletter, just that."}
              </p>
            </div>
            {done ? (
              <div className="flex items-center gap-3 justify-self-end rounded-full border border-ok/30 bg-ok/10 px-5 py-3 text-sm text-ok">
                <span className="grid size-5 place-items-center rounded-full bg-ok/20">✓</span>
                Subscribed as {email}
              </div>
            ) : (
              <form onSubmit={submit} className="flex w-full max-w-md gap-2 justify-self-end">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
