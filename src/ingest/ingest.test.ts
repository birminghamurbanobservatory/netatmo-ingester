import {reformatPublicData, combineNewDeviceDataWithExistingLatest, latestToObservations} from './ingest';
import {sortBy} from 'lodash'; 

describe('Testing of reformatPublicData function', () => {

  test('Converts public data correctly', () => {

    const publicData = [
      {
        _id: '70:ee:50:17:eb:1a',
        place: {
          location: [
            -1.949845,
            52.461884
          ],
          timezone: 'Europe/London',
          country: 'GB',
          altitude: 160,
          city: 'Birmingham',
          street: 'Park Hill Road'
        },
        mark: 14,
        measures: {
          '02:00:00:17:68:62': {
            res: {
              '1581094840': [
                6.7,
                81
              ]
            },
            type: [
              'temperature',
              'humidity'
            ]
          },
          '70:ee:50:17:eb:1a': {
            res: {
              '1581094862': [
                1012.2
              ]
            },
            type: [
              'pressure'
            ]
          },
          '05:00:00:06:db:60': {
            rain_60min: 0,
            rain_24h: 0,
            rain_live: 0,
            rain_timeutc: 1581094859
          },
          '06:00:00:04:1f:4e': {
            wind_strength: 6,
            wind_angle: 59,
            gust_strength: 10,
            gust_angle: 125,
            wind_timeutc: 1581094859
          }
        },
        modules: [
          '05:00:00:06:db:60',
          '02:00:00:17:68:62',
          '06:00:00:04:1f:4e'
        ],
        module_types: {
          '05:00:00:06:db:60': 'NAModule3',
          '02:00:00:17:68:62': 'NAModule1',
          '06:00:00:04:1f:4e': 'NAModule2'
        }
      }
    ];

    const expected = ([
      {
        deviceId: '70:ee:50:17:eb:1a',
        location: {
          lat: 52.461884,
          lon: -1.949845
        },
        extras: {
          timezone: 'Europe/London',
          country: 'GB',
          altitude: 160,
          city: 'Birmingham',
          street: 'Park Hill Road'
        },
        sensors: [
          {
            moduleId: '02:00:00:17:68:62',
            type: 'temperature',
            temperature: 6.7,
            time: new Date(1581094840 * 1000)
          },
          {
            moduleId: '02:00:00:17:68:62',
            type: 'humidity',
            humidity: 81,
            time: new Date(1581094840 * 1000)
          },
          {
            moduleId: '70:ee:50:17:eb:1a',
            type: 'pressure',
            pressure: 1012.2,
            time: new Date(1581094862 * 1000)
          },
          {
            moduleId: '05:00:00:06:db:60',
            type: 'rain',
            rainHour: 0,
            rainDay: 0,
            rainLive: 0,
            time: new Date(1581094859 * 1000)
          },
          {
            moduleId: '06:00:00:04:1f:4e',
            type: 'wind',
            windStrength: 6,
            windAngle: 59,
            gustStrength: 10,
            gustAngle: 125,
            time: new Date(1581094859 * 1000)       
          }     
        ]
      }
    ]);

    const reformatted = reformatPublicData(publicData);
    expect(reformatted).toEqual(expected);

  });

});




