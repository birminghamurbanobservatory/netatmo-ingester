import {Credentials} from '../netatmo/credentials.class';
import {Region} from '../netatmo/region.class';
import {getAccessToken, getPublicData} from '../netatmo/netatmo.service';
import * as logger from 'node-logger';
import {calculateWindows} from '../netatmo/windows-calculator';
import * as Promise from 'bluebird';
import {pick, cloneDeep, round} from 'lodash';
import * as check from 'check-types';
import {ReformattedDevicePublicData} from './reformatted-device-public-data.class';
import {ObservationClient} from './observation-client.class';
import {v4 as uuid} from 'uuid';
import {getLatestFromDevice, updateLatest, createLatest} from '../latest/latest.service';
import {LatestApp} from '../latest/latest-app.class';
import * as event from 'event-stream';
import {calculateRainRate} from '../utils/rain.service';
import {subMinutes} from 'date-fns';
import {kilometrePerHourToMetresPerSecond} from '../utils/wind.service';


export async function ingestPublicData(credentials: Credentials, region: Region): Promise<any> {

  // Get access token
  const accessToken = await getAccessToken(credentials);

  logger.debug(`Got access token`, {accessToken});
  
  // Calculate the windows
  // Because the netatmo api will often exclude netatmo stations when there are many in a certain region or you are looking at a large spatial area, therefore its important run the getPublicData request over several smaller windows that together make up the full region of interest.
  const windows = calculateWindows(region);
  logger.debug(`Using ${windows.length} windows`);

  await Promise.mapSeries(windows, async (window, wIdx) => {

    logger.debug(`Processing window ${wIdx + 1} of ${windows.length}.`);

    const publicData = await getPublicData({
      accessToken,
      latNE: region.north,
      latSW: region.south,
      lonNE: region.east,
      lonSW: region.west
    });

    // logger.debug(publicData);

    const reformatted: ReformattedDevicePublicData[] = reformatPublicData(publicData);

    // Exclude any outside of the window
    const devicesData = reformatted.filter((device) => {
      return device.location.lat <= window.north &&
        device.location.lat >= window.south &&
        device.location.lon >= window.west &&
        device.location.lon <= window.east;
    });


    // Need to loop through each device individually, checking to see if we have a latest document for it, from which we can work out if any of the sensor observations are new. If so we'll need to update the document, potentially calculating the rain-accumulation and rain-rate from the daily_accumulation, then publish any new observations to the event stream.
    await Promise.mapSeries(devicesData, async (deviceData) => {

      let existingLatest;
      let observations: ObservationClient[];

      try {
        existingLatest = await getLatestFromDevice(deviceData.deviceId);
      } catch (err) {
        if (err.name === 'LatestNotFound') {
          logger.debug(`deviceId '${deviceData.deviceId} does not have a latest document yet.'`);
        } else {
          throw err;
        }
      }

      //------------------------
      // Update
      //------------------------
      if (existingLatest) {

        const {combinedLatest, updatedSensors} = combineNewDeviceDataWithExistingLatest(deviceData, existingLatest);


        const updatedLatest = await updateLatest(deviceData.deviceId, combinedLatest);
        // The observations should only be generated from new readings from the netatmo, therefore we need to remove any that weren't updated this time round.
        const latestUpdatedSensorsOnly = cloneDeep(updatedLatest);
        latestUpdatedSensorsOnly.sensors = latestUpdatedSensorsOnly.sensors.filter((latestSensor) => {
          return Boolean(updatedSensors.find((updatedSensor) => {
            return updatedSensor.moduleId === latestSensor.moduleId && updatedSensor.type === latestSensor.type;
          }));
        });
        observations = latestToObservations(latestUpdatedSensorsOnly);



      //------------------------
      // Insert
      //------------------------
      } else {
        // There's not much more we need to add to the new device data to make it a valid Latest document
        const newLatestToInsert: any = cloneDeep(deviceData);
        newLatestToInsert.location.id = uuid();
        newLatestToInsert.location.validAt = new Date();
        const insertedLatest = await createLatest(newLatestToInsert);
        observations = latestToObservations(insertedLatest);

      }

      // Publish the observation(s) to the event stream
      await Promise.mapSeries(observations, async (observation): Promise<void> => {
        await event.publish('observation.incoming', observation);
      });

      

    });


    // In terms of keeping the Netatmo location up to date in the sensor-deployment-manager, it's probably worth updating the sensor-deployment-manager so that any sensor can update a platform's location, just so long as the observation has a location object. The trade-off of this approach as opposed to creating a fake netatmo location sensor is that you won't have a history of locations, but given how rarely netatmo's move this shouldn't be an issue.

    // Add a short delay to help reduce the chance of hitting the api rate limits
    await Promise.delay(300);

    return;

  });


}


