import { motion } from 'motion/react';

const products = [
  {
    name: 'Baobab Oil',
    botanical: 'Adansonia digitata Seed Oil',
    size: '100 ml',
    note: 'Nourishes skin and conditions hair.',
    artwork: '/images/range-baobab.webp',
    accent: 'bg-[#71350f]',
  },
  {
    name: 'Kalahari Melon Oil',
    botanical: 'Citrullus lanatus Seed Oil',
    size: '100 ml',
    note: 'A lightweight botanical oil for skin and hair.',
    artwork: '/images/range-kalahari.webp',
    accent: 'bg-[#07572f]',
  },
  {
    name: 'Mongongo Oil',
    botanical: 'Schinziophyton rautanenii Kernel Oil',
    size: '100 ml',
    note: 'A treasured botanical oil for skin and hair.',
    artwork: '/images/range-mongongo.webp',
    accent: 'bg-[#9a6508]',
  },
  {
    name: 'Mafura Butter',
    botanical: 'Trichilia emetica Seed Butter',
    size: '250 g',
    note: 'A rich botanical butter for skin and hair.',
    artwork: '/images/range-mafura.webp',
    accent: 'bg-[#6f2215]',
  },
] as const;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function ProductRangeSection() {
  return (
    <section id="range" className="bg-brand-soft px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div {...reveal} className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.16em] text-brand-strong">The Akudha range</p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Oils and butters from remarkable African botanicals.
          </h2>
          <p className="mt-5 text-lg leading-8 text-ink-muted">
            Four distinct products for skin and hair, each with its own botanical identity and production-ready label.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {products.map((product, index) => (
            <motion.article
              key={product.name}
              {...reveal}
              transition={{ ...reveal.transition, delay: index * 0.06 }}
              className="overflow-hidden rounded-feature border border-line bg-surface shadow-frost"
            >
              <div className="bg-[#f5ecdc] p-3 sm:p-4">
                <img
                  src={product.artwork}
                  alt={`${product.name} label artwork`}
                  loading="lazy"
                  width="1400"
                  height="700"
                  className="aspect-[2/1] w-full rounded-control object-cover"
                />
              </div>
              <div className="flex items-start gap-4 p-5 sm:p-6">
                <span className={`mt-1 h-10 w-2 shrink-0 rounded-full ${product.accent}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-2xl font-semibold">{product.name}</h3>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{product.size}</span>
                  </div>
                  <p className="mt-2 text-sm italic text-ink-muted">{product.botanical}</p>
                  <p className="mt-3 leading-7 text-ink-muted">{product.note}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
