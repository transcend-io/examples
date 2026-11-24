<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Airgap security demo: agent notes](#airgap-security-demo-agent-notes)
  - [Structure](#structure)
  - [Commands](#commands)
  - [Rules](#rules)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Airgap security demo: agent notes

Static demo of what Transcend Airgap (airgap.js) blocks. No build step. Plain browser code plus Playwright tests.

## Structure

| Path                  | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `index.html`          | Landing page. Links to the playground and the mode pages.    |
| `off/`, `report-only/`, `block/`, `navigation/` | Story demo. Static pages, one script tag each. |
| `src/`                | Story demo code and `config.js` (bundle ID, hosts).          |
| `playground/`         | Settings in the URL, head bootstrap, attacks, recipes, UI.   |
| `playground/recipes/` | One file per override toggle, plus `custom.js`.              |
| `scripts/serve.mjs`   | Local server on port 4173. `--inject` writes the tag server side. |
| `scripts/set-bundle-id.mjs` | Writes or resets the bundle ID.                        |
| `tests/`              | Playwright specs. Airgap is stubbed unless the spec says live. |

## Commands

Run from the repository root.

| Task                       | Command                                                        |
| -------------------------- | -------------------------------------------------------------- |
| Serve                      | `yarn workspace @transcend-io/airgap-security-demo start`      |
| Serve with tag injection   | `yarn workspace @transcend-io/airgap-security-demo start:inject` |
| Test                       | `yarn workspace @transcend-io/airgap-security-demo test`       |
| Format                     | `yarn prettier --write airgap-security-demo`                   |
| Set the bundle ID          | `node airgap-security-demo/scripts/set-bundle-id.mjs <id>` (`--reset` restores the placeholder) |

## Rules

- No API keys or secrets in this folder. The bundle ID is public.
- Never invent a bundle ID or any UUID. Generate with `crypto.randomUUID()` or take a real one from the user. Keep `REPLACE_WITH_DEMO_BUNDLE_ID` until a real ID exists.
- Do not approve `raw.githubusercontent.com` in any config. It is the unapproved host on purpose.
- Do not commit a `transcend.yml` here. The org config lives in `transcend-io/main` under `consent-manager/dogfood/airgap-demo/`.
- No `document.write`. No `innerHTML`, `outerHTML`, or `insertAdjacentHTML` with user input. Build tags with DOM calls. Check query values against the allowlists in `playground/settings.js`.
- Name a layer in a result only when a signal supports it. Otherwise say "blocked".
- Mark anything not checked against a live bundle as `UNVERIFIED`, in code comments, tests, and PR text.
- Fake data only in attacks. No real card numbers, emails, or health records.
