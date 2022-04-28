<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [JavaScript](#javascript)
  - [Installation](#installation)
  - [Start](#start)
  - [Transcend-internal developer notes](#transcend-internal-developer-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# JavaScript

Internal system integrations in JavaScript. Check out the parent [README](../README.md) for more context.

## Installation

```sh
yarn
```

## Build

```sh
yarn build
```

## Start

```sh
yarn start
```

## Transcend-internal developer notes

-  This code is actively used for live demos.
-  This is associated with the demo account, [eShopIt](https://e-shop-it.trsnd.co).
-  It is hosted on [Render](http://render.com/) at <https://transcend-example.onrender.com>.
-  A design choice was made not to put webhook verification on an Express middleware. It's a nice refactor, but it can be esoteric to readers.
-  Use ngrok in dev.
