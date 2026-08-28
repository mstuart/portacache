import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "ava";
import createCache from "./index.js";

const execFileAsync = promisify(execFile);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

test("set and get a value", async (t) => {
  const cache = createCache();
  await cache.set("key", "value");
  t.is(await cache.get("key"), "value");
});

test("get returns undefined for non-existent key", async (t) => {
  const cache = createCache();
  t.is(await cache.get("missing"), undefined);
});

test("set overwrites existing value", async (t) => {
  const cache = createCache();
  await cache.set("key", "first");
  await cache.set("key", "second");
  t.is(await cache.get("key"), "second");
});

test("has returns true for existing key", async (t) => {
  const cache = createCache();
  await cache.set("key", "value");
  t.true(await cache.has("key"));
});

test("has returns false for non-existent key", async (t) => {
  const cache = createCache();
  t.false(await cache.has("missing"));
});

test("delete removes a key", async (t) => {
  const cache = createCache();
  await cache.set("key", "value");
  const result = await cache.delete("key");
  t.true(result);
  t.is(await cache.get("key"), undefined);
});

test("delete returns false for non-existent key", async (t) => {
  const cache = createCache();
  t.false(await cache.delete("missing"));
});

test("clear removes all entries", async (t) => {
  const cache = createCache();
  await cache.set("a", 1);
  await cache.set("b", 2);
  await cache.set("c", 3);
  await cache.clear();
  t.is(await cache.get("a"), undefined);
  t.is(await cache.get("b"), undefined);
  t.is(await cache.get("c"), undefined);
});

test("per-entry TTL expires entries", async (t) => {
  const cache = createCache();
  await cache.set("key", "value", 50);
  t.is(await cache.get("key"), "value");
  await new Promise((resolve) => {
    setTimeout(resolve, 80);
  });
  t.is(await cache.get("key"), undefined);
});

test("has respects TTL expiry", async (t) => {
  const cache = createCache();
  await cache.set("key", "value", 50);
  t.true(await cache.has("key"));
  await new Promise((resolve) => {
    setTimeout(resolve, 80);
  });
  t.false(await cache.has("key"));
});

test("default TTL from options", async (t) => {
  const cache = createCache({ ttl: 50 });
  await cache.set("key", "value");
  t.is(await cache.get("key"), "value");
  await new Promise((resolve) => {
    setTimeout(resolve, 80);
  });
  t.is(await cache.get("key"), undefined);
});

test("per-entry TTL overrides default TTL", async (t) => {
  const cache = createCache({ ttl: 50 });
  await cache.set("short", "gone", 30);
  await cache.set("long", "stays", 200);
  await new Promise((resolve) => {
    setTimeout(resolve, 60);
  });
  t.is(await cache.get("short"), undefined);
  t.is(await cache.get("long"), "stays");
});

test("entry without TTL does not expire", async (t) => {
  const cache = createCache();
  await cache.set("key", "value");
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  t.is(await cache.get("key"), "value");
});

test("zero TTL expires immediately", async (t) => {
  const cache = createCache();
  await cache.set("key", "value", 0);
  t.is(await cache.get("key"), undefined);
});

test("rejects invalid TTL values", async (t) => {
  t.throws(() => createCache({ ttl: -1 }), { instanceOf: TypeError });
  const cache = createCache();
  await t.throwsAsync(cache.set("key", "value", Number.NaN), {
    instanceOf: TypeError,
  });
});

test("stores various value types", async (t) => {
  const cache = createCache();
  await cache.set("number", 42);
  await cache.set("object", { a: 1 });
  await cache.set("array", [1, 2, 3]);
  await cache.set("null", null);
  await cache.set("boolean", true);

  t.is(await cache.get("number"), 42);
  t.deepEqual(await cache.get("object"), { a: 1 });
  t.deepEqual(await cache.get("array"), [1, 2, 3]);
  t.is(await cache.get("null"), null);
  t.is(await cache.get("boolean"), true);
});

test("createCache returns an object with all methods", (t) => {
  const cache = createCache();
  t.is(typeof cache.get, "function");
  t.is(typeof cache.set, "function");
  t.is(typeof cache.has, "function");
  t.is(typeof cache.delete, "function");
  t.is(typeof cache.clear, "function");
});

test("createCache accepts empty options", (t) => {
  const cache = createCache({});
  t.is(typeof cache.get, "function");
});

test("createCache works with no arguments", (t) => {
  const cache = createCache();
  t.is(typeof cache.get, "function");
});

test("all methods return promises", (t) => {
  const cache = createCache();
  t.true(cache.get("x") instanceof Promise);
  t.true(cache.set("x", 1) instanceof Promise);
  t.true(cache.has("x") instanceof Promise);
  t.true(cache.delete("x") instanceof Promise);
  t.true(cache.clear() instanceof Promise);
});

test("expired entry is cleaned up on get", async (t) => {
  const cache = createCache();
  await cache.set("key", "value", 30);
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  t.is(await cache.get("key"), undefined);
  // Verify it's truly gone (has also returns false)
  t.false(await cache.has("key"));
});

test("expired entry is cleaned up on has", async (t) => {
  const cache = createCache();
  await cache.set("key", "value", 30);
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  t.false(await cache.has("key"));
  t.is(await cache.get("key"), undefined);
});

test("multiple independent caches do not interfere", async (t) => {
  const cache1 = createCache();
  const cache2 = createCache();
  await cache1.set("key", "cache1");
  await cache2.set("key", "cache2");
  t.is(await cache1.get("key"), "cache1");
  t.is(await cache2.get("key"), "cache2");
});

test("packed package installs without local dependencies", async (t) => {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "portacache-package-")
  );
  t.teardown(() => rm(temporaryDirectory, { force: true, recursive: true }));

  const { stdout } = await execFileAsync(
    npmCommand,
    ["pack", "--json", "--pack-destination", temporaryDirectory],
    { cwd: process.cwd() }
  );
  const [{ filename }] = JSON.parse(stdout);
  const tarballPath = join(temporaryDirectory, filename);

  await writeFile(
    join(temporaryDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" })
  );
  await execFileAsync(
    npmCommand,
    [
      "install",
      tarballPath,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ],
    { cwd: temporaryDirectory }
  );

  const installedManifest = JSON.parse(
    await readFile(
      join(temporaryDirectory, "node_modules", "portacache", "package.json"),
      "utf8"
    )
  );
  const dependencySpecifiers = Object.values(
    installedManifest.dependencies ?? {}
  );

  t.false(
    dependencySpecifiers.some((specifier) => specifier.startsWith("file:"))
  );

  await execFileAsync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import createCache from "portacache";
const cache = createCache();
await cache.set("key", "value");
if ((await cache.get("key")) !== "value") process.exit(1);
`,
    ],
    { cwd: temporaryDirectory }
  );
});
