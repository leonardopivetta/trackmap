import { Options } from 'types';

function calcGradients(data: number[], options: Options) {
  const output = [];
  const min = data.reduce((p, i) => Math.min(p, i), Infinity);
  const max = data.reduce((p, i) => Math.max(p, i), -Infinity);
  const hex = function (x: number): string {
    const a = x.toString(16);
    return a.length === 1 ? '0' + a : a;
  };

  function computeColor(color: string) {
    let d = document.createElement('div');
    d.style.color = color;
    document.body.appendChild(d);
    return window.getComputedStyle(d).color;
  }

  const computedMin = computeColor(options.min_color)
    .split('(')[1]
    .split(')')[0]
    .split(',')
    .map((x) => parseInt(x.trim(), 10));
  const computedMax = computeColor(options.max_color)
    .split('(')[1]
    .split(')')[0]
    .split(',')
    .map((x) => parseInt(x.trim(), 10));

  for (let i = 0; i < data.length; i++) {
    output.push(i / data.length);
    const ratio = (data[i] - min) / (max - min);
    const r = Math.ceil(computedMin[0] * ratio + computedMax[0] * (1 - ratio));
    const g = Math.ceil(computedMin[1] * ratio + computedMax[1] * (1 - ratio));
    const b = Math.ceil(computedMin[2] * ratio + computedMax[2] * (1 - ratio));
    const middle = `#${hex(r)}${hex(g)}${hex(b)}`;

    output.push(middle.substring(0, 7));
  }
  return output;
}

export default calcGradients;
