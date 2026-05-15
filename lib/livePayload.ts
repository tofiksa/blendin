export type LiveQuestionOption = { id: string; sortOrder: number; label: string };

export type LiveQuestion = {
  id: string;
  sortOrder: number;
  stem: string;
  options: LiveQuestionOption[];
};

export type LiveQuestionResult = {
  questionId: string;
  voteCounts: Record<string, number>;
  tiedOptionIds: string[];
  chosenOptionId: string | null;
};

export type LivePayload = {
  publicId: string;
  state: string;
  currentQuestionIndex: number;
  updatedAt: string;
  questions: LiveQuestion[];
  questionResults: LiveQuestionResult[];
};

export type NewHireTruthAnswer = {
  questionId: string;
  optionId: string;
  confidenceBand: string;
};

export function isLiveErrorPayload(x: unknown): x is { error: string } {
  return typeof x === "object" && x !== null && "error" in x;
}
