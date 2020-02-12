import Latest from './latest.model';
import {LatestNotFound} from './errors/LatestNotFound';
import {GetLatestFail} from './errors/GetLatestFail';
import {LatestApp} from './latest-app.class';
import {CreateLatestFail} from './errors/CreateLatestFail';
import {UpdateLatestFail} from './errors/UpdateLatestFail';



export async function updateLatest(deviceId: string, updates: any): Promise<LatestApp> {

  let updatedLatest;
  try {
    updatedLatest = await Latest.findOneAndUpdate(
      {
        deviceId
      },
      updates,
      {
        new: true,
        runValidators: true        
      } 
    );
  } catch (err) {
    throw new UpdateLatestFail(`Failed to update latest document for device '${deviceId}'.`, err.message);
  }

  return latestDbToApp(updatedLatest);

}



export async function createLatest(latest: LatestApp): Promise<LatestApp> {

  let createdLatest;
  try {
    createdLatest = await Latest.create(latest);
  } catch (err) {
    throw new CreateLatestFail(`Failed to create a new latest document for device '${latest.deviceId}'.`, err.message);
  }

  return latestDbToApp(createdLatest);

}


export async function getLatestFromDevice(deviceId: string): Promise<LatestApp> {

  let latest;
  try {
    latest = await Latest.findOne(
      {
        deviceId
      }       
    ).exec();
  } catch (err) {
    throw new GetLatestFail(undefined, err.message);
  }

  if (!latest) {
    throw new LatestNotFound(`A latest document for device '${deviceId}' could not be found`);
  }

  return latestDbToApp(latest);

}


function latestDbToApp(latestDb: any): LatestApp {

  const latestApp = latestDb.toObject();
  latestApp.id = latestApp._id.toString();
  delete latestApp._id;
  delete latestApp.__v;
  return latestApp;

}

