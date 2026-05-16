import type { QuizPackQuestionRow } from "@/components/admin/useQuizPackQuestions";

type Props = {
  questions: QuizPackQuestionRow[];
  addQuestion: () => void;
  removeQuestion: (id: string) => void;
  updateStem: (id: string, stem: string) => void;
  updateOption: (rowId: string, optIndex: number, label: string) => void;
};

export function QuizPackQuestionFields({
  questions,
  addQuestion,
  removeQuestion,
  updateStem,
  updateOption,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Spørsmål</p>
        <button
          type="button"
          onClick={() => addQuestion()}
          className="rounded-lg border border-accent-soft bg-accent-soft/40 px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          + Legg til spørsmål
        </button>
      </div>

      <ol className="flex flex-col gap-6">
        {questions.map((row, qi) => (
          <li key={row.id} className="rounded-xl border border-accent-soft bg-accent-soft/15 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Spørsmål {qi + 1}
              </span>
              {questions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeQuestion(row.id)}
                  className="text-xs text-accent underline-offset-2 hover:underline"
                >
                  Fjern
                </button>
              ) : null}
            </div>
            <label htmlFor={`q-stem-${row.id}`} className="sr-only">
              Spørsmålstekst {qi + 1}
            </label>
            <textarea
              id={`q-stem-${row.id}`}
              value={row.stem}
              onChange={(e) => updateStem(row.id, e.target.value)}
              placeholder={`Hva gir {name} best energi på jobben?`}
              rows={3}
              className="mb-4 w-full resize-y rounded-xl border border-accent-soft bg-background px-3 py-2 text-sm"
            />
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium text-muted">
                Fire svaralternativer (én radioknapp per spørsmål for nyansatt og lag)
              </legend>
              {[0, 1, 2, 3].map((oi) => (
                <div key={oi} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="w-8 shrink-0 text-xs font-medium text-muted">{oi + 1}.</span>
                  <input
                    id={`q-${row.id}-opt-${oi}`}
                    value={row.options[oi]}
                    onChange={(e) => updateOption(row.id, oi, e.target.value)}
                    placeholder={`Alternativ ${oi + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-accent-soft bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>
    </div>
  );
}
