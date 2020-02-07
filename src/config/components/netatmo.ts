//-------------------------------------------------
// Dependencies
//-------------------------------------------------
import * as joi from '@hapi/joi';


//-------------------------------------------------
// Validation Schema
//-------------------------------------------------
const schema = joi.object({
  NETATMO_NORTH_LAT_EXTENT: joi.number()
    .max(90)
    .min(-90)
    .required(),
  NETATMO_SOUTH_LAT_EXTENT: joi.number()
    .max(90)
    .min(-90)
    .required(),
  NETATMO_WEST_LON_EXTENT: joi.number()
    .max(180)
    .min(-180)
    .required(),
  NETATMO_EAST_LON_EXTENT: joi.number()
    .max(180)
    .min(-180)
    .required(),
  NETATMO_MAX_WINDOW_WIDTH: joi.number()  // in degrees °
    .max(360)
    .min(0)
    .default(0.1),
  NETATMO_CLIENT_ID: joi.string()
    .required(),
  NETATMO_CLIENT_SECRET: joi.string()
    .required(),
  NETATMO_USERNAME: joi.string()
    .required(),
  NETATMO_PASSWORD: joi.string()
    .required()     
}).unknown() // allows for extra fields (i.e that we don't check for) in the object being checked.
  .required();



//-------------------------------------------------
// Validate
//-------------------------------------------------
// i.e. check that process.env contains all the environmental variables we expect/need.
// It's important to use the 'value' that joi.validate spits out from now on, as joi has the power to do type conversion and add defaults, etc, and thus it may be different from the original process.env. 
const {error: err, value: envVars} = schema.validate(process.env);

if (err) {
  throw new Error(`An error occured whilst validating process.env: ${err.message}`);
}

if (envVars.NETATMO_NORTH_LAT_EXTENT <= envVars.NETATMO_SOUTH_LAT_EXTENT) {
  throw new Error('North coordinate must be greater than south');
}
if (envVars.NETATMO_EAST_LON_EXTENT <= envVars.NETATMO_WEST_LON_EXTENT) {
  throw new Error('East coordinate must be greate than west');
}


//-------------------------------------------------
// Create config object
//-------------------------------------------------
// Pull out the properties we need to create this particular config object. 
export const netatmo = {
  region: {
    north: envVars.NETATMO_NORTH_LAT_EXTENT,
    south: envVars.NETATMO_SOUTH_LAT_EXTENT,
    west: envVars.NETATMO_WEST_LON_EXTENT,
    east: envVars.NETATMO_EAST_LON_EXTENT,
    maxWindowWidth: envVars.NETATMO_MAX_WINDOW_WIDTH
  },
  credentials: {
    clientId: envVars.NETATMO_CLIENT_ID,
    clientSecret: envVars.NETATMO_CLIENT_SECRET,
    username: envVars.NETATMO_USERNAME,
    password: envVars.NETATMO_PASSWORD,
  }
};
