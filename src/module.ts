import { PanelPlugin } from '@grafana/data';
import { Options } from './types';
import { TrackMapPanel } from './TrackMapPanel';

export const plugin = new PanelPlugin<Options>(TrackMapPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'apiKey',
      name: 'Api key',
      description: 'Insert the API key retrived from mapbox.com',
      defaultValue: '',
    })
    .addFieldNamePicker({
      path: 'lat_name',
      name: 'Latitude field name',
      description: 'Select the field name for latitude',
    })
    .addFieldNamePicker({
      path: 'lon_name',
      name: 'Longitude field name',
      description: 'Select the field name for longitude',
    })
    .addBooleanSwitch({
      path: 'has_value',
      name: 'Has value',
      description: 'Check if the map should have a value',
      category: ['Value'],
    })
    .addFieldNamePicker({
      showIf: (currOptions, data) => {
        return currOptions.has_value;
      },
      path: 'value_name',
      name: 'Value field name',
      description: 'Select the field name for value',
      category: ['Value'],
    })
    .addTextInput({
      path: 'style',
      name: 'Style',
      description: 'Insert the style for the map',
      defaultValue: 'mapbox://styles/mapbox/dark-v10',
    })
    .addColorPicker({
      showIf: (currOptions, data) => {
        return currOptions.has_value;
      },
      path: 'min_color',
      name: 'Min color',
      description: 'Select the color for the minimum value',
      defaultValue: '#00ff00',
      category: ['Value'],
    })
    .addColorPicker({
      showIf: (currOptions, data) => {
        return currOptions.has_value;
      },
      path: 'max_color',
      name: 'Max color',
      description: 'Select the color for the maximum value',
      defaultValue: '#ff0000',
      category: ['Value'],
    });
});
