import * as winston from 'winston';

export const cloudWatchFormatter = winston.format.printf(
  ({ level, message, timestamp, requestIdString, stack, meta, ...rest }) => {
    const { _headers, ...restTrimmed } = rest;
    let restStr = JSON.stringify(restTrimmed);

    if (restStr === '{}') restStr = '';

    const stackStr = stack || '';

    return `${timestamp} ${requestIdString} ${level}: ${message} ${restStr}\n${stackStr}`.trim();
  }
);

/**
 * Adds a log entry timestamp in ISO8601 with integer-based seconds.
 *
 * @remarks
 *
 * You'll need to configure either the CloudWatch Logs Agent, or
 * awslogs to match this format: `%Y-%m-%dT%H:%M:%S.%f%z`, which is also available
 * under the `cloudwatchFormat` member.
 *
 * * For CloudWatch Logs Agent, set `datetime_format` to the above value.
 * * For AWSLogs Driver, set `awslogs-datetime-format` to the above value.
 *
 */
export const ISO8601 = {
  winstonFormat: winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZZ',
  }),
  cloudwatchFormat: '%Y-%m-%dT%H:%M:%S.%f%z',
};

export const Simple = {
  winstonFormat: winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  cloudwatchFormat: '%Y-%m-%d %H:%M:%S.%f',
};
