import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { __resetRemoteStorageForTests, remoteStorage } from "@/lib/remote-storage";

const STATE = JSON.stringify({ state: { schemaVersion: 1, learningStates: {} }, version: 1 });

function putCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "PUT");
}

describe("remoteStorage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetRemoteStorageForTests();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("GET 실패 후에는 빈 상태로 서버를 덮어쓰지 않는다", async () => {
    fetchMock.mockRejectedValueOnce(new Error("db down"));
    expect(await remoteStorage.getItem("jikari")).toBeNull();

    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(1000);

    expect(putCalls(fetchMock)).toHaveLength(0);
  });

  test("GET이 HTTP 오류를 돌려줘도 저장하지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    await remoteStorage.getItem("jikari");

    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(1000);

    expect(putCalls(fetchMock)).toHaveLength(0);
  });

  test("GET 성공 후에는 debounce 뒤 한 번 PUT한다", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ schemaVersion: 1 }));
    await remoteStorage.getItem("jikari");
    fetchMock.mockResolvedValue(Response.json({ ok: true }));

    remoteStorage.setItem("jikari", STATE);
    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(1000);

    expect(putCalls(fetchMock)).toHaveLength(1);
  });
});
