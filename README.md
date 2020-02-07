# examples

Some examples of how to integrate with transcend in various languages. See [our documentation](https://docs.transcend.io/) for further information.

## What are these examples

These examples are meant to show you what the integration will look like when you connect your internal systems to transcend.

Each language has an example of how to:

- Verify a webhook that is sent from transcend ([docs](https://docs.transcend.io/docs/receiving-webhooks))
- How to perform identity enrichment by responding to a webhook ([docs](https://docs.transcend.io/docs/identity-enrichment))
- How to respond to ACCESS/ERASURE and other DSR webhooks ([docs](https://docs.transcend.io/docs/responding-to-dsrs))

Using [ngrok](https://ngrok.com/) you can actually [connect these examples](https://app.transcend.io/data-map/silos?integrationName=server) to your [datamap](https://app.transcend.io/data-map).

## Try it in your environment

To configure the example, you will need to set the
`$TRANSCEND_API_KEY`, `$SOMBRA_API_KEY`, `$SOMBRA_URL`, `$ORGANIZATION_URI` values in the environment.

Create a file named `.env` and fill it out with your configuration

```sh
TRANSCEND_API_KEY="<TODO>"
SOMBRA_API_KEY="<TODO>"
SOMBRA_URL="https://<TODO>.sombra.transcend.io"
ORGANIZATION_URI="<TODO>"
```

## Languages

Checkout your language of choice for further details

- [javascript](./javascript)
- [typescript](./typescript)
- [python](./python)
- [ruby](./ruby)
