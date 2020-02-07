# Python

## Installation

```sh
python3 -m venv env
source ./env/bin/activate
pip3 install -r requirements.txt
```

## Start

```sh
python main.py
```

## Open the browser

Go to [https://localhost:4443](https://localhost:4443)

## Add to your datamap

You can test against this example live by adding it to [your datamap](https://app.transcend.io/data-map/silos?integrationName=server) and using [ngrok](https://ngrok.com/) to map your localhost to a live domain.

```sh
ngrok http -hostname=test-python.ngrok.io 4443
```
