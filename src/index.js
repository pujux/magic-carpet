const socket = io();

/* Utility functions */

const randomFactor = 0.2;
const randomize = (x) => x * (1 + randomFactor * (Math.random() * 2 - 1)); // 20% random variation

const getConfig = (key, fallback) => {
  const value = localStorage.getItem(`${configPrefix}${key}`);
  return value || (saveConfig(key, fallback), fallback);
};

const saveConfig = (key, value) => {
  localStorage.setItem(`${configPrefix}${key}`, value);
};

/* Configuration */

const configPrefix = "kinesis-";
const maxZoom = 18;
const tickInterval = 1000; // 1 second
const initialCenter = L.latLng(getConfig("latitude", 53.338228), getConfig("longitude", -6.259323));
const searchConfig = {
  showMarker: false,
  showPopup: true,
  retainZoomLevel: true,
  autoClose: true,
  searchLabel: "Enter address or coordinates",
};

/* Initial map setup */

const map = L.map("map", {
  center: initialCenter,
  zoom: getConfig("zoom", 12),
  doubleClickZoom: false,
});

L.tileLayer("//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const path = L.polyline([], { color: "red" }).addTo(map);

const searchControl = new window.GeoSearch.GeoSearchControl({
  provider: new window.GeoSearch.OpenStreetMapProvider(),
  ...searchConfig,
});

map.addControl(searchControl);
map.on("geosearch/showlocation", (result) => addMarkerOrStep({ latlng: { lat: result.location.y, lng: result.location.x } }));

/* Movement and marker handlers */

let marker = null; // the real spoofed location
let markerShadowPos = null; // the shadow location used to calculate movement on path
let markerLastPos = null; // used to save last real position when dragging marker
let stepIndex = 0;
let speed = 2.5; // walking speed
let routeMode = "off";
let pause = false;

/* Event listeners */

document.getElementById("saveRouteButton").addEventListener("click", saveRoute);
document.getElementById("loadRouteButton").addEventListener("click", loadRoute);
document.getElementById("undoButton").addEventListener("click", deleteStep);
document.getElementById("stopButton").addEventListener("click", clearSteps);
document.getElementById("pauseSwitch").addEventListener("change", (e) => (pause = e.currentTarget.checked));
document.getElementsByName("speedChoice").forEach((element) => element.addEventListener("click", () => (speed = element.value)));
document.getElementsByName("routeModeChoice").forEach((element) => element.addEventListener("click", () => (routeMode = element.value)));

map.on("click", addMarkerOrStep);
map.on("zoomend", () => saveConfig("zoom", map.getZoom()));
map.on("moveend", () => {
  const center = map.getCenter();
  saveConfig("latitude", center.lat);
  saveConfig("longitude", center.lng);
});

/* Marker and path functions */

function addMarkerOrStep({ latlng }) {
  // init main marker if it doesnt exist
  if (!marker) {
    marker = L.marker(latlng, { draggable: true });
    if (tryTeleport(latlng)) {
      marker.addTo(map);
      marker.on("mousedown", (event) => (markerLastPos = event.latlng));
      marker.on("mouseup", (event) => {
        // check if user wants to teleport and reset marker if not
        if (!tryTeleport(event.latlng)) {
          marker.setLatLng(markerLastPos);
        }
      });
    } else {
      marker = null;
    }
  } else {
    path.addLatLng(latlng);
  }
}

function tryTeleport(latlng) {
  const confirmTeleport = confirm("Teleport?");
  if (!confirmTeleport) return false;

  marker.setLatLng(latlng); // teleport to location
  markerShadowPos = latlng;
  sendLocation(latlng);
  clearSteps();
  return true;
}

function sendLocation(latlng) {
  const locationString = `${latlng.lat},${latlng.lng}`;
  console.info(`Emitting location: ${locationString}`);
  socket.emit("location", locationString);
}

function saveRoute() {
  const routeName = prompt("Route name");
  if (!routeName) return;
  const pathLatLngs = path.getLatLngs();
  saveConfig(`route-${routeName}`, JSON.stringify(pathLatLngs));
}

function loadRoute() {
  const routeName = prompt("Route name");
  try {
    const route = JSON.parse(getConfig(`route-${routeName}`));
    clearSteps();
    path.setLatLngs(route);
  } catch (e) {
    console.error(e);
  }
}

function deleteStep() {
  const pathLatLngs = path.getLatLngs();
  if (stepIndex < pathLatLngs.length - 1) {
    pathLatLngs.pop();
    path.setLatLngs(pathLatLngs);
  }
}

function clearSteps() {
  if (marker) {
    path.setLatLngs([marker.getLatLng()]);
    stepIndex = 0;
  }
}

/* Start moving */

function moveTowards(target, distance) {
  if (distance) {
    const start = markerShadowPos;
    const newPos = geolib.computeDestinationPoint(start, distance, geolib.getGreatCircleBearing(start, target));
    const newLatlng = L.latLng(newPos.latitude, newPos.longitude);

    // if target is closer than distance, just move to target
    if (map.distance(start, target) < map.distance(start, newLatlng)) {
      markerShadowPos = target;
    } else {
      markerShadowPos = newLatlng;
    }
  }

  // move 20% of distance in random direction
  const randomLocation = geolib.computeDestinationPoint(markerShadowPos, distance * randomFactor, Math.random() * 360);
  const randomLatLng = L.latLng(randomLocation.latitude, randomLocation.longitude);

  sendLocation(randomLatLng);
  marker.setLatLng(randomLatLng);
}

function navigate() {
  if (!marker) return;

  if (pause) {
    moveTowards(marker.getLatLng(), 0);
    return;
  }

  const pathLatLngs = path.getLatLngs();

  // if there is something to move to
  if (stepIndex < pathLatLngs.length) {
    const stepLatlng = pathLatLngs[stepIndex];
    // check if we're already at the goal
    if (stepLatlng.equals(markerShadowPos)) {
      // check if it's last step
      if (stepIndex >= pathLatLngs.length - 1) {
        switch (routeMode) {
          case "loop":
            stepIndex = 0;
            break;
          case "uturn":
            path.setLatLngs(path.getLatLngs().reverse());
            stepIndex = 0;
            break;
          default:
            moveTowards(marker.getLatLng(), 0);
            break;
        }
      } else {
        stepIndex++; // proceed with next step
      }
    } else {
      moveTowards(stepLatlng, (randomize(speed) * tickInterval) / 1000);
    }
  }
}

setInterval(navigate, tickInterval);
