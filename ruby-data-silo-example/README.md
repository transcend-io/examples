# Ruby Server Silo Example

A standalone example of a working server silos integrated with Transcend, written in Ruby using Sinatra and Faraday for simplicity.

## Installation

Install ruby via homebrew

```sh
brew install ruby
```

Ensure Bundler 2 is installed

```sh
[sudo] gem install bundler
```

Install dependencies

```sh
bundler install
```

## Configuration

To configure the example, you will need to set the
`$TRANSCEND_API_KEY`, `$SOMBRA_API_KEY`, `$SOMBRA_URL`, `$JWT_AUDIENCE` values in the environment.

Create a file named `.env` and fill it out with your configuration

```sh
TRANSCEND_API_KEY="<TODO>"
SOMBRA_API_KEY="<TODO>"
SOMBRA_URL="https://<TODO>.sombra.transcend.io"
JWT_AUDIENCE="<TODO>"
```

## Start the server

```sg
ruby server.rb
```

## Open the browser

Go to [localhost:4567](https://localhost:4567)

## Expose to static ip using ngrok

To actually connect this demo to your transcend datamap, you need to expose a static URL. You can do this using [ngrok](https://ngrok.com/).

```sh
ngrok http -hostname=test-ruby.ngrok.io 4567
```
