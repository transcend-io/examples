<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Python](#python)
  - [Installation](#installation)
  - [Start](#start)
  - [Open the browser](#open-the-browser)
  - [Add to your Data Map](#add-to-your-data-map)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Python

Internal system integrations in Python. Check out the parent [README](../README.md) for more context.

## Installation

If you are in a Codespace, you can run `pip install -r requirements.txt`.

If you are running this locally, ensure you are using python 3.8.x, and then run:

```sh
python3 -m venv env
source ./env/bin/activate
pip3 install -r requirements.txt
```

### HTTPS

In order to run the server with HTTPS enabled, you need to make sure you have your own SSL certificate and private key. If you don't need to have it enabled, you can set the following environment variable:

```sh
export USE_HTTPS=false
```

Else you can use your certificate and private key, and set it on the code on main.py file

```python
   httpd.socket = ssl.wrap_socket(
      httpd.socket,
      keyfile="ssl/private.key",
      certfile='ssl/certificate.pem',
      server_side=True
   )
```

## Start

```sh
python main.py
```

## Open the browser

Go to [https://localhost:4443](https://localhost:4443)

## Add to your Data Map

You can test against this example live by adding it to [your Data Map](https://app.transcend.io/infrastructure/integrations/new?integrationName=server) and using [ngrok](https://ngrok.com/) to map your localhost to a live domain.


```sh
ngrok http --hostname=test-python.ngrok.io 4443
```
