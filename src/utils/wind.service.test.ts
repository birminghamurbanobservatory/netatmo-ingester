import {kilometrePerHourToMetresPerSecond} from './wind.service';

describe('Testing kilometrePerHourToMetresPerSecond function', () => {

  test('Should convert 0 kph correctly', () => {
    const input = 0;
    const expected = 0;
    const result = kilometrePerHourToMetresPerSecond(input);
    expect(result).toBe(expected);
  });

  test('Should convert 10 kph correctly', () => {
    const input = 10;
    const expected = 2.8;
    const result = kilometrePerHourToMetresPerSecond(input);
    expect(result).toBe(expected);
  });

  test('Should convert 100 kph correctly', () => {
    const input = 100;
    const expected = 27.8;
    const result = kilometrePerHourToMetresPerSecond(input);
    expect(result).toBe(expected);
  });

});