import * as event from 'event-stream';
import * as logger from 'node-logger';
import {withCorrelationId, getCorrelationId} from '../utils/correlator';

export async function initialiseEvents(settings: {url: string; appName: string; logLevel: string}): Promise<void> {

  logger.debug('Initialising event stream');

  if (logIt('error', settings.logLevel)) {
    event.logsEmitter.on('error', (msg): void => {
      logger.error(`(event-stream-log) ${msg}`);
    });
  }
  if (logIt('warn', settings.logLevel)) {
    event.logsEmitter.on('warn', (msg): void => {
      logger.warn(`(event-stream-log) ${msg}`);
    });
  }
  if (logIt('info', settings.logLevel)) {
    event.logsEmitter.on('info', (msg): void => {
      logger.info(`(event-stream-log) ${msg}`);
    });
  }
  if (logIt('debug', settings.logLevel)) {
    event.logsEmitter.on('debug', (msg): void => {
      logger.debug(`(event-stream-log) ${msg}`);
    });
  }

  try {
    await event.init({
      url: settings.url,
      appName: settings.appName,
      withCorrelationId,
      getCorrelationId
    });
  } catch (err) {
    logger.error(`Failed to initialise event-stream. Reason: ${err.message}`);
  }

  function logIt(level, configSetting): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(configSetting);
  }  

}