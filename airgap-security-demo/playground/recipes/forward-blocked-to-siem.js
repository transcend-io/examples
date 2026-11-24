// Forward every blocked request to your security tools.
//
// airgap.watch() listens to requests without changing them. This watcher
// collects blocked requests. In production, send each one to your security
// information and event management (SIEM) tool, for example with
// navigator.sendBeacon('https://siem.example/airgap', JSON.stringify(event)).
// That beacon is a regulated request too, so its host must be allowed.
// The playground keeps the events in a list on the page instead (self.siemEvents).
//
// UNVERIFIED: whether `allowed` is already set when the watcher runs. Check
// that against the live bundle before you rely on it.
AirgapPlayground.recipes.register({
  id: 'forward-blocked-to-siem',
  title: 'Forward blocked requests to a SIEM',
  description:
    'Use airgap.watch() to collect blocked requests. The playground lists them on the page.',
  onReady(airgap) {
    airgap.watch((request) => {
      if (request.blocked || request.allowed === false) {
        const event = { type: request.type, url: String(request.url) };
        (self.siemEvents = self.siemEvents || []).push(event);
      }
    });
  },
});
