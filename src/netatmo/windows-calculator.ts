import {Region} from './region.class';
import {round} from 'lodash';



export function calculateWindows(region: Region): object[] {

  const lons = [];
  const lats = [];
  const windows = [];
  const precision = 4;

  let bottomEdge = region.south;
  while (bottomEdge < region.north) {
    lats.push(bottomEdge);
    bottomEdge = round(bottomEdge + region.maxWindowWidth, precision);
  }
  lats.push(region.north);
  
  let leftEdge = region.west;
  while (leftEdge < region.east) {
    lons.push(leftEdge);
    leftEdge = round(leftEdge + region.maxWindowWidth, precision);
  }
  lons.push(region.east);  


  // Starts with the south west corner
  lats.forEach((lat, latIdx) => {
    if (latIdx < lats.length - 1) {
      lons.forEach((lon, lonIdx) => {
        if (lonIdx < lons.length - 1) {
          windows.push({
            north: lats[latIdx + 1],
            south: lat,
            west: lon,
            east: lons[lonIdx + 1]
          });
        }
      });
    }
  });

  return windows;

}