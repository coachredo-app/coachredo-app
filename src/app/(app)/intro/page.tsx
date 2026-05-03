import { PLAN_B_CONTENT } from '@/lib/content'
import { ReaderProvider } from '@/lib/reader/context'
import IntroReader from './IntroReader'

export default function IntroPage() {
  const { intro } = PLAN_B_CONTENT
  return (
    <ReaderProvider chapterKey="intro">
      <IntroReader intro={intro} />
    </ReaderProvider>
  )
}
