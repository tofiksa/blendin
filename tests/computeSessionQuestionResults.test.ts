import { describe, expect, it } from "vitest";
import { deterministicTieBreakWinner } from "@/lib/computeSessionQuestionResults";

describe("deterministicTieBreakWinner", () => {
  it("returnerer null for tom liste", () => {
    expect(
      deterministicTieBreakWinner("seed", "550e8400-e29b-41d4-a716-446655440000", []),
    ).toBeNull();
  });

  it("returnerer eneste kandidat", () => {
    expect(
      deterministicTieBreakWinner("seed", "550e8400-e29b-41d4-a716-446655440000", [
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ]),
    ).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("er stabil ved samme inndata", () => {
    const tied = ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"];
    const a = deterministicTieBreakWinner("cafef00d", "550e8400-e29b-41d4-a716-446655440000", tied);
    const b = deterministicTieBreakWinner("cafef00d", "550e8400-e29b-41d4-a716-446655440000", tied);
    expect(a).toBe(b);
    expect(tied).toContain(a);
  });
});
