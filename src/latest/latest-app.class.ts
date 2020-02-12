export class LatestApp {
  deviceId: string;
  location: Location;
  extras: Extras;
  sensors: Sensor[];
}

class Location {
  lat: number;
  lon: number;
  id: string;
  validAt: Date;
}

class Extras {
  timezone: string;
  country: string;
  altitude: number;
  city: string;
  street: string;
}

class Sensor {
  moduleId: string;
  type: string;
  time: Date;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windStrength?: number;
  windAngle?: number;
  gustStrength?: number;
  gustAngle?: number;
  rainHour?: number;
  rainDay?: number;
  rainLive?: number;
  rainRate?: number;
  rainAccumulation?: RainAccumulation;
}

class RainAccumulation {
  from: Date;
  to: Date;
  depth: number;
}