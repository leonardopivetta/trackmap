import { PanelPlugin } from '@grafana/data';
import { Options } from './types';
import { TrackMapPanel } from './TrackMapPanel';

export const plugin = new PanelPlugin<Options>(TrackMapPanel).setPanelOptions((builder) => {
  return builder.addTextInput({
    path: 'apiKey',
    name: 'Api key',
    description: 'Insert the API key retrived from mapbox.com',
    defaultValue: '',
  });
});
