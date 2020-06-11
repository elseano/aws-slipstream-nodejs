/**
 * Provides express middleware for extracting the RequestID, and a log formatter
 * to inject that request ID into log outputs.
 *
 * Uses cls-hooked to attach the Request ID to all log outputs for a given request
 * throughout async call trees.
 *
 * Example:
 *
 * // Grab the request ID from request headers.
 * app.use(requestIdMiddleware)
 *
 * // Add the request ID to log outputs.
 * winston.createLogger({ format: requestIdFormatter() })
 */

import { createNamespace } from 'cls-hooked';
import logform from 'logform';
import uuid from 'uuid';
import { Request, NextFunction, Response } from 'express';

var session = createNamespace('logger-session');

/**
 * Represents the Request ID.
 *
 * @remarks
 * The request data structure added to the logger.
 *
 * @param from - The source of the request ID, either AWS or internally generated.
 * @param id - The request ID itself
 */
export interface RequestIdentifier {
  /**
   * The source of the request ID, either AWS or internally generated.
   */
  from: 'int' | 'aws';

  /**
   * The Request ID itself
   */
  id: string;
}

interface RequestIDFormatterOptions {
  addToMessage: Boolean;
}

/**
 * Adds request ID data to the log entry.
 *
 * @remarks
 * Requires {@link RequestIdMiddleware} to capture the Request ID from the Request.
 *
 * Adds two variables to the metadata:
 *
 * * `requestId` The RequestIdentifier data structure, or null.
 * * `requestIdString` A string representation, as below:
 *
 * Request ID String:
 *
 * - When an AWS RequestID is present: `[aws:248c9268447e5e1b0b34ef82]`
 * - When no AWS RequestID is present: `[int:2ca17ddf-dc8c-4a36-912a-f0cf9f074331]`
 * - When not within a request: `[no-request]`
 *
 * Example:
 *
 * ``` typescript
 * winston.createLogger({ format: requestId() })
 * ```
 *
 * Options:
 *
 * @param addToMessage Whether `requestIdString` is prepended to the log message (default: `false`)
 */
export const requestIdFormatter = logform.format(
  (info, options?: RequestIDFormatterOptions) => {
    let requestIdString = '[no-request]';
    if (options == undefined) options = { addToMessage: false };

    if (session.active) {
      const requestId = session.get('requestId') as
        | RequestIdentifier
        | undefined;

      if (requestId) {
        requestIdString = `[${requestId.from}:${requestId.id}]`;
        info.requestId = requestId;
      }
    }

    if (options.addToMessage)
      info.message = `${requestIdString} ${info.message}`;
    else info.requestIdString = requestIdString;

    return info;
  }
);

// Utility method to extract the AWS Request ID from the request header.
function getRequestId(req: Request) {
  const traceId = [req.headers['x-amzn-trace-id']].flat()[0];

  if (traceId) {
    const [current] = traceId.split(';', 2);
    const [, , requestId] = current.split('-', 3);

    return requestId;
  }

  return undefined;
}

interface RequestWithRequestIdentifier {
  requestId: RequestIdentifier | null;
}

/**
 * Captures the request from `X-Amzn-Trace-Id` header, and sets it in
 * a continuation local store.
 *
 * @remarks
 * Use the [[requestIdFormatter]] with winston to inject the captured Request ID into
 * log entry information.
 *
 * Request ID information is captured as a [[RequestIdentifier]] into a
 * continuation-local-store, and also placed into the Request object under
 * the `requestId` property.
 *
 * Example:
 *
 * ``` typescript
 * app.use(requestIdMiddleware)
 * ```
 */
export function requestIdMiddleware() {
  return function(
    req: Request & RequestWithRequestIdentifier,
    _res: Response,
    next: NextFunction
  ) {
    session.run(function() {
      let requestId = getRequestId(req);
      let requestStructure: RequestIdentifier | null = null;

      if (requestId) requestStructure = { from: 'aws', id: requestId };
      else requestStructure = { from: 'int', id: uuid.v4() };

      session.set('requestId', requestStructure);
      req.requestId = requestStructure;

      next();
    });
  };
}

/**
 * Convenience format to log request results using express-winston.
 *
 * @remarks
 * Example:
 *
 * expressWinston.logger({ msg: requestLogMessage })
 *
 * Outputs:
 *
 * ```
 * info: GET / -> HTTP 200 in 4ms
 * ```
 */
export const requestLogMessage =
  '{{req.method}} {{req.url}} -> HTTP {{res.statusCode}} in {{ res.responseTime }}ms';
