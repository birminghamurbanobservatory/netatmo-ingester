import {Credentials} from '../netatmo/credentials.class';
import {Region} from '../netatmo/region.class';
import {getAccessToken, getPublicData} from '../netatmo/netatmo.service';
import * as logger from 'node-logger';
import {calculateWindows} from '../netatmo/windows-calculator';
import * as Promise from 'bluebird';
import {pick} from 'lodash';
import * as check from 'check-types';


export async function ingestPublicData(credentials: Credentials, region: Region): Promise<any> {

  // Get access token
  const accessToken = await getAccessToken(credentials);

  logger.debug(`Got access token`, {accessToken});
  
  // Calculate the windows
  // Because the netatmo api will often exclude netatmo stations when there are many in a certain region or you are looking at a large spatial area, therefore its important run the getPublicData request over several smaller windows that together make up the full region of interest.
  const windows = calculateWindows(region);
  logger.debug(`Using ${windows.length} windows`);

  await Promise.mapSeries(windows, async (window, wIdx) => {

    logger.debug(`Processing window ${wIdx} of ${windows.length}.`);

    const publicData = await getPublicData({
      accessToken,
      latNE: region.north,
      latSW: region.south,
      lonNE: region.east,
      lonSW: region.west
    });

    // logger.debug(publicData);

    const reformatted = reformatPublicData(publicData);

    // Exclude any outside of the window
    const devices = reformatted.filter((device) => {
      return device.location.lat <= window.north &&
        device.location.lat >= window.south &&
        device.location.lon >= window.west &&
        device.location.lon <= window.east;
    });


    // Need to loop through each device individually, checking to see if we have a latest document for it, from which we can work out if any of the sensor observations are new. If so we'll need to update the document, potentially calculating the rain-accumulation and rain-rate from the daily_accumulation, then publish any new observations to the event stream.
    devices.forEach((device) => {


      // TODO: don't forget to add a UUID if this location is new.

    });


    // In terms of keeping the Netatmo location up to date in the sensor-deployment-manager, it's probably worth updating the sensor-deployment-manager so that any sensor can update a platform's location, just so long as the observation has a location object. The trade-off of this approach as opposed to creating a fake netatmo location sensor is that you won't have a history of locations, but given how rarely netatmo's move this shouldn't be an issue.

    // Add a short delay to help reduce the chance of hitting the api rate limits
    await Promise.delay(300);

    return;

  });


}


export function reformatPublicData(publicData): any {
  return publicData.map(reformatPublicDataSingleDevice);
}


export function reformatPublicDataSingleDevice(data): any {

  const reformatted = {
    deviceId: data._id,
    location: {
      lat: data.place.location[1],
      lon: data.place.location[0]
    },
    extras: pick(data.place, ['timezone', 'country', 'altitude', 'city', 'street']),
    sensors: []
  };

  Object.keys(data.measures).forEach((moduleId) => {
    
    const moduleData = data.measures[moduleId];

    // Temperature
    if (moduleData.type && moduleData.type.includes('temperature')) {
      const idx =  moduleData.type.indexOf('temperature');
      const timeStr = Object.keys(moduleData.res)[0];
      reformatted.sensors.push({
        moduleId,
        type: 'temperature',
        temperature: moduleData.res[timeStr][idx],
        time: new Date(Number(timeStr) * 1000)
      });
    }

    // Humidity
    if (moduleData.type && moduleData.type.includes('humidity')) {
      const idx =  moduleData.type.indexOf('humidity');
      const timeStr = Object.keys(moduleData.res)[0];
      reformatted.sensors.push({
        moduleId,
        type: 'humidity',
        humidity: moduleData.res[timeStr][idx],
        time: new Date(Number(timeStr) * 1000)
      });
    }

    // Pressure
    if (moduleData.type && moduleData.type.includes('pressure')) {
      const idx =  moduleData.type.indexOf('pressure');
      const timeStr = Object.keys(moduleData.res)[0];
      reformatted.sensors.push({
        moduleId,
        type: 'pressure',
        pressure: moduleData.res[timeStr][idx],
        time: new Date(Number(timeStr) * 1000)
      });
    }

    // Wind
    if (check.assigned(moduleData.wind_timeutc)) {
      reformatted.sensors.push({
        moduleId,
        type: 'wind',
        windStrength: moduleData.wind_strength,
        windAngle: moduleData.wind_angle,
        gustStrength: moduleData.gust_strength,
        gustAngle: moduleData.gust_angle,
        time: new Date(moduleData.wind_timeutc * 1000)    
      });
    }

    // Rain
    if (check.assigned(moduleData.rain_timeutc)) {
      reformatted.sensors.push({
        moduleId,
        type: 'rain',
        rainHour: moduleData.rain_60min,
        rainDay: moduleData.rain_24h,
        rainLive: moduleData.rain_live,
        time: new Date(moduleData.rain_timeutc * 1000)    
      });
    }

  });

  return reformatted;

}


