import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadLiveConditions } from "@/lib/conditions/client";

afterEach(() => mock.restoreAll());

function stub(respond: () => Response | Promise<Response>) {
  return mock.method(globalThis, "fetch", async () => respond());
}

test("loadLiveConditions: no ids = no request, not failed", async () => {
  const f = stub(() => new Response("{}"));
  assert.deepEqual(await loadLiveConditions([]), { conditions: {}, failed: false });
  assert.equal(f.mock.callCount(), 0);
});

test("loadLiveConditions: returns conditions from a good response", async () => {
  stub(() => new Response(JSON.stringify({ conditions: { z: { fire: null } } })));
  const result = await loadLiveConditions(["z"]);
  assert.equal(result.failed, false);
  assert.ok("z" in result.conditions);
});

test("loadLiveConditions: non-OK, malformed, or network error = failed", async () => {
  stub(() => new Response("oops", { status: 500 }));
  assert.equal((await loadLiveConditions(["z"])).failed, true);
  mock.restoreAll();
  stub(() => new Response(JSON.stringify({ nope: 1 })));
  assert.equal((await loadLiveConditions(["z"])).failed, true);
  mock.restoreAll();
  stub(() => {
    throw new TypeError("fetch failed");
  });
  assert.equal((await loadLiveConditions(["z"])).failed, true);
});

test("loadLiveConditions: aborting via the caller's signal resolves as failed", async () => {
  mock.method(globalThis, "fetch", (_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })
  );
  const controller = new AbortController();
  const pending = loadLiveConditions(["z"], controller.signal);
  controller.abort();
  assert.equal((await pending).failed, true);
});