describe('Testing of combineNewDeviceDataWithExistingLatest function', () => {

  test('Combines new device data with existing latest correctly', () => {
    
    const newDeviceData = {
      deviceId: '70:ee:50:17:eb:1a',
      location: {
        lat: 52.461884,
        lon: -1.949845
      },
      extras: {
        timezone: 'Europe/London',
        country: 'GB',
        altitude: 160,
        city: 'Birmingham',
        street: 'Park Hill Road'
      },
      sensors: [
        {
          moduleId: '02:00:00:17:68:62',
          type: 'temperature',
          temperature: 6.7,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '02:00:00:17:68:62',
          type: 'humidity',
          humidity: 81,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '70:ee:50:17:eb:1a',
          type: 'pressure',
          pressure: 1012.2,
          time: new Date('2020-02-12T11:00:54.899Z') // I've made this a bit older than the others on purpose
        },
        {
          moduleId: '05:00:00:06:db:60',
          type: 'rain',
          rainHour: 0.404,
          rainDay: 0.606,
          rainLive: 0.101, // i.e. not the full accumulation over the 10 minutes, just over 5.
          time: new Date('2020-02-12T11:06:59.228Z')
        },
        {
          moduleId: '06:00:00:04:1f:4e',
          type: 'wind',
          windStrength: 6,
          windAngle: 59,
          gustStrength: 10,
          gustAngle: 125,
          time: new Date('2020-02-12T11:05:44.118Z')       
        }     
      ]
    };

    const existingLatest = {
      deviceId: '70:ee:50:17:eb:1a',
      location: {
        lat: 52.461884,
        lon: -1.949845,
        id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
        validAt: new Date('2020-01-11T08:02:55.999Z')
      },
      extras: {
        timezone: 'Europe/London',
        country: 'GB',
        altitude: 160,
        city: 'Birmingham',
        street: 'Park Hill Road'
      },
      sensors: [
        {
          moduleId: '02:00:00:17:68:62',
          type: 'temperature',
          temperature: 6.5,
          time: new Date('2020-02-12T10:57:25.222Z')
        },
        {
          moduleId: '02:00:00:17:68:62',
          type: 'humidity',
          humidity: 83,
          time: new Date('2020-02-12T10:57:25.222Z')
        },
        {
          moduleId: '70:ee:50:17:eb:1a',
          type: 'pressure',
          pressure: 1012.2,
          time: new Date('2020-02-12T11:00:54.899Z') // i.e. the same as it was
        },
        {
          moduleId: '05:00:00:06:db:60',
          type: 'rain',
          rainHour: 0.202,
          rainDay: 0.404,
          rainLive: 0.101,
          rainRate: 0.61,
          rainAccumulation: 0.101,
          hasBeginning: new Date('2020-02-12T10:46:53.111Z'),
          hasEnd: new Date('2020-02-12T10:56:53.333Z'),
          time: new Date('2020-02-12T10:56:53.333Z')
        },
        {
          moduleId: '06:00:00:04:1f:4e',
          type: 'wind',
          windStrength: 5,
          windAngle: 61,
          gustStrength: 11,
          gustAngle: 130,
          hasBeginning: new Date('2020-02-12T10:50:44.988Z'),
          hasEnd: new Date('2020-02-12T10:55:44.988Z'),
          time: new Date('2020-02-12T10:55:44.988Z')       
        }     
      ]
    };

    const expectedCombinedLatest = {
      deviceId: '70:ee:50:17:eb:1a',
      location: {
        lat: 52.461884,
        lon: -1.949845,
        id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
        validAt: new Date('2020-01-11T08:02:55.999Z')
      },
      extras: {
        timezone: 'Europe/London',
        country: 'GB',
        altitude: 160,
        city: 'Birmingham',
        street: 'Park Hill Road'
      },
      sensors: [
        {
          moduleId: '02:00:00:17:68:62',
          type: 'temperature',
          temperature: 6.7,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '02:00:00:17:68:62',
          type: 'humidity',
          humidity: 81,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '70:ee:50:17:eb:1a',
          type: 'pressure',
          pressure: 1012.2,
          time: new Date('2020-02-12T11:00:54.899Z')
        },
        {
          moduleId: '05:00:00:06:db:60',
          type: 'rain',
          rainHour: 0.404,
          rainDay: 0.606,
          rainLive: 0.101,
          rainRate: 1.20,
          rainAccumulation: 0.202,
          hasBeginning: new Date('2020-02-12T10:56:53.333Z'),
          hasEnd: new Date('2020-02-12T11:06:59.228Z'),
          time: new Date('2020-02-12T11:06:59.228Z')
        },
        {
          moduleId: '06:00:00:04:1f:4e',
          type: 'wind',
          windStrength: 6,
          windAngle: 59,
          gustStrength: 10,
          gustAngle: 125,
          hasBeginning: new Date('2020-02-12T11:00:44.118Z'), 
          hasEnd: new Date('2020-02-12T11:05:44.118Z'),
          time: new Date('2020-02-12T11:05:44.118Z')       
        }     
      ]
    };

    const expectedUpdatedSensors = [
      {
        moduleId: '02:00:00:17:68:62',
        type: 'temperature'
      },
      {
        moduleId: '02:00:00:17:68:62',
        type: 'humidity'
      },
      {
        moduleId: '05:00:00:06:db:60',
        type: 'rain'
      },
      {
        moduleId: '06:00:00:04:1f:4e',
        type: 'wind'
      }
      // N.B. pressure shouldn't be in here.
    ];

    const {combinedLatest, updatedSensors} = combineNewDeviceDataWithExistingLatest(newDeviceData, existingLatest);

    expect(combinedLatest).toEqual(expectedCombinedLatest);
    expect(updatedSensors).toEqual(expectedUpdatedSensors);

  });


  // TODO: Check it can cope with a rain or wind gauge being swapped. It should add another object in the sensors array in the latest document, e.g. you'll have two objects with a 'rain' type, but different moduleId's.

});


