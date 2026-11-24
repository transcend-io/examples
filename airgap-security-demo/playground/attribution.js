/**
 * Decide the outcome of one attack and, only when the signals support it,
 * name the layer that stopped it. A layer is named only for these cases:
 *
 * - override: one of our wrapped recipe overrides blocked or rewrote the
 *   request. The playground records that itself, so it is certain.
 * - generated CSP: the browser fired a `securitypolicyviolation` event for the
 *   host during the attack. Only a CSP raises that event.
 * - consent: the host is classified in the demo organization config, the
 *   visitor has not consented to its purpose, and the request got no answer.
 *   The docs say Airgap allows classified hosts only with consent.
 * - navigation control: a navigation got no answer and `data-regulate-navigation`
 *   is `on`. Navigation control is the documented layer for navigations.
 * - runtime: a request to a host the organization config does not list got no
 *   answer while the Unknown Request Policy (or Unknown Cookie Policy for a
 *   cookie) is block. The policy is set on the tag or comes from the demo
 *   organization config.
 *
 * In every other case the result says "blocked" with no layer.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AirgapPlayground = root.AirgapPlayground || {};
    root.AirgapPlayground.attribution = api;
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const LAYERS = {
    override: 'override',
    csp: 'generated CSP',
    consent: 'consent',
    navigation: 'navigation control',
    runtime: 'runtime',
  };

  /**
   * The policy that applies. The demo organization config sets both policies to
   * BLOCK. With your own bundle the org config is unknown, so only a policy on
   * the tag counts.
   *
   * @param {string} setting The setting value, `default` when not set.
   * @param {boolean} customBundle True when the reader supplied ?bundle=.
   * @returns {string|null} A policy name, or null when it is not known.
   */
  function effectivePolicy(setting, customBundle) {
    if (setting && setting !== 'default') return setting;
    return customBundle ? null : 'block';
  }

  /**
   * @param {object} input The signals for one attack.
   * @returns {{ outcome: string, layer: string|null, detail: string }} The result.
   */
  function attribute(input) {
    const {
      kind,
      transport,
      violation,
      heldByAirgap,
      sentByAirgap,
      overrideHit,
      settings,
      hostPurpose,
      hostKnown,
      consented,
      customBundle,
      airgapLoaded,
      host,
      seconds,
    } = input;
    const noAnswer = `No answer in ${seconds} seconds.`;

    if (!airgapLoaded) {
      if (transport === 'ok' || transport === 'cookie-set') {
        return {
          outcome: 'allowed',
          layer: null,
          detail: `Airgap is not running. The attack reached ${host}.`,
        };
      }
      return {
        outcome: 'error',
        layer: null,
        detail: `${
          transport === 'timeout' ? noAnswer : 'Network error.'
        } Airgap is not running, so this is not an Airgap decision.`,
      };
    }

    if (overrideHit) {
      return {
        outcome: overrideHit.action === 'blocked' ? 'blocked' : 'allowed',
        layer: LAYERS.override,
        detail:
          overrideHit.action === 'blocked'
            ? `The override "${overrideHit.title}" blocked it.`
            : `The override "${overrideHit.title}" rewrote the URL, and the request went on.`,
      };
    }

    if (violation) {
      return {
        outcome: 'blocked',
        layer: LAYERS.csp,
        detail: `The browser refused it under the generated Content Security Policy.${
          heldByAirgap ? ' Airgap also listed it.' : ''
        }`,
      };
    }

    const unanswered =
      transport === 'timeout' ||
      transport === 'cookie-missing' ||
      heldByAirgap === true;

    if (settings.reportOnly === 'on') {
      if (transport === 'ok' || transport === 'cookie-set') {
        return {
          outcome: sentByAirgap ? 'reported' : 'allowed',
          layer: null,
          detail: sentByAirgap
            ? 'Report-only mode. Airgap listed it in airgap.export().sentRequests and let it through.'
            : 'Report-only mode. The request went through.',
        };
      }
      if (!unanswered) {
        return { outcome: 'error', layer: null, detail: 'Network error.' };
      }
    }

    if (unanswered) {
      if (hostPurpose && !consented && !customBundle) {
        return {
          outcome: 'held',
          layer: LAYERS.consent,
          detail: `${host} is classified as ${hostPurpose}. Airgap holds the request until the visitor consents.`,
        };
      }
      if (kind === 'navigation' && settings.nav === 'on') {
        return {
          outcome: 'blocked',
          layer: LAYERS.navigation,
          detail: 'Navigation control is on, and the navigation got no answer.',
        };
      }
      if (kind === 'cookie') {
        const cookiePolicy = effectivePolicy(
          settings.unknownCookies,
          customBundle,
        );
        return {
          outcome: 'blocked',
          layer: cookiePolicy === 'block' ? LAYERS.runtime : null,
          detail:
            cookiePolicy === 'block'
              ? 'The Unknown Cookie Policy is block, and the cookie was not set.'
              : 'The cookie was not set. The layer is not known from this signal.',
        };
      }
      if (kind === 'request' && !hostKnown) {
        const policy = effectivePolicy(settings.unknownRequests, customBundle);
        if (policy === 'block') {
          return {
            outcome: 'blocked',
            layer: LAYERS.runtime,
            detail: `The Unknown Request Policy is block. ${
              heldByAirgap
                ? 'The request is in airgap.export().requests.'
                : noAnswer
            }`,
          };
        }
      }
      return {
        outcome: 'blocked',
        layer: null,
        detail: `${
          heldByAirgap
            ? 'The request is in airgap.export().requests.'
            : noAnswer
        } The layer is not known from this signal.`,
      };
    }

    if (transport === 'error') {
      return {
        outcome: 'error',
        layer: null,
        detail: 'Network error. This is not an Airgap decision.',
      };
    }

    return {
      outcome: 'allowed',
      layer: null,
      detail:
        kind === 'cookie'
          ? 'The cookie was set.'
          : `The request reached ${host}.`,
    };
  }

  return { LAYERS, attribute, effectivePolicy };
});
