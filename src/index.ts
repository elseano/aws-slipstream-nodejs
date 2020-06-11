import * as erid from './express-requestid';
import * as cww from './cloudwatch-winston';

module.exports = {
  cloudWatchWinston: cww,
  expressRequestId: {
    winstonFormatter: erid.requestIdFormatter,
    expressMiddleware: erid.requestIdMiddleware,
  },
  expressWinstonRequestMessage: erid.requestLogMessage,
};
