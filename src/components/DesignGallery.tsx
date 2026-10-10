import { useLang } from '../i18n'
import { useInView } from '../lib/motion'
import RevealText from './RevealText'

type View = 'front' | 'threeQuarter' | 'top' | 'side' | 'rear'

const TILES: { view: View; src: string; w: number; h: number; className: string }[] = [
  { view: 'threeQuarter', src: 'design/three-quarter-front.jpg', w: 694, h: 215, className: 'lg:col-span-7' },
  { view: 'front', src: 'design/front.jpg', w: 759, h: 305, className: 'lg:col-span-5' },
  { view: 'top', src: 'design/top.jpg', w: 824, h: 480, className: 'lg:col-span-5 lg:row-span-2' },
  { view: 'side', src: 'design/side.jpg', w: 759, h: 212, className: 'lg:col-span-7' },
  { view: 'rear', src: 'design/rear.jpg', w: 760, h: 305, className: 'lg:col-span-7' },
]

function Tile({ tile, index }: { tile: (typeof TILES)[number]; index: number }) {
  const { t } = useLang()
  const [ref, inView] = useInView<HTMLElement>(0.2)
  const copy = t.design.views[tile.view]
  return (
    <figure
      ref={ref}
      className={`group flex flex-col rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-ink/[0.06] motion-safe:transition-[opacity,transform,filter] motion-safe:duration-[1100ms] motion-safe:ease-out-expo ${
        inView ? 'translate-y-0 opacity-100 blur-0' : 'motion-safe:translate-y-16 motion-safe:opacity-0 motion-safe:blur-md'
      } ${tile.className}`}
      style={{ transitionDelay: `${(index % 2) * 120}ms` }}
    >
      <div className="relative flex-1 overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#c9c8c5] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
        <img
          src={tile.src}
          alt={`VEYLAR, ${copy.title}`}
          width={tile.w}
          height={tile.h}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.035]"
        />
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 pb-3 pt-4">
        <span className="font-wide text-sm font-medium text-ink">{copy.title}</span>
        <span className="text-sm text-graphite">{copy.body}</span>
      </figcaption>
    </figure>
  )
}

export default function DesignGallery() {
  const { t } = useLang()
  return (
    <section id="design" className="scroll-mt-24 mx-auto max-w-[1440px] px-4 py-28 sm:px-8 md:px-12 md:py-40">
      <div className="grid gap-6 lg:grid-cols-[7fr_5fr] lg:items-end">
        <RevealText
          key={t.design.title}
          text={t.design.title}
          className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.02em] text-ink sm:text-5xl lg:text-6xl"
        />
        <p className="max-w-[26rem] text-lg leading-relaxed text-graphite lg:justify-self-end">{t.design.sub}</p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {TILES.map((tile, i) => (
          <Tile key={tile.view} tile={tile} index={i} />
        ))}
      </div>
      <p className="mt-6 text-sm text-steel">{t.design.note}</p>
    </section>
  )
}
