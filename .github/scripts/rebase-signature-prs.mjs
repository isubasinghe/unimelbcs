#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SIGNATURES_PATH = "signatures.json";

const sh = (cmd) =>
  execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const tryShell = (cmd) => {
  try {
    return { ok: true, out: sh(cmd) };
  } catch (err) {
    return { ok: false, err };
  }
};

const norm = (s) => String(s ?? "").toLowerCase().trim();
const sigKey = (s) => `${norm(s.name)}|${norm(s.program)}`;

const prsRaw = sh(
  `gh pr list --state open --json number,headRefName,isCrossRepository --limit 200`,
);
const prs = JSON.parse(prsRaw).filter(
  (pr) => pr.headRefName.startsWith("signature/") && !pr.isCrossRepository,
);

if (prs.length === 0) {
  console.log("No open signature PRs to rebase.");
  process.exit(0);
}

const mainSigs = JSON.parse(readFileSync(SIGNATURES_PATH, "utf8"));
const mainKeys = new Set(mainSigs.map(sigKey));
const mainHead = sh("git rev-parse HEAD");

let rebased = 0;
let skipped = 0;

for (const pr of prs) {
  const branch = pr.headRefName;
  console.log(`\nPR #${pr.number} (${branch}):`);

  const fetched = tryShell(`git fetch origin ${branch}`);
  if (!fetched.ok) {
    console.log(`  could not fetch — skipping`);
    skipped++;
    continue;
  }

  let branchRaw;
  let branchSigs;
  try {
    branchRaw = sh(`git show origin/${branch}:${SIGNATURES_PATH}`);
    branchSigs = JSON.parse(branchRaw);
  } catch {
    console.log(`  branch's signatures.json missing or invalid — skipping`);
    skipped++;
    continue;
  }

  const newSigs = branchSigs.filter((s) => !mainKeys.has(sigKey(s)));
  if (newSigs.length === 0) {
    console.log(`  no new signatures vs main — skipping`);
    skipped++;
    continue;
  }

  const merged = [...mainSigs, ...newSigs];
  const newContent = JSON.stringify(merged, null, 2) + "\n";

  if (branchRaw === newContent) {
    console.log(`  already in sync with main — skipping`);
    skipped++;
    continue;
  }

  sh(`git checkout -B ${branch} ${mainHead}`);
  writeFileSync(SIGNATURES_PATH, newContent);
  sh(`git add ${SIGNATURES_PATH}`);
  const msg =
    newSigs.length === 1
      ? `Add signature: ${newSigs[0].name}`
      : `Add ${newSigs.length} signatures`;
  sh(`git commit -m ${JSON.stringify(msg)}`);
  sh(`git push --force-with-lease origin ${branch}`);
  console.log(`  rebased and pushed`);
  rebased++;
}

console.log(`\nDone. Rebased ${rebased}, skipped ${skipped}.`);