export function reformatPublicData(publicData): ReformattedDevicePublicData[] {
  return publicData.map(reformatPublicDataSingleDevice);
}


export function reformatPublicDataSingleDevice(data): ReformattedDevicePublicData {

  const reformatted = {
    deviceId: data._id,
    location: {
      lat: round(data.place.location[1], 7), // no point in having more than 7 decimal places
      lon: round(data.place.location[0], 7)
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


// Checks to see if any sensor obsevations are newer and therefore need updating, and can calculate fields such as 'rainAccumulationSinceLastUpdate'.
export function combineNewDeviceDataWithExistingLatest(newDeviceData: ReformattedDevicePublicData, existingLatest: LatestApp): {combinedLatest: LatestApp; updatedSensors: any[]} {

  if (newDeviceData.deviceId !== existingLatest.deviceId) {
    throw new Error('deviceId should match');
  }

  const updatedSensors = [];

  const combined: any = {
    deviceId: newDeviceData.deviceId,
    sensors: []
  };


  const locationRemainsTheSame = existingLatest.location.lat === newDeviceData.location.lat && existingLatest.location.lon === newDeviceData.location.lon;

  if (locationRemainsTheSame) {
    combined.location = existingLatest.location;
  } else {
    // Location has changed
    combined.location = {
      lat: newDeviceData.location.lat,
      lon: newDeviceData.location.lon,
      id: uuid(),
      validAt: new Date() 
    };
  }

  // Merge the extras
  combined.extras = Object.assign({}, existingLatest.extras, newDeviceData.extras);

  newDeviceData.sensors.forEach((newSensorData) => {

    let latestDataForSensor;

    const previousSensorData = existingLatest.sensors.find((previousSensorData) => {
      return previousSensorData.moduleId === newSensorData.moduleId &&
      previousSensorData.type === newSensorData.type;
    });

    let state;
    if (!previousSensorData) {
      state = 'no-previous-data';
    } else {
      if (newSensorData.time > previousSensorData.time) {
        state = 'overwrite-with-new-data';
      } else {
        state = 'reuse-old-data';
      }
    }

    if (state === 'no-previous-data' || state === 'overwrite-with-new-data') {

      latestDataForSensor = cloneDeep(newSensorData);

      updatedSensors.push({
        moduleId: newSensorData.moduleId,
        type: newSensorData.type
      });

      // Extra processing of rain data
      if (newSensorData.type === 'rain' && state === 'overwrite-with-new-data') {
        
        const timeDiffMs = newSensorData.time.getTime() - previousSensorData.time.getTime();
        const timeDiffMin = timeDiffMs / (1000 * 60);

        // It would be wrong to try calculating an accumulation if the previous data was from ages ago
        if (timeDiffMin < 30) {

          // The following should account for the new data being on a different day.
          const depth = newSensorData.rainDay >= previousSensorData.rainDay ? 
            round(newSensorData.rainDay - previousSensorData.rainDay, 3) : 
            newSensorData.rainDay;

          latestDataForSensor.rainAccumulation = depth;
          latestDataForSensor.hasBeginning = previousSensorData.time;
          latestDataForSensor.hasEnd = newSensorData.time;

          latestDataForSensor.rainRate = calculateRainRate(latestDataForSensor.hasBeginning, latestDataForSensor.hasEnd, depth);

        }
      }

      // Extra processing of wind data
      if (newSensorData.type === 'wind') {
        // The wind data variables are all averages of the last 5 mins so let's use this knowledge to set the hasBeginning and hasEnd properties.
        latestDataForSensor.hasBeginning = subMinutes(newSensorData.time, 5);
        latestDataForSensor.hasEnd = newSensorData.time;
      }

    }

    if (state === 'reuse-old-data') {
      // Simply reuse the existing sensor data
      latestDataForSensor = cloneDeep(previousSensorData);
    } 


    if (latestDataForSensor) {
      combined.sensors.push(latestDataForSensor);
    }

  });

  return {
    combinedLatest: combined,
    updatedSensors 
  };

}


export function latestToObservations(latest): ObservationClient[] {

  const observations = [];

  latest.sensors.forEach((sensorData) => {

    const observationBase: ObservationClient = {
      madeBySensor: generateSensorId(sensorData.moduleId, sensorData.type),
      resultTime: sensorData.time.toISOString(),
      location: {
        id: latest.location.id,
        geometry: {
          type: 'Point',
          coordinates: [latest.location.lon, latest.location.lat]
        },
        validAt: latest.location.validAt.toISOString()
      }
      // TODO: Would it make sensor to add a isHostedBy property here? I.e. with the deviceId for the main indoor module. This would probably need some updates to the sensor-deployment-manager to ensure it still added the rest of the hostedByPath. Alternatively I could manage all this with the admin-web-app, but you'd need to stay of top of any rain/wind gauge swaps.
    };

    //------------------------
    // Temperature
    //------------------------
    if (sensorData.type === 'temperature') {
      const tempObservation = cloneDeep(observationBase);
      tempObservation.hasResult = {
        value: sensorData.temperature,
        unit: 'degree-celsius'
      };
      tempObservation.observedProperty = 'air-temperature';
      tempObservation.aggregation = 'instant';
      tempObservation.usedProcedures = ['netatmo-temperature-instantaneous'],
      observations.push(tempObservation);
    } 

    //------------------------
    // Humidity
    //------------------------
    if (sensorData.type === 'humidity') {
      const humdidityObservation = cloneDeep(observationBase);
      humdidityObservation.hasResult = {
        value: sensorData.humidity,
        unit: 'percent'
      };
      humdidityObservation.observedProperty = 'relative-humidity';
      humdidityObservation.aggregation = 'instant';
      humdidityObservation.usedProcedures = ['netatmo-humidity-instantaneous'],
      observations.push(humdidityObservation);
    } 

    //------------------------
    // Pressure
    //------------------------
    if (sensorData.type === 'pressure') {
      const pressureObservation = cloneDeep(observationBase);
      pressureObservation.hasResult = {
        value: sensorData.pressure,
        unit: 'hectopascal'
      };
      pressureObservation.observedProperty = 'air-pressure-at-mean-sea-level';
      pressureObservation.aggregation = 'instant';
      pressureObservation.usedProcedures = ['netatmo-pressure-instantaneous', 'netatmo-pressure-adjusted-to-sea-level'],
      observations.push(pressureObservation);
    }

    //------------------------
    // Rain
    //------------------------
    if (sensorData.type === 'rain') {

      const intervalAvailable = check.assigned(sensorData.hasBeginning) && check.assigned(sensorData.hasEnd);

      if (intervalAvailable) {

        const rainObservationBase = cloneDeep(observationBase);
        rainObservationBase.phenomenonTime = {
          hasBeginning: sensorData.hasBeginning.toISOString(),
          hasEnd: sensorData.hasEnd.toISOString()
        };

        if (check.assigned(sensorData.rainRate)) {
          const rainRateObservation = cloneDeep(rainObservationBase);
          rainRateObservation.hasResult = {
            value: sensorData.rainRate,
            unit: 'millimetre-per-hour'
          };
          rainRateObservation.observedProperty = 'precipitation-rate';
          rainRateObservation.aggregation = 'average';
          rainRateObservation.usedProcedures = ['uo-netatmo-precip-rate-derivation'];
          observations.push(rainRateObservation);
        }

        if (check.assigned(sensorData.rainAccumulation)) {
          const rainAccumulationObservation = cloneDeep(rainObservationBase);
          rainAccumulationObservation.hasResult = {
            value: sensorData.rainAccumulation,
            unit: 'millimetre'
          };
          rainAccumulationObservation.observedProperty = 'precipitation-depth';
          rainAccumulationObservation.aggregation = 'sum';
          rainAccumulationObservation.usedProcedures = ['uo-netatmo-precip-depth-derivation'];
          observations.push(rainAccumulationObservation);
        }

      }

    } 

    //------------------------
    // Wind
    //------------------------
    if (sensorData.type === 'wind') {

      const intervalAvailable = check.assigned(sensorData.hasBeginning) && check.assigned(sensorData.hasEnd);

      if (intervalAvailable) {

        const windObservationBase = cloneDeep(observationBase);
        windObservationBase.phenomenonTime = {
          hasBeginning: sensorData.hasBeginning.toISOString(),
          hasEnd: sensorData.hasEnd.toISOString()
        };

        // Wind Speed
        if (check.assigned(sensorData.windStrength)) {
          const windStrengthObservation = cloneDeep(windObservationBase);
          windStrengthObservation.hasResult = {
            value: kilometrePerHourToMetresPerSecond(sensorData.windStrength),
            unit: 'metre-per-second'
          };
          windStrengthObservation.observedProperty = 'wind-speed';
          windStrengthObservation.aggregation = 'average';
          windStrengthObservation.usedProcedures = ['netatmo-wind-speed-5-min-average', 'kilometre-per-hour-to-metre-per-second'];
          observations.push(windStrengthObservation);
        }

        // Wind Direction
        if (check.assigned(sensorData.windAngle)) {
          const windAngleObservation = cloneDeep(windObservationBase);
          windAngleObservation.hasResult = {
            value: sensorData.windAngle,
            unit: 'degree'
          };
          // Netatmo uses the direction the wind has come FROM. E.g. Northerly wind = 0°. So no need to convert.
          windAngleObservation.observedProperty = 'wind-direction';
          windAngleObservation.aggregation = 'average';
          windAngleObservation.usedProcedures = ['netatmo-wind-direction-5-min-average'];
          observations.push(windAngleObservation);
        }

        // Wind Gust Speed
        if (check.assigned(sensorData.gustStrength)) {
          const gustStrengthObservation = cloneDeep(windObservationBase);
          gustStrengthObservation.hasResult = {
            value: kilometrePerHourToMetresPerSecond(sensorData.gustStrength),
            unit: 'metre-per-second'
          };
          gustStrengthObservation.observedProperty = 'wind-speed';
          gustStrengthObservation.aggregation = 'maximum';
          gustStrengthObservation.usedProcedures = ['netatmo-wind-speed-5-min-maximum', 'kilometre-per-hour-to-metre-per-second'];
          observations.push(gustStrengthObservation);
        }

        // Wind Gust Angle
        if (check.assigned(sensorData.gustAngle)) {
          const gustAngleObservation = cloneDeep(windObservationBase);
          gustAngleObservation.hasResult = {
            value: sensorData.gustAngle,
            unit: 'degree'
          };
          gustAngleObservation.observedProperty = 'wind-direction';
          gustAngleObservation.aggregation = 'maximum';
          gustAngleObservation.usedProcedures = ['netatmo-wind-dir-during-5-min-max-speed'];
          observations.push(gustAngleObservation);
        }
      }  
    }



  });

  return observations;

}


export function generateSensorId(moduleId: string, type: string): string {
  const urlSafeModuleId = moduleId.replace(/:/g, '-');
  const sensorId = `netatmo-${urlSafeModuleId}-${type}`;
  return sensorId;
}


