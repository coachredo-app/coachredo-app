import { notFound, redirect } from 'next/navigation'
import { PLAN_B_CONTENT } from '@/lib/content'
import { ReaderProvider } from '@/lib/reader/context'
import ChapterReader from './ChapterReader'

interface Props {
  params: Promise<{ num: string }>
}

export default async function ChapterPage({ params }: Props) {
  const { num } = await params
  const chapterNum = parseInt(num, 10)

  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 7) {
    notFound()
  }

  const chapter = PLAN_B_CONTENT.chapters.find(c => c.num === chapterNum)
  if (!chapter) notFound()

  return (
    <ReaderProvider chapterKey={String(chapterNum)}>
      <ChapterReader chapter={chapter} />
    </ReaderProvider>
  )
}
