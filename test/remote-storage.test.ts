import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { __resetRemoteStorageForTests, getProgressLoadFailed, getSyncStatus, remoteStorage } from "@/lib/remote-storage";

const STATE = JSON.stringify({ state: { schemaVersion: 1, learningStates: {} }, version: 1 });

function putCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "PUT");
}

describe("remoteStorage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
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

  test("PUT 실패(500/네트워크)는 backoff로 재시도하고 데이터를 유지한다", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ schemaVersion: 1 }));
    await remoteStorage.getItem("jikari");
    fetchMock
      .mockResolvedValueOnce(new Response("x", { status: 500 }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(Response.json({ ok: true }));

    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(500);
    expect(putCalls(fetchMock)).toHaveLength(1);
    expect(getSyncStatus()).toBe("pending");
    await vi.advanceTimersByTimeAsync(2000);
    expect(putCalls(fetchMock)).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(putCalls(fetchMock)).toHaveLength(3);
    expect(getSyncStatus()).toBe("idle");
  });

  test("online 이벤트가 오면 대기 중인 저장을 즉시 재시도한다", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ schemaVersion: 1 }));
    await remoteStorage.getItem("jikari");
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Response.json({ ok: true }));

    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(500);
    expect(putCalls(fetchMock)).toHaveLength(1);
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(putCalls(fetchMock)).toHaveLength(2);
  });

  test("GET 실패는 loadFailed로 노출된다", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    await remoteStorage.getItem("jikari");
    expect(getProgressLoadFailed()).toBe(true);
  });

  async function loaded() {
    fetchMock.mockResolvedValueOnce(Response.json({ schemaVersion: 1 }));
    await remoteStorage.getItem("jikari");
  }

  test("영구 4xx는 재시도하지 않고 버린다 (status: failed)", async () => {
    await loaded();
    fetchMock.mockResolvedValue(new Response("bad", { status: 400 }));
    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(putCalls(fetchMock)).toHaveLength(1);
    expect(getSyncStatus()).toBe("failed");
  });

  test("429는 재시도 가능하다", async () => {
    await loaded();
    fetchMock.mockResolvedValue(new Response("slow", { status: 429 }));
    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(6000);
    expect(putCalls(fetchMock).length).toBeGreaterThan(1);
  });

  test("장애 중 setItem이 backoff를 500ms로 되돌리지 않는다", async () => {
    await loaded();
    fetchMock.mockRejectedValue(new Error("down"));
    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(600); // first PUT fails -> 2s backoff
    expect(putCalls(fetchMock)).toHaveLength(1);
    remoteStorage.setItem("jikari", STATE);
    await vi.advanceTimersByTimeAsync(1000);
    expect(putCalls(fetchMock)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(putCalls(fetchMock)).toHaveLength(2);
  });

  describe("durable pending copy", () => {
    const ls = (id: string, lastReviewed: number) => ({
      cardKey: `vocab:${id}`, mode: "vocab", cardId: id, box: 2, nextDue: 1, correctStreak: 1, lastReviewed,
    });
    const full = (over: Record<string, unknown>) => ({
      schemaVersion: 6, learningStates: {}, heatmap: {}, lastActiveAt: 0, currentStreak: 0,
      quizStats: {}, ratings: {}, settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 }, ...over,
    });
    const val = (state: object) => JSON.stringify({ state, version: 6 });

    test("offline PUT failure keeps a copy in localStorage; success clears it", async () => {
      fetchMock.mockResolvedValueOnce(Response.json(full({})));
      await remoteStorage.getItem("jikari");
      fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Response.json({ ok: true }));
      remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 5) } })));
      expect(localStorage.getItem("jikari-pending-v1")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(500);
      expect(localStorage.getItem("jikari-pending-v1")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(2000);
      expect(localStorage.getItem("jikari-pending-v1")).toBeNull();
      expect(getSyncStatus()).toBe("idle");
    });

    test("after reload: status is pending, fresh GET is merged with the stored copy and PUT once", async () => {
      localStorage.setItem(
        "jikari-pending-v1",
        JSON.stringify({ v: 1, value: val(full({ lastActiveAt: 9, learningStates: { "vocab:a": ls("a", 900) } })) }),
      );
      __resetRemoteStorageForTests(); // simulate a fresh page load (module state gone, localStorage kept)
      expect(getSyncStatus()).toBe("pending");
      fetchMock.mockResolvedValueOnce(
        Response.json(full({ learningStates: { "vocab:a": ls("a", 100), "vocab:b": ls("b", 50) } })),
      );
      const out = JSON.parse((await remoteStorage.getItem("jikari"))!);
      expect(Object.keys(out.state.learningStates).sort()).toEqual(["vocab:a", "vocab:b"]);
      fetchMock.mockResolvedValue(Response.json({ ok: true }));
      await vi.advanceTimersByTimeAsync(10);
      const puts = putCalls(fetchMock);
      expect(puts).toHaveLength(1);
      const body = JSON.parse((puts[0][1] as RequestInit).body as string);
      expect(body.learningStates["vocab:a"].lastReviewed).toBe(900);
      expect(body.learningStates["vocab:b"]).toBeDefined();
      expect(localStorage.getItem("jikari-pending-v1")).toBeNull();
    });

    test("failed GET never touches the stored copy", async () => {
      localStorage.setItem("jikari-pending-v1", JSON.stringify({ v: 1, value: val(full({})) }));
      __resetRemoteStorageForTests();
      fetchMock.mockRejectedValueOnce(new Error("offline"));
      await remoteStorage.getItem("jikari");
      await vi.advanceTimersByTimeAsync(5000);
      expect(putCalls(fetchMock)).toHaveLength(0);
      expect(localStorage.getItem("jikari-pending-v1")).not.toBeNull();
    });

    test("offline snapshot GET: queues to localStorage, never PUTs; fresh GET later merges and PUTs once", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(full({ learningStates: { "vocab:a": ls("a", 1) } })), {
          headers: { "X-Jikari-Offline-Snapshot": "1" },
        }),
      );
      await remoteStorage.getItem("jikari");
      remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 700) } })));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(putCalls(fetchMock)).toHaveLength(0);
      expect(localStorage.getItem("jikari-pending-v1")).not.toBeNull();
      expect(getSyncStatus()).toBe("pending");

      fetchMock.mockResolvedValueOnce(Response.json(full({ learningStates: { "vocab:z": ls("z", 5) } })));
      fetchMock.mockResolvedValue(Response.json({ ok: true }));
      await remoteStorage.getItem("jikari");
      await vi.advanceTimersByTimeAsync(10);
      const puts = putCalls(fetchMock);
      expect(puts).toHaveLength(1);
      const body = JSON.parse((puts[0][1] as RequestInit).body as string);
      expect(Object.keys(body.learningStates).sort()).toEqual(["vocab:a", "vocab:z"]);
      expect(body.learningStates["vocab:a"].lastReviewed).toBe(700);
      expect(localStorage.getItem("jikari-pending-v1")).toBeNull();
    });

    test("offline snapshot hydration shows queued answers from the previous session", async () => {
      localStorage.setItem(
        "jikari-pending-v1",
        JSON.stringify({ v: 1, value: val(full({ learningStates: { "vocab:a": ls("a", 900) } })) }),
      );
      __resetRemoteStorageForTests();
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(full({})), { headers: { "X-Jikari-Offline-Snapshot": "1" } }),
      );
      const out = JSON.parse((await remoteStorage.getItem("jikari"))!);
      expect(out.state.learningStates["vocab:a"].lastReviewed).toBe(900);
      await vi.advanceTimersByTimeAsync(5000);
      expect(putCalls(fetchMock)).toHaveLength(0);
    });

    test("offline + queued answers reports offline-queued; snapshot with nothing queued reports snapshot", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(full({})), { headers: { "X-Jikari-Offline-Snapshot": "1" } }),
      );
      await remoteStorage.getItem("jikari");
      expect(getSyncStatus()).toBe("snapshot");
      remoteStorage.setItem("jikari", val(full({})));
      const nav = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      expect(getSyncStatus()).toBe("offline-queued");
      nav.mockRestore();
    });

    test("corrupt stored copy is ignored", async () => {
      localStorage.setItem("jikari-pending-v1", "{nope");
      __resetRemoteStorageForTests();
      fetchMock.mockResolvedValueOnce(Response.json(full({})));
      await remoteStorage.getItem("jikari");
      await vi.advanceTimersByTimeAsync(1000);
      expect(putCalls(fetchMock)).toHaveLength(0);
    });
  });
});
