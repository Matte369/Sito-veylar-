import Reveal from './Reveal'

const steps = [
  { name: 'Concept and design', body: 'Vehicle architecture and energy system defined at concept level.', done: true },
  { name: 'Simulation', body: 'Energy flows and vehicle behaviour studied in digital models.', done: true },
  { name: 'Real-world validation', body: 'Testing the energy system outside the model, on the way to a prototype.', done: false },
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
      <Reveal className="max-w-3xl">
        <h2 className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
          From concept to the road.
        </h2>
        <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-graphite">
          VEYLAR is a project in development. Each stage moves the platform from an idea on paper toward a car you
          can drive.
        </p>
      </Reveal>

      <ol className="relative mt-20 grid gap-12 md:grid-cols-3 md:gap-10">
        {/* Progress line: solid through completed work, dashed for what comes next. */}
        <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink/15 md:block" />
        <span aria-hidden="true" className="absolute left-0 top-[7px] hidden h-px w-[calc(66.666%-1rem)] bg-ink md:block" />
        {steps.map((s, i) => (
          <Reveal as="li" key={s.name} delay={i * 120} className="relative pl-8 md:pl-0">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 block h-[15px] w-[15px] rounded-full border-2 md:relative ${
                s.done ? 'border-ink bg-ink' : 'border-accent bg-paper'
              }`}
            />
            <h3 className="font-wide text-xl font-medium text-ink md:mt-8">{s.name}</h3>
            <p className="mt-2 max-w-[22rem] leading-relaxed text-graphite">{s.body}</p>
            {!s.done && <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Next</p>}
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
