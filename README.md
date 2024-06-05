# Magic Carpet - Location Spoofing for iOS 17

Forked from [kinesis](https://github.com/Siyuanw/kinesis)

Built with `pymobiledevice3` and `leaflet`.

## How to use

### Requirements

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

Have your device connected (**USB connection is required**)

Start project

```shell
sudo python3 src/main.py
```

Browse [http://127.0.0.1:5000](http://127.0.0.1:5000)

### Multi-Device Support

If you have multiple devices connected, you will be prompted to choose a device you want to connect to and the port the UI should be served from.
Make sure to only use unused ports as no check for that is in place.

## Features

- [x] Run with one-command
- [x] Multi-Device Support
- [x] Saved routes
- [x] Address search
- [x] Choose between 3 speeds & teleport
- [x] Location display
- [x] Realistic movement
- [x] Different route modes (U-Turn, Loop)
- [x] Persistent zoom and map center

## Contributing

Feel free to contribute to the repository but make sure to:

- keep code style the same
- give your PR a meaningful title and description

### Development Guide

#### Updating the UI

When adding or modifying classes in `index.html` you should regenerate the styles using this command:

```bash
npx tailwindcss -i ./input.css -o ./src/style.css --minify
```

---
