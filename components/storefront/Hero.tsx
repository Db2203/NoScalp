"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { Countdown } from "../Countdown";
import { Button, Chip, Container, Kicker } from "./ui";
import { money } from "@/lib/format";
import { statusChip, type DropView } from "@/lib/catalog";

const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];

export function Hero({ d }: { d: DropView }) {
  const reduce = useReducedMotion();
  const chip = statusChip(d.status);
  const isOpen = d.status === "registration_open";

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "-9%"]);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: 0.04 } },
  };
  const item: Variants = {
    hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.6, ease } },
  };
  const line: Variants = {
    hidden: { y: reduce ? "0%" : "115%" },
    show: { y: "0%", transition: { duration: reduce ? 0 : 0.7, ease } },
  };

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-edge">
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <Kicker>This week&apos;s drop</Kicker>
          </motion.div>
          <h1 className="display mt-5 text-[clamp(3rem,6.5vw,5.75rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
            <span className="block overflow-hidden pb-[0.05em]">
              <motion.span variants={line} className="block">
                Won by fans,
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.05em]">
              <motion.span variants={line} className="block">
                not bots.
              </motion.span>
            </span>
          </h1>
          <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-mute">
            {d.title} is live. Enter the draw for a fair shot at retail — no bots, no scalpers, no
            carts gone in four seconds.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <Button href={`/drops/${d.id}`} size="lg">
              Enter the draw
            </Button>
            <Button href="/#drops" variant="secondary" size="lg">
              View all drops
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.05 }}
          animate={reduce ? {} : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          className="img-vignette relative aspect-[4/3] overflow-hidden rounded-3xl bg-soft"
        >
          {d.image ? (
            <motion.img
              style={{ y: imgY }}
              src={d.image}
              alt={d.title}
              className="size-full scale-110 object-cover"
            />
          ) : null}
          <div className="scrim absolute inset-0" />
          <div className="absolute left-4 top-4">
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{d.brand}</div>
              <div className="display mt-1 text-lg font-bold text-white">{d.title}</div>
            </div>
            <div className="text-right">
              <div className="display text-xl font-bold text-white">{money(d.price)}</div>
              {isOpen && (
                <div className="mono text-xs text-white/70">
                  <Countdown to={d.closeAt} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
