import { Options } from 'types';

function calcGradients(data: number[], options: Options) {
  const output = [];
  const min = data.reduce((p, i) => Math.min(p, i), Infinity);
  const max = data.reduce((p, i) => Math.max(p, i), -Infinity);
  const hex = function (x: number): string {
    let a = x.toString(16);
    return a.length === 1 ? '0' + x : a;
  };
  const min_color = options.min_color.substring(1);
  const max_color = options.max_color.substring(1);
  for (let i = 0; i < data.length; i++) {
    output.push(i / data.length);
    let ratio = (data[i] - min) / (max - min);
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

export default calcGradients;
