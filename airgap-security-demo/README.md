<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Transcend Airgap security demo](#transcend-airgap-security-demo)
  - [Quickstart](#quickstart)
    - [Set the bundle ID](#set-the-bundle-id)
  - [Modes](#modes)
  - [Steps](#steps)
  - [How to read the result log](#how-to-read-the-result-log)
  - [Hosts](#hosts)
  - [Test](#test)
  - [Deploy](#deploy)
  - [Learn more](#learn-more)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Transcend Airgap security demo

Playable browser demo of what Transcend Airgap (airgap.js) stops. A script on a checkout page tries to get card data out: a tracking pixel, a `fetch` from an injected script, a hidden stylesheet request, a navigation to a lookalike site, and a call to an approved analytics host. The demo runs the same five steps in four modes.

Transcend Airgap is a browser-side security control and consent manager. It blocks unknown third-party requests, generates a Content Security Policy (CSP) from your data flows, and can regulate navigation. Use the demo to explain client-side security, script control, Payment Card Industry Data Security Standard (PCI DSS) 6.4.3 and 11.6.1 style controls, and data exfiltration risk to a chief information security officer (CISO). Keywords: airgap.js, consent management, CSP, Content Security Policy, request blocking, navigation control, exfiltration, web skimming, third-party scripts, report-only.

Read the story first: [Why your CSP needs a runtime layer](https://transcend.io/blog/why-your-csp-needs-a-runtime-layer).

## Quickstart

```bash
yarn install
yarn workspace @transcend-io/airgap-security-demo start
```

Open <http://localhost:4173/>.

| Page           | Works today?                          |
| -------------- | ------------------------------------- |
| `off/`         | Yes. No setup.                        |
| `report-only/` | Needs the bundle ID (see next steps). |
| `block/`       | Needs the bundle ID.                  |
| `navigation/`  | Needs the bundle ID.                  |

The three Airgap pages load airgap.js from `https://transcend-cdn.com/cm/<bundle-id>/airgap.js`. The committed pages hold a placeholder instead of a real bundle ID, so until you set one, each of them shows a "Bundle ID not set" banner and behaves like `off/`.

### Set the bundle ID

```bash
node scripts/set-bundle-id.mjs <bundle-id>
```

Run it from `airgap-security-demo/`. It checks that the value looks like a UUID, then writes it to `BUNDLE_ID` in [`src/config.js`](src/config.js) and into the script tag of `report-only/`, `block/`, and `navigation/`. Run `node scripts/set-bundle-id.mjs --reset` to put the placeholder back before you commit.

The bundle ID is public by design. It is part of the script URL of every page that uses it. Never put API keys or secrets in this folder.

To use your own bundle, create a consent manager in your Transcend organization. Add `localhost`, `localhost:4173`, and `127.0.0.1:4173` to its allowed domains. Find the bundle ID in the Admin Dashboard under Consent Management, Developer Settings.

## Modes

Each mode is a separate static page, because airgap.js must load first and synchronously.

| Page           | Script tag options                               | What happens                                                                                                    |
| -------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `off/`         | No airgap.js                                     | Every step succeeds.                                                                                            |
| `report-only/` | `data-report-only="on" data-monitoring="export"` | Nothing is blocked. The panel lists what `airgap.export()` saw.                                                 |
| `block/`       | None                                             | The organization config sets the Unknown Request Policy to Block, which turns on the generated CSP in lax mode. |
| `navigation/`  | `data-regulate-navigation="on"`                  | Same as block, plus navigations to unknown hosts are blocked.                                                   |

The policy comes from the organization config, not the tag. See [the demo organization config](https://github.com/transcend-io/main/blob/dev/consent-manager/dogfood/airgap-demo/transcend.yml) in the main repository. It sets a strict policy, lists the allowed domains, and lists the approved and classified hosts. `raw.githubusercontent.com` is deliberately not on the list. It is the unapproved host that the steps call. Do not add it.

## Steps

| Step          | What it does                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| Take one      | Sets `location` to an unapproved host with the form fields in the query string. |
| Try 1         | An injected inline script calls `fetch` on an unapproved host.                  |
| Try 2         | An injected style rule loads an image from an unapproved host.                  |
| Try 3         | Repeats take one. Navigation control treats it as a request.                    |
| Try 4         | Calls the approved analytics host `www.google-analytics.com`. Consent decides.  |
| Attack replay | Runs all five steps in order and writes one timeline.                           |

Each step has a link, for example `block/#step=fetch`. Add `&run=on` to run it on load. Navigation steps run inside an iframe so the visitor stays on the page. The result is "blocked" if the frame does not reach the target within 3 seconds. A top-level `location` change is not tested here.

## How to read the result log

| Result         | Meaning                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed        | The request reached the host. On an unapproved host, this is the risk.                                                                                           |
| Reported       | Report-only mode. The request succeeded and `airgap.export().sentRequests` lists it.                                                                             |
| Blocked        | The request never got an answer, or the host is in `airgap.export().requests`. Airgap holds blocked requests and never answers them, so a timeout means blocked. |
| Held           | The host is approved but its purpose has no consent. Airgap holds the request until the visitor opts in.                                                         |
| Blocked by CSP | The browser fired a `securitypolicyviolation` event for the host.                                                                                                |
| Error          | A network error. This is not an Airgap decision.                                                                                                                 |

The log is kept in `sessionStorage` per mode.

## Hosts

| Role       | Host                        | Why                                                                             |
| ---------- | --------------------------- | ------------------------------------------------------------------------------- |
| Approved   | `www.google-analytics.com`  | Classified as Analytics. Step 4 asks for a static script file and sends no hit. |
| Unapproved | `raw.githubusercontent.com` | Real static host with open CORS. Needs no server. Not in the org config.        |

The pixel is `assets/pixel.png`, served from the `main` branch of this repository on the unapproved host.

## Test

```bash
yarn workspace @transcend-io/airgap-security-demo playwright install chromium
yarn workspace @transcend-io/airgap-security-demo test
```

The `off/` tests run for real. They stub the two third-party hosts at the network layer, below Airgap. The tests for the three Airgap pages skip with a message while the bundle ID is the placeholder. Their expected results come from the airgap.js docs and have not run against a live bundle. Screenshots and the replay video are written to `screenshots/`, which git ignores.

## Deploy

Host the folder on GitHub Pages at `/airgap-security-demo/`. All paths are relative, so it works under a sub-path. This is a repository setting (Settings, Pages, deploy from branch `main`, root). This folder does not turn it on. The demo organization lists `transcend-io.github.io` as an allowed domain.

## Learn more

- [Why your CSP needs a runtime layer](https://transcend.io/blog/why-your-csp-needs-a-runtime-layer) (the blog post)
- [airgap.js as a browser security control](https://docs.transcend.io/docs/consent-management/reference/airgap-security-controls) (docs)
- [Demo organization config](https://github.com/transcend-io/main/blob/dev/consent-manager/dogfood/airgap-demo/transcend.yml) (main repository)
