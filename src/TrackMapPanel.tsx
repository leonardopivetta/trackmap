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
import { CalculatedData, Options } from 'types';
import {} from '@grafana/ui';
import mapboxgl, { GeoJSONSource, Map, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import smooth from 'utils/smooth';
import getLngLatCalcs from 'utils/calculateFields';

interface Props extends PanelProps<Options> {}

function setUpBaseMapBox(map: Map, options: Options) {
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
    },
  });

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

function setMapData(
  map: Map,
  lonSeries: Field<any, Vector<any>>,
  latSeries: Field<any, Vector<any>>,
  lonCalcs: FieldCalcs,
  latCalcs: FieldCalcs
) {
  function transpose(data: number[][]) {
    return data[0].map((_, i) => data.map((row) => row[i]));
  }

  // Applies the data to the source
  (map.getSource('route') as GeoJSONSource).setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: smooth(transpose([lonSeries.values.toArray(), latSeries.values.toArray()])),
    },
  });

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

  // Refresh the apiKey
  useEffect(() => {
    mapboxgl.accessToken = options.apiKey;
  }, [options]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | undefined>(undefined);
  const [calcData, setCalcData] = useState<CalculatedData>();

  // Updates the map data
  useEffect(() => {
    if (!map.current) return;
    if (!mergedDataFrame) return;
    if (!calcData) return;
    setMapData(map.current, calcData.lonSeries, calcData.latSeries, calcData.lonCalcs, calcData.latCalcs);
  }, [map, mergedDataFrame, options, calcData]);

  // Destructures the data merged and does all the calculations
  useEffect(() => {
    if (!mergedDataFrame) return;
    setCalcData(getLngLatCalcs(mergedDataFrame, options));
  }, [mergedDataFrame, options]);

  // Creates the map, applies the base styling (layers and sources) and merges the data from the series
  useLayoutEffect(() => {
    map.current = new Map({
      container: mapContainer.current?.id ?? '',
      style: options.style,
      accessToken: options.apiKey,
    });
    map.current!.on('load', () => {
      setUpBaseMapBox(map.current!, options);
      mergeDataframes(data.series, setMergedDataFrame);
    });

    return () => {
      // Cleanup
      map.current?.remove();
    };
  }, [mapContainer, map, options, data.series]);

  // Resize the map on panel resize
  useEffect(() => {
    map.current?.resize();
  }, [map, width, height]);

  return <div id="map" style={{ height: height, width: width }} ref={mapContainer}></div>;
};
