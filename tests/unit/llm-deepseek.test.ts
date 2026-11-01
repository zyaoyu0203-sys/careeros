import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractJson, scoreJobs } from "@/lib/ai/llm";
import { job, profile, resume } from "../support/fixtures";

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] }), { status });

beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
  vi.stubEnv("DEEPSEEK_BASE_URL", "https://llm.example.com/v3/");
  vi.stubEnv("DEEPSEEK_MODEL", "deepseek-test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("extractJson", () => {
  it("accepts bare JSON and JSON wrapped in a code fence", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("DeepSeek provider", () => {
  it("sends an OpenAI-compatible JSON-mode request and returns validated results", async () => {
    const fetchMock = vi.fn(async () =>
      reply(JSON.stringify({ results: [{ jobId: "j1", score: 88, fit: ["SQL"], risks: [], resumeId: "r1" }] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const scores = await scoreJobs(profile(), [resume()], [job()]);

    expect(scores).toEqual([{ jobId: "j1", score: 88, fit: ["SQL"], risks: [], resumeId: "r1" }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://llm.example.com/v3/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("deepseek-test");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toMatch(/JSON Schema/);
  });

  it("drops answers that don't match the schema instead of trusting them", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(JSON.stringify({ results: [{ jobId: "j1", score: "high" }] }))));
    expect(await scoreJobs(profile(), [resume()], [job()])).toEqual([]);
  });

  it("retries without JSON mode when the host rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("json_object not supported", { status: 400 }))
      .mockResolvedValueOnce(reply(JSON.stringify({ results: [] })));
    vi.stubGlobal("fetch", fetchMock);
    await scoreJobs(profile(), [resume()], [job()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).response_format).toBeUndefined();
  });
});

describe("answerFormFields", () => {
  it("keeps only answers that are allowed options or free text, and drops unknown fields", async () => {
    const { answerFormFields } = await import("@/lib/ai/llm");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply(
          JSON.stringify({
            answers: [
              { id: 0, answer: "Hong Kong" }, // allowed option
              { id: 1, answer: "Maybe" }, // not an option → dropped
              { id: 2, answer: "I built an LLM pipeline." }, // free text
              { id: 3, answer: null }, // unknown → left for the user
              { id: 99, answer: "ghost" }, // no such field → dropped
            ],
          }),
        ),
      ),
    );
    const answers = await answerFormFields(profile(), { company: "Acme", title: "Intern" }, [
      { id: 0, label: "Where do you live?", kind: "choice", options: ["Hong Kong", "Singapore"], required: true },
      { id: 1, label: "Need sponsorship?", kind: "choice", options: ["Yes", "No"], required: true },
      { id: 2, label: "Describe your AI experience", kind: "long", options: [], required: true },
      { id: 3, label: "Desired salary", kind: "text", options: [], required: false },
    ]);
    expect(answers).toEqual([
      { id: 0, answer: "Hong Kong" },
      { id: 2, answer: "I built an LLM pipeline." },
    ]);
  });
});
