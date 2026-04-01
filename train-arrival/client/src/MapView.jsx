import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style'
import 'ol/ol.css'

export default function MapView({ marker, onMapClick }) {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const markerSourceRef = useRef(null)

  useEffect(() => {
    if (!mapElement.current) return

    const markerSource = new VectorSource()
    markerSourceRef.current = markerSource

    const markerLayer = new VectorLayer({
      source: markerSource
    })

    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        markerLayer
      ],
      view: new View({
        center: fromLonLat([50.1503, 53.1959]),
        zoom: 8
      })
    })

    map.on('click', event => {
      const [lng, lat] = toLonLat(event.coordinate)
      onMapClick({ lat, lng })
    })

    mapRef.current = map

    setTimeout(() => {
      map.updateSize()
    }, 100)

    return () => {
      map.setTarget(undefined)
    }
  }, [onMapClick])

  useEffect(() => {
    if (!marker || !markerSourceRef.current || !mapRef.current) return

    markerSourceRef.current.clear()

    const feature = new Feature({
      geometry: new Point(fromLonLat([marker.lng, marker.lat]))
    })

    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#ef4444' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })
    )

    markerSourceRef.current.addFeature(feature)
    mapRef.current.getView().animate({
      center: fromLonLat([marker.lng, marker.lat]),
      zoom: 11,
      duration: 400
    })
  }, [marker])

  return <div ref={mapElement} className="map" />
}