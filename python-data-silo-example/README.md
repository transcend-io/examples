## Python Server Silo Example

A standalone example of a working server silos integrated with Transcend, written in Python 3.

### Installation

```
python3 -m venv env
source ./env/bin/activate 
pip3 install -r requirements.txt
```

### Create and trust a sample SSL certificate

NOTE: The trust certificate script is intended for mac usage, you will need to manually trust the certificate otherwise.

```
./create_certificate.sh
./trust_certificate.sh
```

## Start the server

```
python3 main.py 
```

## Open the browser

Go to [https://localhost:4443](https://localhost:4443)
