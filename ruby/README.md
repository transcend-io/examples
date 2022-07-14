<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Ruby](#ruby)
  - [Installation](#installation)
  - [Start](#start)
  - [Open the browser](#open-the-browser)
  - [Add to your Data Map](#add-to-your-data-map)
  - [Cron example](#cron-example)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Ruby

Internal system integrations in Ruby. Check out the parent [README](../README.md) for more context.

## Installation

Install Ruby via homebrew (if not using Codespaces)

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
## Cron example

You can run the following command:

```sg
ruby cron.rb
```

Or you can just fork the repl located in [this page](https://replit.com/@GiulianoGiacag1/Ruby-Cron-Example-Transcend).
