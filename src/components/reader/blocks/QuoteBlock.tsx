import type { QuoteBlock as QuoteBlockType } from '@/lib/content/types'

export default function QuoteBlock({ block }: { block: QuoteBlockType }) {
  return (
    <div
      className="my-8 px-5 py-4 rounded-lg border-l-4 whitespace-pre-line text-base leading-relaxed italic"
      style={{
        borderColor: '#c9a84c',
        backgroundColor: '#111827',
        color: '#e5e7eb',
      }}
    >
      {block.value}
    </div>
  )
}
