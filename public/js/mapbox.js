// DOM Element
const mapBox = document.getElementById("map");

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  mapboxgl.accessToken =
    "pk.eyJ1IjoibmF2bmVldG1haGFyaXNoaSIsImEiOiJjbDFqZGEwNWgwOGFnM2trMXE2Zmkyd3JnIn0.4iV7JhBZYzLPsB35Xx8bEg";

  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
  });
}
