import convert from 'convert-units';
import {round} from 'lodash';


export function kilometrePerHourToMetresPerSecond(kph: number): number {

  const converted = convert(kph).from('km/h').to('m/s');
  const nDecimalPlaces = 1;
  const rounded = round(converted, nDecimalPlaces);
  return rounded;

}