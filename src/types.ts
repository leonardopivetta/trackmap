import { Field, FieldCalcs, Vector } from '@grafana/data';

export interface Options {
  apiKey: string;
  lat_name: string;
  lon_name: string;
  has_value: boolean;
  value_name: string;
  style: string;
}

export interface CalculatedData {
  lonSeries: Field<any, Vector<any>>;
  latSeries: Field<any, Vector<any>>;
  lonCalcs: FieldCalcs;
  latCalcs: FieldCalcs;
}