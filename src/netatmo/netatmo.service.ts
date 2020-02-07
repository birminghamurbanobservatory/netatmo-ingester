const axios = require('axios').default;
import {Credentials} from './credentials.class';
import * as querystring from 'querystring';
import * as check from 'check-types';

//-------------------------------------------------
// Get Access Token
//-------------------------------------------------
export async function getAccessToken(credentials: Credentials): Promise<string> {

  let response;

  try {
    
    // Need to use querystring.stringify as Netatmo expects body to be x-www-form-urlencoded formatted
    response = await axios.post(
      'https://api.netatmo.net/oauth2/token',
      querystring.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password,
        grant_type: 'password' 
      })
    );

  } catch (err) {

    let errMsg = `Token request failed. Reason: ${err.message}.`;
    if (err.response && err.response.data && err.response.data.error) {
      errMsg += ` Netatmo Error: ${err.response.data.error}.`;
    }
    throw new Error(errMsg);
    
  }

  const accessToken = response.data.access_token;
  if (check.not.nonEmptyString(accessToken)) {
    throw new Error('Did not receive an access_token from the Netamo API');
  }
  return accessToken;

}



//-------------------------------------------------
// Get Public Data
//-------------------------------------------------
export async function getPublicData(params: {accessToken: string; latNE: number; lonNE: number; latSW: number; lonSW: number}): Promise<any> {

  let response;
  try {

    response = await axios.post(
      'https://api.netatmo.net/api/getpublicdata',
      querystring.stringify({
        access_token: params.accessToken,
        lat_ne: params.latNE,
        lon_ne: params.lonNE,
        lat_sw: params.latSW,
        lon_sw: params.lonSW
      })
    );

  } catch (err) {

    let errMsg = `Public data request failed. Reason: ${err.message}.`;
    if (err.response && err.response.data && err.response.data.error) {
      errMsg += ` Netatmo Error: ${err.response.data.error}.`;
    }
    throw new Error(errMsg);

  }

  if (response.data && Array.isArray(response.data.body)) {
    return response.data.body;
  } else {
    throw new Error('Netatmo getpublicdata response is not formatted as expected');
  }

}

