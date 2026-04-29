import { spawnSync } from "node:child_process";

const steps = [
  {
    label: "release config smoke tests",
    command: process.execPath,
    args: ["--test", "test/release-config.test.mjs"],
  },
  {
    label: "TypeScript check",
    command: "npx",
    args: ["tsc", "--noEmit"],
  },
  {
    label: "iOS export verification",
    command: "npx",
    args: ["expo", "export", "--platform", "ios", "--output-dir", "dist/verify-export"],
  },
];

for (const step of steps) {
  console.log(`\n==> ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nRelease check passed.");
