import { Fragment, type ElementType } from 'react'
import { useInView } from '../lib/motion'

type Props = {
  text: string
  as?: ElementType
  className?: string
  /** Extra delay before the first word, ms. */
  delay?: number
  /** Optional word (exact match) to colour with the accent. */
  accent?: string
}

/**
 * Headline that rises into place word by word, each word sliding up out of its own mask.
 * The full sentence stays in the DOM for screen readers and search.
 */
export default function RevealText({ text, as: Tag = 'h2', className = '', delay = 0, accent }: Props) {
  const [ref, inView] = useInView<HTMLElement>(0.25)
  const words = text.split(' ')
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden="true" className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-top">
            <span
              className={`inline-block motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
                inView ? 'translate-y-0' : 'motion-safe:translate-y-[105%]'
              } ${accent && w.replace(/[.,]/g, '') === accent ? 'text-accent' : ''}`}
              style={{ transitionDelay: `${delay + i * 45}ms` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  )
}
