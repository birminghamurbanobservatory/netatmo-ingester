import * as mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema({
  moduleId: {
    $type: String,
    required: true
  },
  type: {
    $type: String,
    required: true
  },
  time: {
    $type: Date,
    required: true
  },
  hasBeginning: Date,
  hasEnd: Date,
  temperature: Number,
  pressure: Number,
  humidity: Number,
  rainHour: Number,
  rainDay: Number,
  rainLive: Number,
  rainRate: Number, // in mm/hr
  rainAccumulation: Number,
  // Wind measurements are averages of the last 5 minutes.
  // Source: https://helpcenter.netatmo.com/en-us/smart-home-weather-station-and-accessories/measures-and-calibrations/how-does-the-smart-anemometer-work
  windStrength: Number,
  windAngle: Number,
  gustStrength: Number,
  gustAngle: Number
}, {
  typeKey: '$type' // need to do this so I can use the 'type' key
});


const schema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lon: {
      type: Number,
      required: true
    },
    id: {
      type: String,
      required: true
    },
    validAt: {
      type: Date,
      required: true
    }
  },
  extras: {
    timezone: String,
    country: String,
    altitude: Number,
    city: String,
    street: String
  },  
  sensors: [sensorSchema]
}, {
  timestamps: true, // automatically adds createdAt and updatedAt fields
});   


//-------------------------------------------------
// Indexes
//-------------------------------------------------
schema.index({deviceId: 1}, {unique: true});


//-------------------------------------------------
// Create Model (and expose it to our app)
//-------------------------------------------------
export default mongoose.model('Latest', schema);