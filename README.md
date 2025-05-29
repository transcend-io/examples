<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Examples](#examples)
  - [What are these examples](#what-are-these-examples)
  - [Try it in your environment](#try-it-in-your-environment)
    - [TRANSCEND_API_KEY](#transcend_api_key)
    - [SOMBRA_API_KEY](#sombra_api_key)
    - [SOMBRA_URL](#sombra_url)
    - [Audience](#audience)
  - [Languages](#languages)
  - [Try it on Replit](#try-it-on-replit)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

> Try [**Custom Functions**](https://docs.transcend.io/docs/articles/integrations/custom/custom-functions)
>
> Custom Functions are serverless functions that execute on Sombra as part of a workflow. Unlike webhooks, Custom Functions require zero infrastructure to set up. Just write your code, and publish. With Custom Functions, you can easily extend Transcend's integration functionality to connect to any API or home-grown system.

# Examples

Some examples of how to integrate with Transcend in various languages. See [our documentation](https://docs.transcend.io/) for further information.

- Javascript
- Python
- Ruby
- Typescript
- [Coming soon] Go

## What are these examples

These examples are meant to show you what the integration will look like when you connect your internal systems to Transcend.

Each language has an example of how to:

- Verify a webhook that is sent from Transcend ([docs](https://docs.transcend.io/docs/receiving-webhooks))
- Respond to ACCESS/ERASURE and other DSR webhooks ([docs](https://docs.transcend.io/docs/responding-to-dsrs))

The JavaScript folder also has an example of how to:

- Perform identity enrichment by responding to a webhook ([docs](https://docs.transcend.io/docs/identity-enrichment))

Using [ngrok](https://ngrok.com/) you can actually [connect these examples](https://app.transcend.io/data-map/silos?integrationName=server) to your [Data Map](https://app.transcend.io/data-map).

## Try it in your environment

To configure these examples, you will need to create a file named `.env` and fill it out with your configuration, or they can be set as environment variables

```sh
TRANSCEND_API_KEY="<TODO>"
SOMBRA_API_KEY="<TODO>"
SOMBRA_URL="https://<TODO>.sombra.transcend.io"
AUDIENCE="<TODO>"
```

### TRANSCEND_API_KEY

This API key authenticates you to Transcend, and you can generate it on the [admin dashboard](https://app.transcend.io/settings#Developer).
API keys must be scoped to the proper integration that you are responding to.

### SOMBRA_API_KEY

This API key authenticates you to to your Sombra gateway.

- If you're using "Transcend Hosted - Multi Tenant" Sombra (most common) you don't need to set this.
- If you are self-hosting Sombra, you would have generated this at the time of setup and stored it securely.
- If Transcend is hosting the gateway on your behalf in a single-tenant instance, you should reach out to your account manager to get this key.

You can see which version of the Sombra Gateway you are using by visiting [Infrastructure -> Sombra](https://app.transcend.io/infrastructure/sombra/sombras) settings in the Admin Dashboard.

### SOMBRA_URL

This is the URL of your Sombra gateway. You can find your URL by visiting [Infrastructure -> Sombra](https://app.transcend.io/infrastructure/sombra/sombras) settings in the Admin Dashboard. This URL is the value titled "CUSTOMER INGRESS URL".

<img width="1386" alt="Screenshot 2023-02-19 at 2 00 52 PM" src="https://user-images.githubusercontent.com/10264973/219977722-8c15be4d-2508-4090-b06a-0fbfa55c2d7b.png">


### Audience

This is the audience that you will verify is set on the incoming Json Web Tokens (JWTs). You can find your Sombra audience under [Infrastructure -> Sombra](https://app.transcend.io/infrastructure/sombra/sombras) in the Admin Dashboard. This URL is the value titled "SOMBRA AUDIENCE".

## Languages

Check out your language of choice for further details

- [JavaScript](./javascript)
- [Typescript](./typescript)
- [Python](./python)
- [Ruby](./ruby)

## Try it on Replit

If you want to try out an example that is ready to run, you can head to Replit and fork the example.

The example is located [here](https://replit.com/@giacaglia/Webhook-Transcend?v=1). You will need to first fork the replit and then you can start running the code. The webhook url will be located in the url generated at the top right. You will need to update some of the secrets, including  `TRANSCEND_API_KEY`.

Here are two videos of how to set it up on Replit: 

- [First part](https://www.loom.com/share/558f95537e27471b8bc8943cbf5c29d2)
- [Second part](https://www.loom.com/share/2a6582166d284171893fe00f93629fd4)
