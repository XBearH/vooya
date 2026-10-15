import assert from "node:assert/strict";
import test from "node:test";
import * as facade from "../dist/index.js";
import * as rust from "@vooya/provider-rust";

test("the build facade shares the Rust API, errors and toolchain cache", () => {
  assert.deepEqual(Object.keys(facade), Object.keys(rust));
  for (const name of Object.keys(rust)) {
    assert.equal(facade[name], rust[name], `${name} must retain its identity across entry points`);
  }

  const error = new rust.CargoBuildError("build failed", {
    cargoPath: "/tools/cargo", rustcPath: "/tools/rustc", exitCode: 101,
  });
  assert.ok(error instanceof facade.CargoBuildError);
  assert.ok(error instanceof facade.VooyaUserError);
  assert.equal(facade.isVooyaUserError(error), true);
  assert.equal(facade.resolveToolchain, rust.resolveToolchain);
  assert.equal(facade.clearToolchainCache, rust.clearToolchainCache);
});
