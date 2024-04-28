# Magic Carpet - Location Spoofing for iOS 17

Forked from [kinesis](https://github.com/Siyuanw/kinesis)

Built with `pymobiledevice3` and `leaflet`.

## How to use

#### Requirements

- Python version **3.11.x**
- iOS Device in [developer mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)

It's recommended to use a [virtual environment](https://docs.python.org/3/tutorial/venv.html)

```shell
python3 -m venv ./.venv
source ./.venv/bin/activate
```

Install python dependencies

```shell
pip3 install -r requirements.txt
```

Have your device connected, **USB connection is required**

Start project

```shell
sudo python3 src/main.py
```

Browse [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Features

- [x] Run with one-command
- [x] Choose between 3 speeds & teleport
- [x] Location display
- [x] Address search
- [x] Realistic movement
- [x] Different route modes (U-Turn, Loop)
- [x] Persistent zoom and map center
- [x] Saved routes
