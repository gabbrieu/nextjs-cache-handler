import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const npmCli = process.env.npm_execpath;
assert(npmCli, "Run through npm run verify:distribution");
assert.equal(pkg.name, "@gabbrieu/nextjs-cache-handler");
assert.equal(pkg.version, "2.0.0");
assert.equal(pkg.bin, undefined, "The inherited CLI is not part of this distribution");
assert.equal(pkg.exports["./cache-components"], undefined);
assert.equal(pkg.exports["./seed"], undefined);

function npm(args, cwd = root) {
  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const [packed] = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", artifacts]));
const tarball = path.join(artifacts, packed.filename);
const forbidden = /^(?:bin|skills|rules|setup-instructions|src|tests|mcp|docs|scripts|\.github|\.changeset)\//;
for (const file of packed.files) {
  assert(!forbidden.test(file.path), `Unexpected source/setup file: ${file.path}`);
  assert(!/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc|acesso[^/]*|credentials[^/]*)/.test(file.path), `Unexpected private/configuration file: ${file.path}`);
  assert(!/^dist\/(?:cache-components|cli|seed)\//.test(file.path), `Unqualified entry point was built: ${file.path}`);
}
assert(packed.files.some((file) => file.path === "LICENSE"));
assert(packed.files.some((file) => file.path === "dist/incremental/index.cjs"));
assert(packed.files.some((file) => file.path === "dist/incremental/index.js"));

const tempBase = path.resolve(os.tmpdir());
const consumer = fs.mkdtempSync(path.join(tempBase, "nch-dist-"));
let report;
try {
  const nextVersion = process.env.DISTRIBUTION_NEXT_VERSION || lock.packages["node_modules/next"].version;
  const dependencies = { [pkg.name]: pathToFileURL(tarball).href, next: nextVersion };
  for (const name of ["react", "react-dom"]) {
    const dependency = lock.packages[`node_modules/${name}`];
    if (dependency) dependencies[name] = dependency.version;
  }
  const devDependencies = { typescript: lock.packages["node_modules/typescript"].version };
  fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "distribution-fixture", private: true, type: "module", dependencies, devDependencies }, null, 2));
  npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org"], consumer);

  const name = JSON.stringify(pkg.name);
  const helpers = JSON.stringify(["/client/redis", "/client/ioredis", "/ops", "/otel"]);
  const commonjs = `const a=require('node:assert/strict');const p=${name};const r=require(p);a.equal(typeof r.createIncrementalCacheHandler,'function');a.equal(typeof r.IncrementalRedisCacheHandler,'function');a.equal(r.createCacheComponentsHandler,undefined);for(const s of ${helpers}){require(p+s)}a.throws(()=>require.resolve(p+'/cache-components'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});a.throws(()=>require.resolve(p+'/seed'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});const m=require(p+'/package.json');a.equal(m.name,p);a.equal(m.version,'2.0.0');a.equal(m.bin,undefined);console.log('CJS exports passed');`;
  const esm = `import a from 'node:assert/strict';const p=${name};const r=await import(p);a.equal(typeof r.createIncrementalCacheHandler,'function');a.equal(r.createCacheComponentsHandler,undefined);for(const s of ${helpers}){await import(p+s)}await a.rejects(import(p+'/cache-components'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});console.log('ESM exports passed');`;
  const cjsResult = execFileSync(process.execPath, ["--input-type=commonjs", "-e", commonjs], { cwd: consumer, encoding: "utf8" }).trim();
  const esmResult = execFileSync(process.execPath, ["--input-type=module", "-e", esm], { cwd: consumer, encoding: "utf8" }).trim();
  const fixture = `import { createIncrementalCacheHandler as root } from ${name};\nimport { createIncrementalCacheHandler as subpath } from ${JSON.stringify(pkg.name + "/incremental")};\nconst options = { client: { type: "ioredis" as const, url: "redis://example.invalid:6379" }, fallback: "never" as const, buildNamespace: () => "distribution-fixture" };\nconst one = root(options); const two = subpath(options); void one; void two;\n// @ts-expect-error The published options must remain typed.\nroot({ client: { type: "ioredis", url: "redis://example.invalid:6379" }, fallback: "invalid-policy" });\n`;
  for (const extension of ["mts", "cts"]) fs.writeFileSync(path.join(consumer, `consumer.${extension}`), fixture);
  fs.writeFileSync(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, skipLibCheck: true, noEmit: true }, include: ["consumer.mts", "consumer.cts"] }, null, 2));
  execFileSync(process.execPath, [path.join(consumer, "node_modules/typescript/lib/tsc.js"), "--project", path.join(consumer, "tsconfig.json")], { cwd: consumer, stdio: "pipe" });
  const installedManifest = path.join(consumer, "node_modules", ...pkg.name.split("/"), "package.json");
  const installed = JSON.parse(fs.readFileSync(installedManifest, "utf8"));
  assert.equal(installed.name, pkg.name);
  assert.equal(installed.version, pkg.version);
  report = { name: pkg.name, version: pkg.version, node: process.version, nextPeerFixture: nextVersion, typescriptFixture: devDependencies.typescript, filename: packed.filename, integrity: packed.integrity, sha512: createHash("sha512").update(fs.readFileSync(tarball)).digest("hex"), fileCount: packed.files.length, esm: esmResult, cjs: cjsResult, nodeNextEsmAndCjsConsumerTypes: "passed", unqualifiedExportsBlocked: true, inheritedCliAndRecipesExcluded: true, scriptsDisabledDuringInstall: true, cacheOrBusinessServiceStarted: false, temporaryConsumerCleaned: true };
} finally {
  // Only delete the one directory created above, after checking the resolved target.
  const cleanupTarget = path.resolve(consumer);
  if (path.dirname(cleanupTarget) !== tempBase || !path.basename(cleanupTarget).startsWith("nch-dist-")) throw new Error("Refusing unexpected cleanup target");
  fs.rmSync(cleanupTarget, { recursive: true, force: true });
}
fs.writeFileSync(path.join(artifacts, "distribution-verification.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
