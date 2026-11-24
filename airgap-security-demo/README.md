<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Transcend Airgap security demo](#transcend-airgap-security-demo)
  - [Quickstart (60 seconds)](#quickstart-60-seconds)
    - [Set the bundle ID](#set-the-bundle-id)
  - [Playground](#playground)
    - [Try these](#try-these)
    - [Adjust it](#adjust-it)
    - [What a result says about the layer](#what-a-result-says-about-the-layer)
    - [How the tag is added](#how-the-tag-is-added)
    - [Use your own bundle](#use-your-own-bundle)
  - [Static mode pages](#static-mode-pages)
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

## Quickstart (60 seconds)

```bash
yarn install
yarn workspace @transcend-io/airgap-security-demo start
```

1. Open <http://localhost:4173/playground/>.
2. Click **Run all** under "Attacks". With no bundle, Airgap does not load. Every row says "Allowed". That is the baseline.
3. Add your bundle: <http://localhost:4173/playground/?bundle=YOUR-BUNDLE-ID&unknownRequests=block>. Click **Run all** again. Rows change to "Blocked".
4. Pick a preset under "Try these". Use "Copy this config" to take the setup to your own site.

The demo organization bundle is not published yet. Until it is, use your own bundle (see [Use your own bundle](#use-your-own-bundle)) or the stand-in tests.

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

## Playground

`playground/` lets you change one policy at a time and run attacks against it. Every setting lives in the URL query, so a link is a shareable setup. The page validates each value against an allowlist before it builds the airgap.js tag.

### Try these

| Preset                                                                             | What it shows                                      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Checkout skimmer](http://localhost:4173/playground/?nav=on&recipes=block-card-and-tokens) | Card data leaves by fetch, beacon, and navigation. |
| [Internal app inventory](http://localhost:4173/playground/?reportOnly=on)          | Report-only: list every host, block nothing.       |
| [Health data in ad pixel URLs](http://localhost:4173/playground/?recipes=custom&consent=Advertising) | A custom override blocks health terms in a URL.    |
| [Minors](http://localhost:4173/playground/?recipes=block-ads-for-minors&consent=Advertising,SaleOfInfo) | Ads stay blocked even with consent.                |
| [Phishing redirect](http://localhost:4173/playground/?nav=on&recipes=strip-personal-data-from-links) | Navigation control and link scrubbing.             |
| [User-supplied images](http://localhost:4173/playground/?recipes=omit-credentials-images) | Images load without cookies.                       |

The links need the server from the quickstart. Add `&bundle=YOUR-BUNDLE-ID` to any of them.

### Adjust it

| You want to change                         | Edit                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------- |
| An override (block, rewrite, omit cookies) | `playground/recipes/<name>.js`. One file per toggle.                  |
| The custom override                        | `playground/recipes/custom.js`                                        |
| A preset link                              | `playground/presets.js`                                               |
| An attack button                           | `playground/attacks.js`                                               |
| A control, its values, or the tag          | `playground/settings.js`. Pure code. Tests: `tests/settings.spec.ts`. |
| Which layer a result names                 | `playground/attribution.js`                                           |
| The default bundle ID, hosts, store ID     | `src/config.js`                                                       |

Each recipe is plain `airgap.overrides` code. Its comment says what it does and links the doc it came from. Recipes that depend on behavior we could not check say `UNVERIFIED`.

### What a result says about the layer

The result table names a layer only when a signal supports it: an override that fired, a `securitypolicyviolation` event, consent for a classified host, navigation control, or a held request. Otherwise it says "blocked". The page cannot tell you more than the browser shows.

### How the tag is added

The page builds the script tag with DOM calls (`createElement`, `setAttribute`, `appendChild`) from validated values. It never uses `document.write` or `innerHTML` with user input. The overrides and CSP are set in `self.airgap` before the tag loads.

Unverified: whether airgap.js, loaded this way after the page starts, controls every request that earlier scripts make. The docs support async loading with `airgap.ready`. We have not checked it against a live bundle. If it falls short, run the server with injection. The tag then sits in the HTML, as in the static mode pages:

```bash
yarn workspace @transcend-io/airgap-security-demo start:inject
```

### Use your own bundle

Add `?bundle=<uuid>` to the playground link. Or run `node scripts/set-bundle-id.mjs <bundle-id>`. The bundle's own policy applies. The controls add to it through the tag options and `self.airgap`. If the bundle has no unknown-request policy, set `unknownRequests=block` in the link.

## Static mode pages

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
| Unapproved | `unpkg.com`                 | Playground script and stylesheet attacks load a small file from here.           |

The pixel is `assets/pixel.png`, served from the `main` branch of this repository on the unapproved host.

## Test

```bash
yarn workspace @transcend-io/airgap-security-demo playwright install chromium
yarn workspace @transcend-io/airgap-security-demo test
```

`tests/settings.spec.ts` checks the pure settings code. `tests/playground.spec.ts` runs the playground against a stand-in for airgap.js, so it proves the page logic, not Airgap. `tests/playground-live.spec.ts` needs a live bundle and skips without one. It has not run against a real bundle.

The `off/` tests run for real. They stub the two third-party hosts at the network layer, below Airgap. The tests for the three Airgap pages skip with a message while the bundle ID is the placeholder. Their expected results come from the airgap.js docs and have not run against a live bundle. Screenshots and the replay video are written to `screenshots/`, which git ignores.

## Deploy

Host the folder on GitHub Pages at `/airgap-security-demo/`. All paths are relative, so it works under a sub-path. This is a repository setting (Settings, Pages, deploy from branch `main`, root). This folder does not turn it on. The demo organization lists `transcend-io.github.io` as an allowed domain.

## Learn more

- [Why your CSP needs a runtime layer](https://transcend.io/blog/why-your-csp-needs-a-runtime-layer) (the blog post)
- [airgap.js as a browser security control](https://docs.transcend.io/docs/consent-management/reference/airgap-security-controls) (docs)
- [Demo organization config](https://github.com/transcend-io/main/blob/dev/consent-manager/dogfood/airgap-demo/transcend.yml) (main repository)
