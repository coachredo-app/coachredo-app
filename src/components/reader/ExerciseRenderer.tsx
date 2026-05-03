import type { Exercise } from '@/lib/content/types'
import TextExercise from './exercises/TextExercise'
import ListExercise from './exercises/ListExercise'
import TextGroupExercise from './exercises/TextGroupExercise'
import SelectionExercise from './exercises/SelectionExercise'
import CommitmentExercise from './exercises/CommitmentExercise'
import WeightedDecisionMatrixExercise from './exercises/WeightedDecisionMatrixExercise'
import GeneratedSummaryExercise from './exercises/GeneratedSummaryExercise'

interface Props {
  exercise: Exercise
  section?: string
}

export default function ExerciseRenderer({ exercise, section }: Props) {
  return (
    <div>
      {section && (
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: '#c9a84c' }}
        >
          {section}
        </p>
      )}
      {exercise.type === 'text' && <TextExercise exercise={exercise} />}
      {exercise.type === 'list' && <ListExercise exercise={exercise} />}
      {exercise.type === 'text_group' && <TextGroupExercise exercise={exercise} />}
      {exercise.type === 'selection' && <SelectionExercise exercise={exercise} />}
      {exercise.type === 'commitment' && <CommitmentExercise exercise={exercise} />}
      {exercise.type === 'weighted_decision_matrix' && (
        <WeightedDecisionMatrixExercise exercise={exercise} />
      )}
      {exercise.type === 'generated_summary' && (
        <GeneratedSummaryExercise exercise={exercise} />
      )}
    </div>
  )
}
