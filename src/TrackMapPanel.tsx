import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { DataFrame, DataTransformerID, PanelProps, transformDataFrame } from '@grafana/data';
import { Options } from 'types';
import {} from '@grafana/ui';
import mapboxgl, { GeoJSONSource, Map } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

function smooth(input: number[][]) {
  function copy(out: number[], a: number[]) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
  }
  var output = [];

  if (input.length > 0) {
    output.push(copy([0, 0], input[0]));
  }
  for (var i = 0; i < input.length - 1; i++) {
    var p0 = input[i];
    var p1 = input[i + 1];
    var p0x = p0[0],
      p0y = p0[1],
      p1x = p1[0],
      p1y = p1[1];

    var Q = [0.75 * p0x + 0.25 * p1x, 0.75 * p0y + 0.25 * p1y];
    var R = [0.25 * p0x + 0.75 * p1x, 0.25 * p0y + 0.75 * p1y];
    output.push(Q);
    output.push(R);
  }
  if (input.length > 1) {
    output.push(copy([0, 0], input[input.length - 1]));
  }
  return output;
}

interface Props extends PanelProps<Options> {}

const sampleCoordinates = [
  [12.55516, 45.99137, 10],
  [12.65406, 45.96577, 20],
  [12.72962, 45.8979, 0],
  [12.69528, 45.85102, 5],
  [12.54966, 45.82134, 2],
  [12.527, 45.824, 10],
  [12.45075, 45.90077, 20],
  [12.53043, 45.91512, 14],
  [12.55516, 45.99137, 10],
];

function setMapData(map: Map, data: number[][]) {
  (map.getSource('route') as GeoJSONSource).setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: smooth(sampleCoordinates),
    },
  });
}

function dataSeriesToCoordinates(data: DataFrame[]) {
  transformDataFrame([{ id: DataTransformerID.merge, options: {} }], data).subscribe((a) => {
    // console.log(a[0]);
    console.log(a[0].fields.find((f) => f.name.match('/[Ll]at/g')));
    console.table([a[0].fields[0].values.toArray(), a[0].fields[1].values.toArray(), a[0].fields[2].values.toArray()]);
  });
  // const x = mergeResults(data);
  // console.log(x);
  // x.forEach(frame => console.log);
  // dataFrameToJSON(mergeResults(data) ?? data[0]);
}

export const TrackMapPanel: React.FC<Props> = ({ options, data, width, height, eventBus }) => {
  if (data.series.length < 2) {
    throw Error('TrackMapPanel: eyou need at least 2 data series');
  }

  console.log(options.lat_name, options.lon_name);

  // Refresh the apiKey
  useEffect(() => {
    console.log(options);
    mapboxgl.accessToken = options.apiKey;
  }, [options]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | undefined>(undefined);
  const [lng] = useState(12.54966);
  const [lat] = useState(45.82134);
  const [zoom] = useState(8);
  useLayoutEffect(() => {
    map.current = new Map({
      container: mapContainer.current?.id ?? '',
      style: options.style,
      center: [lng, lat],
      zoom: zoom,
      accessToken: options.apiKey,
    });
    map.current!.on('load', () => {
      map.current!.addSource('route', {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
      setMapData(map.current!, sampleCoordinates);
      map.current!.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': 'red',
          'line-width': 8,
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#fbb03b', 0.5, '#1c1c1c', 1, '#fbb03b'],
        },
      });
    });
    dataSeriesToCoordinates(data.series);

    const marker = new mapboxgl.Marker({
      color: 'blue',
      draggable: false,
    });
    const coordinates = smooth(sampleCoordinates);
    function animate(timestamp: number) {
      // const lng0 = coordinates[Math.round(timestamp/500)%coordinates.length]

      const pos = Math.floor(timestamp / 500) % coordinates.length;

      // const pos = 0;
      const lng0 = coordinates[pos][0];
      const lng1 = coordinates[(pos + 1) % coordinates.length][0];

      const lat0 = coordinates[pos][1];
      const lat1 = coordinates[(pos + 1) % coordinates.length][1];

      const lng = lng0 + ((lng1 - lng0) * (timestamp % 500)) / 500;
      const lat = lat0 + ((lat1 - lat0) * (timestamp % 500)) / 500;

      marker.setLngLat([lng, lat]);
      requestAnimationFrame(animate);
    }
    marker.setLngLat([sampleCoordinates[0][0], sampleCoordinates[0][1]]).addTo(map.current);
    requestAnimationFrame(animate);
    // marker.addTo(map.current);
    map.current.resize();
    return () => {
      // Cleanup
      marker.remove();
      map.current?.remove();
    };
  }, [mapContainer, map, options, data.series, lat, lng, zoom]);

  // Resize the map on panel resize
  useEffect(() => {
    map.current?.resize();
  }, [map, width, height]);

  return <div id="map" style={{ height: height, width: width }} ref={mapContainer}></div>;
};
