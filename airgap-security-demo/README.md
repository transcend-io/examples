<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Transcend Airgap security demo](#transcend-airgap-security-demo)
  - [Run it locally](#run-it-locally)
  - [Modes](#modes)
  - [Scenarios](#scenarios)
  - [How to read the result log](#how-to-read-the-result-log)
  - [Hosts](#hosts)
  - [Set the bundle ID](#set-the-bundle-id)
  - [Config as code](#config-as-code)
  - [How to deploy](#how-to-deploy)
  - [Test](#test)
  - [Learn more](#learn-more)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Transcend Airgap security demo

Playable browser demo of what Transcend Airgap (airgap.js) stops: tracking pixels, `fetch` calls from injected scripts, and data exfiltration through navigation, shown with and without a Content Security Policy (CSP).

Transcend Airgap is a browser-side security control and consent manager. It blocks unknown third-party requests, generates a Content Security Policy from your data flows, and can regulate navigation. This demo runs the same four scenarios in four modes: off, report-only, block, and block plus navigation control. Use it to explain client-side security, script control, Payment Card Industry Data Security Standard (PCI DSS) 6.4.3 and 11.6.1 style controls, and data exfiltration risk to a chief information security officer (CISO). Keywords: airgap.js, consent management, CSP, Content Security Policy, request blocking, navigation control, exfiltration, third-party scripts, report-only.

## Run it locally

```bash
yarn install
yarn workspace @transcend-io/airgap-security-demo start
```

Open <http://localhost:4173/>. The `off/` mode works with no setup. The other three modes need the bundle ID (see below).

Local runs against the real bundle are untested. The consent manager `domains` list contains only `transcend-io.github.io`. It is not verified whether the bundle runs on `localhost` without listing it.

## Modes

Each mode is a separate static page, because airgap.js must load first and synchronously.

| Page           | Script tag options                                                                   | What happens                                                    |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `off/`         | No airgap.js                                                                         | Every scenario succeeds.                                        |
| `report-only/` | `data-report-only="on" data-monitoring="export"`                                     | Nothing is blocked. The panel lists what `airgap.export()` saw. |
| `block/`       | `data-csp="allow-known-hosts allow-subdomains"`                                      | Unknown Request Policy is Block. Unknown hosts are blocked.     |
| `navigation/`  | `data-csp="allow-known-hosts allow-subdomains"` plus `data-regulate-navigation="on"` | Block, plus navigations to unknown hosts are blocked.           |

The Unknown Request Policy is set in the organization config, not on the tag. See `transcend.yml`. Unknown requests are blocked whenever the CSP is on.

## Scenarios

| Button | What it does                                                                    |
| ------ | ------------------------------------------------------------------------------- |
| 1      | Loads an image from an unapproved host.                                         |
| 2      | An injected inline script calls `fetch` on an unapproved host.                  |
| 3      | Sets `location` to an unapproved host with the form fields in the query string. |
| 4      | Calls an approved host.                                                         |

Scenario 3 runs inside an iframe, so the visitor stays on the page. The result is "blocked" if the frame does not reach the target within 3 seconds. The top-level `location` behavior is not tested here. A frame can also be refused by the generated CSP in block mode, which a top-level navigation would not be.

## How to read the result log

| Result         | Meaning                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed        | The request reached the host. On an unapproved host, this is the risk.                                                                                           |
| Reported       | Report-only mode. The request succeeded and `airgap.export().sentRequests` lists it.                                                                             |
| Blocked        | The request never got an answer, or the host is in `airgap.export().requests`. Airgap holds blocked requests and never answers them, so a timeout means blocked. |
| Blocked by CSP | The browser fired a `securitypolicyviolation` event for the host.                                                                                                |
| Error          | A network error. This is not an Airgap decision.                                                                                                                 |

Pixel: allowed on load, blocked on error or timeout. Fetch: allowed if it resolves, error if it rejects, blocked on timeout (3 seconds). The log is kept in `sessionStorage` per mode.

## Hosts

| Role       | Host                        | Why                                                                       |
| ---------- | --------------------------- | ------------------------------------------------------------------------- |
| Approved   | `cdn.jsdelivr.net`          | Static host with open CORS. Listed in `transcend.yml` as Essential.       |
| Unapproved | `raw.githubusercontent.com` | Real static host with open CORS. Needs no server. Not in `transcend.yml`. |

The pixel is `assets/pixel.png`, served from the `main` branch on the unapproved host. It returns 404 until this folder is on `main`.

## Set the bundle ID

Edit one constant: `BUNDLE_ID` in [`src/config.js`](src/config.js). It is `REPLACE_WITH_DEMO_BUNDLE_ID` until the consent manager exists. The bundle ID is public by design. Never put API keys or secrets in this folder.

## Config as code

[`transcend.yml`](transcend.yml) sets the Unknown Request Policy and Unknown Cookie Policy to `BLOCK`, the allowed `domains`, and a few data flows. The workflow `.github/workflows/airgap-config.yml` runs `transcend inventory push --dryRun` on pull requests. On merge to `main` it pushes the config and runs `transcend consent update-consent-manager --deploy`. It needs a `TRANSCEND_API_KEY` repository secret for the demo organization in the EU region. The commands and flags come from `@transcend-io/cli` 13.4.0 `--help`. They are not run against a live organization.

## How to deploy

Host the folder on GitHub Pages at `/airgap-security-demo/`. All paths are relative, so it works under a sub-path. This is a repository settings toggle (Settings, Pages, deploy from branch `main`, root). It is not enabled by this folder.

## Test

```bash
yarn workspace @transcend-io/airgap-security-demo playwright install chromium
yarn workspace @transcend-io/airgap-security-demo test
```

The test runs each mode and writes 1440x1024 screenshots to `screenshots/`. The `off/` mode runs for real. The other modes skip with a message while `BUNDLE_ID` is the placeholder. The test stubs the two third-party hosts at the network layer, below Airgap.

## Learn more

- [Airgap security controls overview](https://docs.transcend.io/docs/consent-management/security-controls/overview) (the page is moving here)
- [Current page: airgap.js as a browser security control](https://docs.transcend.io/docs/consent-management/reference/airgap-security-controls)
