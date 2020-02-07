import {NotFound} from '../../errors/NotFound';

export class LatestNotFound extends NotFound {

  public constructor(message = 'Latest could not be found') {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain   
  }

}