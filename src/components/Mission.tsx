import Reveal from './Reveal'

const pillars = [
  {
    title: 'Energy made on board',
    body: 'The car produces the electricity it needs while you drive, so range is no longer tied to a charging cable.',
  },
  {
    title: 'Renewable by design',
    body: 'Bioethanol comes from plant matter and the other ingredient is water. The energy chain can be renewable from field to wheel.',
  },
  {
    title: 'Engineered in Italy',
    body: 'An Italian project that brings the country’s automotive craft to a new idea of energy.',
  },
]

/** The one full-bleed dark block on the page: the mission is the brand’s single loudest statement. */
export default function Mission() {
  return (
    <section id="mission" className="scroll-mt-16 bg-ink text-paper">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col justify-center px-5 py-28 sm:px-8 md:px-12">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/55">Our mission</p>
          <h2 className="mt-8 max-w-5xl font-wide text-balance text-4xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
            Electric cars that make their own energy, so clean driving can go{' '}
            <span className="text-accent">anywhere</span>.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-10 border-t border-paper/15 pt-10 md:grid-cols-3 md:gap-12">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <h3 className="font-wide text-xl font-medium">{p.title}</h3>
              <p className="mt-3 max-w-[22rem] leading-relaxed text-paper/70">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
