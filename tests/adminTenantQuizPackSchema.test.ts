import { describe, expect, it } from "vitest";
import { adminQuizPackOnlyBodySchema, adminTenantQuizPackBodySchema } from "@/lib/http/zodBodies";

describe("adminTenantQuizPackBodySchema", () => {
  it("normaliserer slug til små bokstaver og godtar nøyaktig fire alternativer", () => {
    const parsed = adminTenantQuizPackBodySchema.parse({
      tenant: { slug: "MIN-DEMO", name: "Demo AS" },
      quizTemplateName: "Onboarding",
      questions: [{ stem: "Hva da?", options: ["a", "b", "c", "d"] }],
    });
    expect(parsed.tenant.slug).toBe("min-demo");
    expect(parsed.questions[0]?.options).toHaveLength(4);
  });

  it("avviser spørsmål uten fire alternativer", () => {
    expect(() =>
      adminTenantQuizPackBodySchema.parse({
        tenant: { slug: "ab", name: "X" },
        quizTemplateName: "Mal",
        questions: [{ stem: "S?", options: ["a", "b", "c"] }],
      } as unknown),
    ).toThrow();
  });
});

describe("adminQuizPackOnlyBodySchema", () => {
  it("godtar kun mal-navn og spørsmål", () => {
    const parsed = adminQuizPackOnlyBodySchema.parse({
      quizTemplateName: "Uke 2",
      questions: [{ stem: "?", options: ["1", "2", "3", "4"] }],
    });
    expect(parsed.quizTemplateName).toBe("Uke 2");
  });
});
