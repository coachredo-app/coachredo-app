import type { TransitionBlock as TransitionBlockType } from '@/lib/content/types'

export default function TransitionBlock({ block }: { block: TransitionBlockType }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="flex-1 h-px" style={{ backgroundColor: '#1f2937' }} />
      <p
        className="text-sm font-medium text-center whitespace-pre-line"
        style={{ color: '#9ca3af' }}
      >
        {block.value}
      </p>
      <div className="flex-1 h-px" style={{ backgroundColor: '#1f2937' }} />
    </div>
  )
}
