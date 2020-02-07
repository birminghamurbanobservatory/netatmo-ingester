import {Region} from './region.class';
import {calculateWindows} from './windows-calculator';


describe('Testing windows calculator', () => {

  test('Correctly calculates windows', () => {
    
    const region: Region = {
      north: 52.51,
      south: 52.34,
      west: -2.09,
      east: -1.82,
      maxWindowWidth: 0.1
    };

    const expectedWindows = [
      {
        north: 52.44,
        south: 52.34,
        west: -2.09,
        east: -1.99
      },
      {
        north: 52.44,
        south: 52.34,
        west: -1.99,
        east: -1.89
      },
      {
        north: 52.44,
        south: 52.34,
        west: -1.89,
        east: -1.82
      },
      {
        north: 52.51,
        south: 52.44,
        west: -2.09,
        east: -1.99
      },
      {
        north: 52.51,
        south: 52.44,
        west: -1.99,
        east: -1.89
      },
      {
        north: 52.51,
        south: 52.44,
        west: -1.89,
        east: -1.82
      },
    ];

    const windows = calculateWindows(region);
    expect(windows).toEqual(expectedWindows);


  });

});