import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import "ol/ol.css";

function getSourceOfVectorLayerByName(mapObject, layerName) {
  if (!mapObject) return null;
  const layer = mapObject
    .getAllLayers()
    .find((l) => l.get("name") === layerName);
  if (!layer) return null;
  return layer.getSource();
}

export default function MapView({ markers, onMapClick }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapElement.current) return;

    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({
      source: markerSource,
      // даём имя слою
      properties: { name: "markers-layer" },
    });

    const map = new Map({
      target: mapElement.current,
      layers: [new TileLayer({ source: new OSM() }), markerLayer],
      view: new View({
        center: fromLonLat([50.1503, 53.1959]),
        zoom: 9,
      }),
    });

    map.on("click", (event) => {
      const [lng, lat] = toLonLat(event.coordinate);
      onMapClick({ lat, lng });
    });

    mapRef.current = map;

    setTimeout(() => {
      map.updateSize();
    }, 100);

    return () => {
      map.setTarget(undefined);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerSource = getSourceOfVectorLayerByName(map, "markers-layer");
    if (!markerSource) return;

    markerSource.clear();

    if (!markers || !markers.length) return;

    markers.forEach((m) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([Number(m.lng), Number(m.lat)])),
      });
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "#ef4444" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        }),
      );
      markerSource.addFeature(feature);
    });

    const first = markers[0];
    map.getView().animate({
      center: fromLonLat([Number(first.lng), Number(first.lat)]),
      zoom: 11,
      duration: 400,
    });
  }, [markers]);

  return <div ref={mapElement} className="map" />;
}
