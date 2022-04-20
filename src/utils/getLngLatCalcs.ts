import { DataFrame, reduceField } from '@grafana/data';
import { CalculatedData, Options } from 'types';

function getLngLatCalcs(merged: DataFrame, options: Options): CalculatedData {
  const lat = merged.fields.find((i) => i.name === options.lat_name)!;
  const lon = merged.fields.find((i) => i.name === options.lon_name)!;

  const latCalcs = reduceField({
    field: lat,
    reducers: ['mean'],
  });
  const lonCalcs = reduceField({
    field: lon,
    reducers: ['mean'],
  });

  return { lonSeries: lon, latSeries: lat, lonCalcs: lonCalcs, latCalcs: latCalcs };
}

export default getLngLatCalcs;
