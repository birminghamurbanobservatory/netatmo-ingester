import Latest from './latest.model';
import {LatestNotFound} from './errors/LatestNotFound';
import {GetLatestFail} from './errors/GetLatestFail';


export async function upsertLatest(newLatest: any): Promise<any> {



}



export async function getLatest(deviceId: string): Promise<any> {

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

  return latest;

}