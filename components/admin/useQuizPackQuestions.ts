"use client";

import { useCallback, useId, useRef, useState } from "react";

export type QuizPackQuestionRow = {
  id: string;
  stem: string;
  options: [string, string, string, string];
};

export function useQuizPackQuestions() {
  const baseId = useId();
  const seqRef = useRef(1);

  const nextId = useCallback(() => {
    seqRef.current += 1;
    return `${baseId}-${seqRef.current}`;
  }, [baseId]);

  const [questions, setQuestions] = useState<QuizPackQuestionRow[]>(() => [
    { id: `${baseId}-1`, stem: "", options: ["", "", "", ""] },
  ]);

  const addQuestion = useCallback(() => {
    setQuestions((q) => [...q, { id: nextId(), stem: "", options: ["", "", "", ""] }]);
  }, [nextId]);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((q) => (q.length <= 1 ? q : q.filter((row) => row.id !== id)));
  }, []);

  const updateStem = useCallback((id: string, stem: string) => {
    setQuestions((rows) => rows.map((row) => (row.id === id ? { ...row, stem } : row)));
  }, []);

  const updateOption = useCallback((rowId: string, optIndex: number, label: string) => {
    setQuestions((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = [...row.options] as [string, string, string, string];
        next[optIndex] = label;
        return { ...row, options: next };
      }),
    );
  }, []);

  return {
    questions,
    addQuestion,
    removeQuestion,
    updateStem,
    updateOption,
  };
}

export function validateQuizQuestions(questions: QuizPackQuestionRow[]): string | null {
  for (let i = 0; i < questions.length; i++) {
    const row = questions[i];
    if (!row.stem.trim()) {
      return `Spørsmål ${i + 1}: skriv inn spørsmålstekst.`;
    }
    for (let j = 0; j < 4; j++) {
      if (!row.options[j]?.trim()) {
        return `Spørsmål ${i + 1}: alle fire alternativer må fylles ut.`;
      }
    }
  }
  return null;
}

export function serializeQuestionsForApi(questions: QuizPackQuestionRow[]) {
  return questions.map((row) => ({
    stem: row.stem.trim(),
    options: row.options.map((o) => o.trim()) as [string, string, string, string],
  }));
}
