import {reformatPublicData} from './ingest';

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