describe('Testing of latestToObservations function', () => {

  test('Converts a regular latest object correctly', () => {
    
    const latest = {
      deviceId: '70:ee:50:17:eb:1a',
      location: {
        lat: 52.461884,
        lon: -1.949845,
        id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
        validAt: new Date('2020-01-11T08:02:55.999Z')
      },
      extras: {
        timezone: 'Europe/London',
        country: 'GB',
        altitude: 160,
        city: 'Birmingham',
        street: 'Park Hill Road'
      },
      sensors: [
        {
          moduleId: '02:00:00:17:68:62',
          type: 'temperature',
          temperature: 6.7,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '02:00:00:17:68:62',
          type: 'humidity',
          humidity: 81,
          time: new Date('2020-02-12T11:07:24.818Z')
        },
        {
          moduleId: '70:ee:50:17:eb:1a',
          type: 'pressure',
          pressure: 1012.2,
          time: new Date('2020-02-12T11:00:54.899Z')
        },
        {
          moduleId: '05:00:00:06:db:60',
          type: 'rain',
          rainHour: 0.404,
          rainDay: 0.606,
          rainLive: 0.101,
          rainRate: 1.20,
          rainAccumulation: 0.202,
          hasBeginning: new Date('2020-02-12T10:56:53.333Z'),
          hasEnd: new Date('2020-02-12T11:06:59.228Z'),
          time: new Date('2020-02-12T11:06:59.228Z')
        },
        {
          moduleId: '06:00:00:04:1f:4e',
          type: 'wind',
          windStrength: 6,
          windAngle: 59,
          gustStrength: 10,
          gustAngle: 125,
          hasBeginning: new Date('2020-02-12T11:00:44.118Z'),
          hasEnd: new Date('2020-02-12T11:05:44.118Z'),
          time: new Date('2020-02-12T11:05:44.118Z')       
        }     
      ]
    };

    // Make sure these are sorted by madeBySensor, then observedProperty, then aggregation so that expect().toEqual works.
    const expected = [
      {
        madeBySensor: 'netatmo-02-00-00-17-68-62-humidity',
        resultTime: '2020-02-12T11:07:24.818Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        hasResult: {
          value: 81,
          unit: 'percent'
        },
        observedProperty: 'relative-humidity',
        aggregation: 'instant',
        usedProcedures: ['netatmo-humidity-instantaneous']
      },
      {
        madeBySensor: 'netatmo-02-00-00-17-68-62-temperature',
        resultTime: '2020-02-12T11:07:24.818Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        hasResult: {
          value: 6.7,
          unit: 'degree-celsius',
        },
        observedProperty: 'air-temperature',
        aggregation: 'instant',
        usedProcedures: ['netatmo-temperature-instantaneous']
      },
      {
        madeBySensor: 'netatmo-05-00-00-06-db-60-rain',
        resultTime: '2020-02-12T11:06:59.228Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'precipitation-depth',
        aggregation: 'sum',
        usedProcedures: ['uo-netatmo-precip-depth-derivation'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T10:56:53.333Z',
          hasEnd: '2020-02-12T11:06:59.228Z'
        },
        hasResult: {
          value: 0.202,
          unit: 'millimetre'
        },
      },
      {
        madeBySensor: 'netatmo-05-00-00-06-db-60-rain',
        resultTime: '2020-02-12T11:06:59.228Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'precipitation-rate',
        aggregation: 'average',
        usedProcedures: ['uo-netatmo-precip-rate-derivation'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T10:56:53.333Z',
          hasEnd: '2020-02-12T11:06:59.228Z'
        },
        hasResult: {
          value: 1.20,
          unit: 'millimetre-per-hour',
        }
      },
      {
        madeBySensor: 'netatmo-06-00-00-04-1f-4e-wind',
        resultTime: '2020-02-12T11:05:44.118Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'wind-direction',
        aggregation: 'average',
        usedProcedures: ['netatmo-wind-direction-5-min-average'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T11:00:44.118Z',
          hasEnd: '2020-02-12T11:05:44.118Z'
        },
        hasResult: {
          value: 59,
          unit: 'degree'
        }
      },
      {
        madeBySensor: 'netatmo-06-00-00-04-1f-4e-wind',
        resultTime: '2020-02-12T11:05:44.118Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'wind-direction',
        aggregation: 'maximum', // is 'Maximum' right to use in this instance?
        usedProcedures: ['netatmo-wind-dir-during-5-min-max-speed'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T11:00:44.118Z',
          hasEnd: '2020-02-12T11:05:44.118Z'
        },
        hasResult: {
          value: 125,
          unit: 'degree'
        }
      },
      {
        madeBySensor: 'netatmo-06-00-00-04-1f-4e-wind',
        resultTime: '2020-02-12T11:05:44.118Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'wind-speed',
        aggregation: 'average',
        usedProcedures: ['netatmo-wind-speed-5-min-average', 'kilometre-per-hour-to-metre-per-second'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T11:00:44.118Z',
          hasEnd: '2020-02-12T11:05:44.118Z'
        },
        hasResult: {
          value: 1.7,
          unit: 'metre-per-second'
        }
      },      
      {
        madeBySensor: 'netatmo-06-00-00-04-1f-4e-wind',
        resultTime: '2020-02-12T11:05:44.118Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'wind-speed',
        aggregation: 'maximum', 
        usedProcedures: ['netatmo-wind-speed-5-min-maximum', 'kilometre-per-hour-to-metre-per-second'],
        phenomenonTime: {
          hasBeginning: '2020-02-12T11:00:44.118Z',
          hasEnd: '2020-02-12T11:05:44.118Z'
        },
        hasResult: {
          value: 2.8,
          unit: 'metre-per-second'
        }
      },
      {
        madeBySensor: 'netatmo-70-ee-50-17-eb-1a-pressure',
        resultTime: '2020-02-12T11:00:54.899Z',
        location: {
          id: '7cde49a7-adc5-423d-9cc0-1f78994f7f40',
          geometry: {
            type: 'Point',
            coordinates: [-1.949845, 52.461884]
          },
          validAt: '2020-01-11T08:02:55.999Z'
        },
        observedProperty: 'air-pressure-at-mean-sea-level', 
        aggregation: 'instant',
        usedProcedures: ['netatmo-pressure-instantaneous', 'netatmo-pressure-adjusted-to-sea-level'],
        hasResult: {
          value: 1012.2,
          unit: 'hectopascal'
        }
      }
    ];


    const observations = latestToObservations(latest);
    // Need to sort the observations so that the order matches that of the expected array above.
    const observationsSorted = sortBy(observations, ['madeBySensor', 'observedProperty', 'aggregation']);
    expect(observationsSorted).toEqual(expected);

  });

});