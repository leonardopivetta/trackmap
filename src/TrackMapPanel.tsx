import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import {
  DataFrame,
  DataHoverClearEvent,
  DataHoverEvent,
  DataTransformerID,
  Field,
  FieldCalcs,
  getDataFrameRow,
  PanelProps,
  transformDataFrame,
  Vector,
} from '@grafana/data';
import { Options } from 'types';
import {} from '@grafana/ui';
import mapboxgl, { Map, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import smooth from 'utils/smooth';
import getLngLatCalcs from 'utils/calculateFields';

interface Props extends PanelProps<Options> {}

function calcGradients(data: number[], options: Options) {
  const output = [];
  const min = data.reduce((p, i) => Math.min(p, i), Infinity);
  const max = data.reduce((p, i) => Math.max(p, i), -Infinity);
  const hex = function (x: number): string {
    let a = x.toString(16);
    return a.length == 1 ? '0' + x : a;
  };
  const min_color = options.min_color.substring(1);
  const max_color = options.max_color.substring(1);
  for (let i = 0; i < data.length; i++) {
    output.push(i / data.length);
    let ratio = (data[i] - min) / max;
    let r = Math.ceil(
      parseInt(min_color.substring(0, 2), 16) * ratio + parseInt(max_color.substring(0, 2), 16) * (1 - ratio)
    );
    let g = Math.ceil(
      parseInt(min_color.substring(2, 4), 16) * ratio + parseInt(max_color.substring(2, 4), 16) * (1 - ratio)
    );
    let b = Math.ceil(
      parseInt(min_color.substring(4, 6), 16) * ratio + parseInt(max_color.substring(4, 6), 16) * (1 - ratio)
    );

    var middle = `#${hex(r)}${hex(g)}${hex(b)}`;

    output.push(middle.substring(0, 7));
  }
  return output;
}

function setUpBaseMapBox(map: Map) {
  if (!map.getSource('route')) {
    map.addSource('route', {
      type: 'geojson',
      lineMetrics: true,
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });
  }
  if (!map.getLayer('route')) {
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'white',
        'line-width': 8,
      },
    });
  }
}

// Updates the gradient based on the array passed
function setMapGradient(map: Map, gradient: (string | number)[]) {
  const paint = ['interpolate', ['linear'], ['line-progress'], ...gradient];
  const layer = map.getLayer('route');
  if (!layer) return;
  map.setPaintProperty(layer.id, 'line-gradient', paint);
}

function setMapData(
  map: Map,
  lonSeries: Field<any, Vector<any>>,
  latSeries: Field<any, Vector<any>>,
  lonCalcs: FieldCalcs,
  latCalcs: FieldCalcs
) {
  if (!map.getSource('route')) throw Error('No source found');
  function transpose(data: number[][]) {
    return data[0].map((_, i) => data.map((row) => row[i]));
  }
  // Applies the data to the source
  const source = map.getSource('route');
  if (source?.type === 'geojson') {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: smooth(transpose([lonSeries.values.toArray(), latSeries.values.toArray()])),
      },
    });
  }

  // Fits the map to show all the route
  map.fitBounds([
    [lonCalcs['min'], latCalcs['min']],
    [lonCalcs['max'], latCalcs['max']],
  ]);
}

function mergeDataframes(data: DataFrame[], setMerged: (data: DataFrame) => void) {
  transformDataFrame([{ id: DataTransformerID.merge, options: {} }], data).subscribe((out) => {
    if (out.length === 0) return;
    setMerged(out[0]);
  });
}

export const TrackMapPanel: React.FC<Props> = ({ options, data, width, height, eventBus }) => {
  if (data.series.length < 2) {
    throw Error('TrackMapPanel: eyou need at least 2 data series');
  }

  // Merged data from latitude and longitude series (and possibily also value);
  const [mergedDataFrame, setMergedDataFrame] = useState<DataFrame>();

  // Marker to show the current hovered point
  setUpDataHover();

  // Refresh the apiKey
  useEffect(() => {
    mapboxgl.accessToken = options.apiKey;
  }, [options.apiKey]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map>();

  const [loaded, setLoaded] = useState(false);

  // When the data changes, merge into one dataframe
  useEffect(() => {
    mergeDataframes(data.series, setMergedDataFrame);
  }, [data.series]);

  // Destructures the data merged and does all the calculations
  useEffect(() => {
    if (!mergedDataFrame) return;
    if (!map.current) return;
    // setCalcData(getLngLatCalcs(mergedDataFrame, options));
    if (!options.has_value) return;
  }, [mergedDataFrame, options, map]);

  // Creates the map, applies the base styling (layers and sources) and merges the data from the series
  useLayoutEffect(() => {
    if (!mapContainer.current) throw Error('No map container found');
    map.current = new Map({
      container: mapContainer.current.id,
    });
    setLoaded(false);
    map.current.on('load', () => {
      setLoaded(true);
    });
    return () => {
      // Cleanup
      map.current?.remove();
    };
  }, [mapContainer]);

  useEffect(() => {
    map.current?.setStyle(options.style);
  }, [options.style]);

  useEffect(() => {
    if (!map.current) return;
    if (!loaded) return;
    if (!mergedDataFrame) return;
    setUpBaseMapBox(map.current);
    let _calcData = getLngLatCalcs(mergedDataFrame!, options);
    setMapData(map.current!, _calcData.lonSeries, _calcData.latSeries, _calcData.lonCalcs, _calcData.latCalcs);
    if (options.has_value) {
      let valueSeries = mergedDataFrame.fields.find((i) => i.name === options.value_name);
      if (!valueSeries) throw Error("TrackMapPanel: Can't find the value series");
      let gradientArray = calcGradients(valueSeries.values.toArray(), options);
      setMapGradient(map.current, gradientArray);
    }
  }, [map.current, mergedDataFrame, options, loaded]);

  // Resize the map on panel resize
  useEffect(() => {
    map.current?.resize();
  }, [map, width, height]);

  return <div id="map" style={{ height: height, width: width }} ref={mapContainer}></div>;

  function setUpDataHover() {
    const marker = new Marker({
      color: 'blue',
      draggable: false,
    });

    eventBus.subscribe(DataHoverEvent, (event) => {
      if (!mergedDataFrame) return;
      if (!map.current) return;
      if (!event.payload.rowIndex) return;

      // indexes of Value
      let indexOfValue = undefined;
      if (options.has_value) {
        indexOfValue = mergedDataFrame.fields.findIndex((i) => i.name === options.value_name);
      }
      const indexOfLon = mergedDataFrame.fields.findIndex((i) => i.name === options.lon_name);
      const indexOfLat = mergedDataFrame.fields.findIndex((i) => i.name === options.lat_name);

      const row = getDataFrameRow(mergedDataFrame, event.payload.rowIndex);

      marker.setLngLat([row[indexOfLon], row[indexOfLat]]);
      if (options.has_value) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(`${row[indexOfValue!]}`));
        marker.togglePopup();
      }

      marker.addTo(map.current);
    });

    eventBus.subscribe(DataHoverClearEvent, (event) => {
      marker.remove();
    });
  }
};
