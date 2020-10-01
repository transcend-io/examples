# Ruby

Internal system integrations in Ruby. Check out the parent [README](../README.md) for more context.

## Installation

Install Ruby via homebrew

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

## Start

```sg
ruby server.rb
```

## Open the browser

Go to [localhost:4567](https://localhost:4567)

## Add to your Data Map

You can test against this example live by adding it to [your Data Map](https://app.transcend.io/data-map/silos?integrationName=server) and using [ngrok](https://ngrok.com/) to map your localhost to a live domain.

```sh
ngrok http -hostname=test-ruby.ngrok.io 4567
```
