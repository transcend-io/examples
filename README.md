<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Examples](#examples)
  - [What are these examples](#what-are-these-examples)
  - [Try it in your environment](#try-it-in-your-environment)
    - [TRANSCEND_API_KEY](#transcend_api_key)
    - [SOMBRA_API_KEY](#sombra_api_key)
    - [SOMBRA_URL](#sombra_url)
  - [Languages](#languages)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Examples

Some examples of how to integrate with Transcend in various languages. See [our documentation](https://docs.transcend.io/) for further information.

- Javascript
- Python
- Ruby
- [Coming soon] Go
- [Coming soon] Typescript

## What are these examples

These examples are meant to show you what the integration will look like when you connect your internal systems to Transcend.

Each language has an example of how to:

- Verify a webhook that is sent from Transcend ([docs](https://docs.transcend.io/docs/receiving-webhooks))
- Respond to ACCESS/ERASURE and other DSR webhooks ([docs](https://docs.transcend.io/docs/responding-to-dsrs))

The JavaScript folder also has an example of how to:

- Perform identity enrichment by responding to a webhook ([docs](https://docs.transcend.io/docs/identity-enrichment))

Using [ngrok](https://ngrok.com/) you can actually [connect these examples](https://app.transcend.io/data-map/silos?integrationName=server) to your [Data Map](https://app.transcend.io/data-map).

## Try it in your environment

To configure these examples, you will need to create a file named `.env` and fill it out with your configuration.

```sh
TRANSCEND_API_KEY="<TODO>"
SOMBRA_API_KEY="<TODO>"
SOMBRA_URL="https://<TODO>.sombra.transcend.io"
```

### TRANSCEND_API_KEY

This API key authenticates you to Transcend, and you can generate it on the [admin dashboard](https://app.transcend.io/settings#Developer).
API keys must be scoped to certain operations or data silos.

### SOMBRA_API_KEY

This API key authenticates you to to your Sombra gateway.

- If you're using multi-tenant Sombra (most common) you don't need to set this.
- If you are self-hosting Sombra, you would have generated this at the time of setup and stored it securely.
- If Transcend is hosting the gateway on your behalf in a single-tenant instance, you will receive this via a secure channel.

### SOMBRA_URL

This is the URL of your Sombra gateway.

- If you're using multi-tenant Sombra (most common), this is `https://multi-tenant.sombra.transcend.io`.
- If you are self-hosting Sombra, you assign this value.
- If Transcend is hosting the gateway on your behalf in a single-tenant instance, this is `https://<ORGANIZATION_URI>.sombra.transcend.io`.

## Languages

Check out your language of choice for further details

- [JavaScript](./javascript)
- [Python](./python)
- [Ruby](./ruby)
