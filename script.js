let map;
let directionsService;
let directionsRenderer;
let gridLines = [];
let autocompleteOrigin;
let autocompleteDestination;
let isAuthorized = false;
let mapsLoaded = false;
const REQUIRED_PASSWORD = "iml2026";

window.initMap = function () {
  mapsLoaded = true;
  if (isAuthorized) {
    initializeMap();
  }
};

function initializeMap() {
  if (map) {
    return;
  }

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.6895, lng: 139.6917 },
    zoom: 12,
    streetViewControl: false,
    mapTypeControl: false,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    polylineOptions: {
      strokeColor: "#1d4ed8",
      strokeOpacity: 0.85,
      strokeWeight: 6,
    },
    suppressMarkers: false,
  });

  autocompleteOrigin = new google.maps.places.Autocomplete(
    document.getElementById("origin-input"),
    { fields: ["formatted_address", "geometry"] }
  );
  autocompleteDestination = new google.maps.places.Autocomplete(
    document.getElementById("destination-input"),
    { fields: ["formatted_address", "geometry"] }
  );

  document.getElementById("search-route").addEventListener("click", () => {
    searchRoute();
  });

  document.getElementById("grid-size").addEventListener("change", () => {
    drawGrid();
  });

  map.addListener("idle", () => {
    drawGrid();
  });
}

function searchRoute() {
  const origin = document.getElementById("origin-input").value.trim();
  const destination = document.getElementById("destination-input").value.trim();
  const infoBox = document.getElementById("route-info");

  if (!origin || !destination) {
    infoBox.value = "出発地と目的地の両方を入力してください。";
    return;
  }

  directionsService.route(
    {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
        const route = result.routes[0].legs[0];
        infoBox.value = `所要時間: ${route.duration.text}\n距離: ${route.distance.text}`;
        map.fitBounds(result.routes[0].bounds);
      } else {
        infoBox.value = `経路検索に失敗しました: ${status}`;
      }
    }
  );
}

function clearGrid() {
  gridLines.forEach((line) => line.setMap(null));
  gridLines = [];
}

function drawGrid() {
  clearGrid();

  const gridSize = Number(document.getElementById("grid-size").value);
  if (gridSize <= 0) {
    return;
  }

  const bounds = map.getBounds();
  if (!bounds) {
    return;
  }

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const centerLat = map.getCenter().lat();

  const metersPerDegLat = 111000;
  const metersPerDegLng = Math.cos((centerLat * Math.PI) / 180) * 111000;
  const latStep = gridSize / metersPerDegLat;
  const lngStep = gridSize / metersPerDegLng;

  const startLat = Math.floor(sw.lat() / latStep) * latStep;
  const endLat = Math.ceil(ne.lat() / latStep) * latStep;
  const startLng = Math.floor(sw.lng() / lngStep) * lngStep;
  const endLng = Math.ceil(ne.lng() / lngStep) * lngStep;

  for (let lat = startLat; lat <= endLat; lat += latStep) {
    const line = new google.maps.Polyline({
      path: [
        { lat: lat, lng: startLng },
        { lat: lat, lng: endLng },
      ],
      strokeColor: "#94a3b8",
      strokeOpacity: 0.45,
      strokeWeight: 1,
      clickable: false,
      map: map,
    });
    gridLines.push(line);
  }

  for (let lng = startLng; lng <= endLng; lng += lngStep) {
    const line = new google.maps.Polyline({
      path: [
        { lat: startLat, lng: lng },
        { lat: endLat, lng: lng },
      ],
      strokeColor: "#94a3b8",
      strokeOpacity: 0.45,
      strokeWeight: 1,
      clickable: false,
      map: map,
    });
    gridLines.push(line);
  }
}

function setupAuthentication() {
  const unlockButton = document.getElementById("unlock-button");
  const passwordInput = document.getElementById("password-input");

  const unlock = () => {
    const password = passwordInput.value.trim();
    const errorText = document.getElementById("auth-error");

    if (password === REQUIRED_PASSWORD) {
      isAuthorized = true;
      document.getElementById("auth-overlay").classList.add("hidden");
      document.querySelector(".app-shell").classList.remove("hidden");
      errorText.textContent = "";
      if (mapsLoaded) {
        initializeMap();
      }
      passwordInput.value = "";
      return;
    }

    errorText.textContent = "パスワードが正しくありません。もう一度入力してください。";
  };

  unlockButton.addEventListener("click", unlock);
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlock();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupAuthentication();
});
