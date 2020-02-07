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

To configure these example, you will need to create a file named `.env` and fill it out with your configuration

```sh
TRANSCEND_API_KEY="<TODO>"
SOMBRA_API_KEY="<TODO>"
ORGANIZATION_URI="<TODO>"
SOMBRA_URL="https://<TODO>.sombra.transcend.io"
```

**### **TRANSCEND_API_KEY

This API key authenticates you to Transcend, and you can generate it on the [admin dashboard](https://app.transcend.io/settings#Developer).
API keys must be scoped to certain operations or data silos.

### SOMBRA_API_KEY

This API key authenticates you to to your sombra gateway.

- If you are self hosting sombra, you would have generated this at time of setup and stored it securely.
- If transcend is hosting the gateway on your behalf, you should have received this via some secure channel

### ORGANIZATION_URI

This is the unique uri of your organization on transcend found [here](https://app.transcend.io/settings#OrganizationSettings).

### SOMBRA_URL

This is the URL of your sombra gateway.

- If you are self hosting, you assign this value
- If transcend is hosting, it is often at `https://<ORGANIZATION_URI>.sombra.transcend.io`

## Languages

Check out your language of choice for further details

- [javascript](./javascript)
- [python](./python)
- [ruby](./ruby)
- [typescript](./typescript)
