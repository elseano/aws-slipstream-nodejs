import winston from 'winston';

export const cloudWatchFormatter = winston.format.printf(
  ({ level, message, timestamp, requestId, stack, meta, ...rest }) => {
    const { _headers, ...restTrimmed } = rest;
    let restStr = JSON.stringify(restTrimmed);

    if (restStr === '{}') restStr = '';

    const requestIdStr = requestId || 'no-request';
    const stackStr = stack || '';

    return `${timestamp} [${requestIdStr}] ${level}: ${message} ${restStr}\n${stackStr}`.trim();
  }
);

/**
 * Adds a log entry timestamp in ISO8601 with integer-based seconds.
 *
 * @remarks
 * By default, NodeJS will use decimal seconds which is unsupported by CloudWatch.
 *
 * This tweaks the NodeJS default, shifting the fractional part of the seconds to
 * the end of the timestamp, which we then configure CloudWatch to ignore.
 *
 * * Before: `2020-02-20T12:34:23.231Z`
 * * After: `2020-02-20T12:34:23Z +0.231s`
 *
 * You'll need to configure either the CloudWatch Logs Agent, or
 * awslogs to match this format: `%Y-%m-%dT%H:%M:%SZ`.
 *
 * * For CloudWatch Logs Agent, set `datetime_format` to the above value.
 * * For AWSLogs Driver, set `awslogs-datetime-format` to the above value.
 *
 */
export const cloudWatchTimestamp = winston.format.timestamp({
  format: 'YYYY-MM-DDTHH:mm:ssZZ +.SSS',
});
