const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

function respond(permission, message = '') {
  const output = {
    continue: true,
    permission,
  };

  if (message) {
    output.user_message = message;
    output.agent_message = message;
  }

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

function deny(message) {
  respond('deny', message);
}

function allow() {
  respond('allow');
}

/*
 * Cursor on Windows can prepend U+FEFF to beforeShellExecution stdin.
 * Strip it before JSON.parse().
 */
let raw;

try {
  raw = readFileSync(0, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim();
} catch {
  deny(
    'FreshForge shell guard could not read Cursor hook input. Command blocked fail-closed.'
  );
}

if (!raw) {
  deny(
    'FreshForge shell guard received empty Cursor hook input. Command blocked fail-closed.'
  );
}

let payload;

try {
  payload = JSON.parse(raw);
} catch {
  deny(
    'FreshForge shell guard could not parse Cursor hook input. Command blocked fail-closed.'
  );
}

/*
 * Current Cursor payloads normally expose command at the top level.
 * Keep narrow fallbacks for known nested tool payload shapes.
 */
const command = [
  payload?.command,
  payload?.input?.command,
  payload?.tool_input?.command,
].find((value) => typeof value === 'string' && value.trim())?.trim();

if (!command) {
  deny(
    'FreshForge shell guard could not determine the shell command. Command blocked fail-closed.'
  );
}

const lower = command.toLowerCase();

const cwd =
  typeof payload?.cwd === 'string' && payload.cwd.trim()
    ? payload.cwd.trim()
    : process.cwd();

const protectedBranches = new Set([
  'production',
  'main',
  'master',
]);

function getCurrentBranch() {
  try {
    return execFileSync(
      'git',
      ['branch', '--show-current'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

/*
 * ------------------------------------------------------------
 * GIT PUSH
 * ------------------------------------------------------------
 */

if (/\bgit\s+push\b/.test(lower)) {
  if (
    /(^|\s)--force(?:-with-lease)?(?:\s|=|$)/.test(lower) ||
    /(^|\s)-f(?:\s|$)/.test(lower) ||
    /(^|\s)--mirror(?:\s|$)/.test(lower)
  ) {
    deny(
      'FreshForge blocked a force or mirror push.'
    );
  }

  if (
    /(^|\s)--delete(?:\s|$)/.test(lower)
  ) {
    deny(
      'FreshForge blocked remote branch deletion.'
    );
  }

  /*
   * Explicit pushes TO production/main/master.
   *
   * Examples blocked:
   * git push origin production
   * git push origin HEAD:production
   * git push origin feature/foo:production
   * git push origin HEAD:refs/heads/production
   */
  if (
    /(?:^|\s)(?:production|main|master)(?:\s|$)/.test(lower) ||
    /:(?:refs\/heads\/)?(?:production|main|master)(?:\s|$)/.test(lower) ||
    /refs\/heads\/(?:production|main|master)(?:\s|$)/.test(lower)
  ) {
    deny(
      'FreshForge blocked a direct push to production/main/master. Use the reviewed PR workflow.'
    );
  }

  /*
   * HEAD pushes are safe only when HEAD is demonstrably a
   * non-production branch.
   */
  if (/\bhead\b/.test(lower)) {
    const branch = getCurrentBranch();

    if (!branch) {
      deny(
        'FreshForge could not verify the current branch for this HEAD push. Use an explicit non-production branch name.'
      );
    }

    if (protectedBranches.has(branch)) {
      deny(
        'FreshForge blocked HEAD push because the current branch is protected.'
      );
    }

    allow();
  }

  /*
   * Bare git push also depends on current branch.
   */
  if (/^git\s+push\s*$/.test(lower)) {
    const branch = getCurrentBranch();

    if (!branch) {
      deny(
        'FreshForge could not verify the current branch for git push.'
      );
    }

    if (protectedBranches.has(branch)) {
      deny(
        'FreshForge blocked git push because the current branch is protected.'
      );
    }

    allow();
  }

  /*
   * Ordinary explicit non-production branch push.
   */
  allow();
}

/*
 * ------------------------------------------------------------
 * GITHUB
 * ------------------------------------------------------------
 */

/*
 * PR creation/editing is deliberately NOT blocked.
 * Merge remains the human checkpoint.
 */
if (/\bgh\s+pr\s+merge\b/.test(lower)) {
  deny(
    'FreshForge blocked PR merge. Production merges require explicit owner authorization after independent audit.'
  );
}

if (
  /\bgh\s+api\b/.test(lower) &&
  (
    /\/merges(?:\s|$)/.test(lower) ||
    /\/pulls\/[^\s]+\/merge(?:\s|$)/.test(lower)
  )
) {
  deny(
    'FreshForge blocked a direct GitHub API merge operation.'
  );
}

if (/\bgh\s+release\s+create\b/.test(lower)) {
  deny(
    'FreshForge blocked GitHub release publication.'
  );
}

/*
 * ------------------------------------------------------------
 * FIREBASE / APP HOSTING
 * ------------------------------------------------------------
 */

if (/\bfirebase\s+apphosting:rollouts:create\b/.test(lower)) {
  if (
    /fresh-prints-prod/.test(lower) ||
    !/(?:--project|-p)\s+\S+/.test(lower)
  ) {
    deny(
      'FreshForge blocked a production or unscoped App Hosting rollout. Production rollout requires owner authorization.'
    );
  }

  allow();
}

if (/\bfirebase\s+deploy\b/.test(lower)) {
  if (
    /fresh-prints-prod/.test(lower) ||
    !/(?:--project|-p)\s+\S+/.test(lower)
  ) {
    deny(
      'FreshForge blocked a production or unscoped Firebase deploy.'
    );
  }

  allow();
}

if (
  /\bfirebase\s+apphosting:secrets:(?:set|delete|destroy)\b/.test(lower)
) {
  if (
    /fresh-prints-prod/.test(lower) ||
    !/(?:--project|-p)\s+\S+/.test(lower)
  ) {
    deny(
      'FreshForge blocked a production or unscoped App Hosting secret mutation.'
    );
  }

  allow();
}

if (
  /\bgcloud\b/.test(lower) &&
  /\bsecrets\b/.test(lower) &&
  /fresh-prints-prod/.test(lower) &&
  /\b(?:create|delete|destroy|add|update)\b/.test(lower)
) {
  deny(
    'FreshForge blocked production Secret Manager mutation.'
  );
}

/*
 * ------------------------------------------------------------
 * DESTRUCTIVE GIT
 * ------------------------------------------------------------
 */

if (/\bgit\s+reset\s+--hard\b/.test(lower)) {
  deny(
    'FreshForge blocked git reset --hard. Preserve and classify local work first.'
  );
}

if (
  /\bgit\s+clean\b/.test(lower) &&
  /\s-[a-z]*f[a-z]*/.test(lower)
) {
  deny(
    'FreshForge blocked forced git clean. Inventory untracked work first.'
  );
}

/*
 * Uppercase -D is forced branch deletion.
 */
if (/\bgit\s+branch\s+-D(?:\s|$)/.test(command)) {
  deny(
    'FreshForge blocked forced local branch deletion.'
  );
}

if (
  /\bgit\s+worktree\s+remove\b/.test(lower) &&
  /--force\b/.test(lower)
) {
  deny(
    'FreshForge blocked forced worktree removal.'
  );
}

if (
  /\bgit\s+stash\s+(?:drop|clear)\b/.test(lower)
) {
  deny(
    'FreshForge blocked stash deletion or stash clear.'
  );
}

if (
  /\bgit\s+checkout\s+--\s+\.\s*$/.test(lower)
) {
  deny(
    'FreshForge blocked blanket git checkout restore because it may discard local work.'
  );
}

/*
 * ------------------------------------------------------------
 * DESTRUCTIVE FILESYSTEM
 * ------------------------------------------------------------
 */

if (
  /\brm\s+-[a-z]*r[a-z]*f[a-z]*(?:\s|$)/.test(lower) ||
  /\brm\s+-[a-z]*f[a-z]*r[a-z]*(?:\s|$)/.test(lower)
) {
  deny(
    'FreshForge blocked recursive forced filesystem deletion.'
  );
}

if (
  /\bremove-item\b/.test(lower) &&
  /-recurse\b/.test(lower) &&
  /-force\b/.test(lower)
) {
  deny(
    'FreshForge blocked recursive forced PowerShell deletion.'
  );
}

if (
  /\brmdir\s+\/s\b/.test(lower) &&
  /\/q\b/.test(lower)
) {
  deny(
    'FreshForge blocked recursive forced directory deletion.'
  );
}

/*
 * ------------------------------------------------------------
 * MIGRATIONS / PUBLICATION
 * ------------------------------------------------------------
 */

if (
  /\b(?:migrate|migration|migrate:deploy|db\s+push)\b/.test(lower) &&
  (
    /\bprod(?:uction)?\b/.test(lower) ||
    /fresh-prints-prod/.test(lower)
  )
) {
  deny(
    'FreshForge blocked a production migration.'
  );
}

if (
  /\b(?:npm|pnpm|yarn)\s+publish\b/.test(lower)
) {
  deny(
    'FreshForge blocked package publication.'
  );
}

/*
 * Nothing classified as dangerous.
 */
allow();