export class ObservationClient {
  public madeBySensor?: string;
  public hasResult?: Result;
  public resultTime?: string;
  public location?: Location;
  public observedProperty?: string;
  public aggregation?: string;
  public usedProcedures?: string[];
  public phenomenonTime?: PhenomenonTime;
}

class Result {
  value?: any;
  unit?: string;
  flags?: string[];
}

class Location {
  public id?: string;
  public geometry?: Geometry;
  public validAt?: string;
}

class Geometry {
  type?: string;
  coordinates?: any;
}

class PhenomenonTime {
  hasBeginning: Date;
  hasEnd: Date;
}