# Ruby

Internal system integrations in ruby. Check out the parent [README](../) for more context.

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

## Start

```sg
ruby server.rb
```

## Open the browser

Go to [localhost:4567](https://localhost:4567)

## Add to your datamap

You can test against this example live by adding it to [your datamap](https://app.transcend.io/data-map/silos?integrationName=server) and using [ngrok](https://ngrok.com/) to map your localhost to a live domain.

```sh
ngrok http -hostname=test-python.ngrok.io 4567
```
