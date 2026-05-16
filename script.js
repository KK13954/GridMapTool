let map;
let directionsService;
let directionsRenderer;
let gridLines = [];
let autocompleteOrigin;
let autocompleteDestination;
let geocoder;
let infoWindow;
let clickMarker = null;
let isAuthorized = false;
let mapsLoaded = false;
const REQUIRED_PASSWORD = "iml2026";

console.log("Script.js: 初期化開始");

window.initMap = function () {
  console.log("initMap callback 呼ばれました");
  mapsLoaded = true;
  const mapError = document.getElementById("map-error");
  if (mapError) {
    mapError.classList.add("hidden");
  }
  setupAutocomplete();
  console.log("mapsLoaded:", mapsLoaded, "isAuthorized:", isAuthorized);
  if (isAuthorized) {
    console.log("Google Maps API 初期化開始");
    initializeMap();
  } else {
    console.log("isAuthorized が false のため、マップ初期化は保留中です。パスワード入力後に初期化されます。");
  }
};

window.gm_authFailure = function () {
  console.error("gm_authFailure: Google Maps API 認証失敗");
  showMapError(
    "❌ Google Maps API の認証に失敗しました。\n\nAPIキーが正しいか、制限設定（リファラー）を確認してください。\n\nGoogle Cloud Console で以下を有効にしてください：Maps JavaScript API、Places API (New)、Routes API。\n\nLive Server を使用中の場合、\"http://localhost:*\" を許可してください。"
  );
};

window.onMapsApiLoadError = function () {
  console.error("onMapsApiLoadError: Google Maps API 読み込み失敗");
  showMapError(
    "❌ Google Maps API の読み込みに失敗しました。\n\nネットワーク接続や APIキー を確認してください。ブラウザコンソールでエラー詳細を確認してください。"
  );
};

function showMapError(message) {
  console.log("showMapError:", message);
  const errorOverlay = document.getElementById("map-error");
  const errorText = document.getElementById("map-error-text");
  if (errorOverlay && errorText) {
    errorText.textContent = message;
    errorText.style.whiteSpace = "pre-wrap";
    errorOverlay.classList.remove("hidden");
  } else {
    console.error("エラーオーバーレイエレメントが見つかりません");
    console.error(message);
  }
}

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
      strokeColor: "#f0762f",
      strokeOpacity: 0.85,
      strokeWeight: 6,
    },
    suppressMarkers: false,
  });

  geocoder = new google.maps.Geocoder();
  infoWindow = new google.maps.InfoWindow();

  map.addListener("click", (event) => {
    placeMarkerAndShowInfo(event.latLng);
  });

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

function setupAutocomplete() {
  if (!google || !google.maps || !google.maps.places) {
    console.warn("Places ライブラリが利用できません。Autocomplete を初期化できません。");
    return;
  }

  if (autocompleteOrigin && autocompleteDestination) {
    return;
  }

  const originInput = document.getElementById("origin-input");
  const destinationInput = document.getElementById("destination-input");

  autocompleteOrigin = createAutocompleteElement(originInput);
  autocompleteDestination = createAutocompleteElement(destinationInput);

  autocompleteOrigin.addListener("place_changed", () => {
    const place = autocompleteOrigin.getPlace();
    if (place && place.formatted_address) {
      originInput.value = place.formatted_address;
    }
  });

  autocompleteDestination.addListener("place_changed", () => {
    const place = autocompleteDestination.getPlace();
    if (place && place.formatted_address) {
      destinationInput.value = place.formatted_address;
    }
  });
}

function createAutocompleteElement(inputElement) {
  const options = {
    fields: ["formatted_address", "geometry", "name"],
    componentRestrictions: { country: "jp" },
  };

  if (google.maps.places.PlaceAutocompleteElement) {
    return new google.maps.places.PlaceAutocompleteElement({
      input: inputElement,
      ...options,
    });
  }

  return new google.maps.places.Autocomplete(inputElement, options);
}

function placeMarkerAndShowInfo(latLng) {
  if (!map) {
    return;
  }

  if (clickMarker) {
    clickMarker.setMap(null);
  }

  clickMarker = new google.maps.Marker({
    position: latLng,
    map: map,
  });

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "選択した地点";
  const coords = document.createElement("p");
  coords.textContent = `緯度: ${latLng.lat().toFixed(6)}, 経度: ${latLng.lng().toFixed(6)}`;
  content.appendChild(title);
  content.appendChild(coords);

  if (geocoder) {
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results[0]) {
        const address = document.createElement("p");
        address.textContent = results[0].formatted_address;
        content.appendChild(address);
      }
      infoWindow.setContent(content);
      infoWindow.open(map, clickMarker);
    });
  } else {
    infoWindow.setContent(content);
    infoWindow.open(map, clickMarker);
  }
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
        infoBox.value = `この経路に沿った所要時間: ${route.duration.text}\nこの経路に沿った距離: ${route.distance.text}`;
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
      strokeColor: "#2563eb",
      strokeOpacity: 0.7,
      strokeWeight: 1.8,
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
      strokeColor: "#2563eb",
      strokeOpacity: 0.7,
      strokeWeight: 1.8,
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
    console.log("パスワード入力: 検証中");

    if (password === REQUIRED_PASSWORD) {
      console.log("パスワード認証成功");
      isAuthorized = true;
      document.getElementById("auth-overlay").classList.add("hidden");
      document.querySelector(".app-shell").classList.remove("hidden");
      errorText.textContent = "";
      const mapError = document.getElementById("map-error");
      if (mapError) {
        mapError.classList.add("hidden");
      }
      if (mapsLoaded) {
        console.log("mapsLoaded が true のため、initializeMap を呼び出します");
        initializeMap();
      } else {
        console.log("mapsLoaded が false のため、API の読み込みを待機中です");
      }
      passwordInput.value = "";
      return;
    }

    console.log("パスワード認証失敗");
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
  console.log("DOMContentLoaded: 認証セットアップ開始");
  setupAuthentication();
  console.log("Google Maps API 読み込み中...");
});
