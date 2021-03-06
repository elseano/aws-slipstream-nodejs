# AWS Slipstream

** ALPHA ** This library is currently under active development, don't depend on it for anything yet!

NodeJS package which smoothes some of the configuration required when working with NodeJS and AWS. This package works well with it's sibling [Slipstream CDK Constructs](https://github.com/elseano/cdk-microservice-constructs), however it's not a requirement that you use it.

The main idea with these two libraries is to streamline the myriad things one needs to configure for production grade deployments. Due to the problem being solved AWS Slipstream is somewhat opinionated, preferring a simple experience over infinite configuration options.

Slipstream aims to codify best practice by:

- Linking request tracing and log correlation.
- Including rich metadata searchable by CloudWatch Insights.

## Winston Logging

Provides Winston formatters which help when streaming logs to CloudWatch Logs (using either the CloudWatch Logs Agent, or awslogs docker driver) ensuring log entries are split correctly.

There are two timestamp formats provided, an ISO8601 format, and a simpler format without timezone information (assumes UTC). For each format object, there's a `winstonTimestamp` property, and a `cloudWatchFormat` property which represents matching format to use in CloudWatch Agent, or awslog driver.

```javascript
const { cloudWatchWinston } = require('aws-slipstream-nodejs');
const winston = require('winston');

const logger = winston.createLogger({
  format: cloudWatchWinston.ISO8601.winstonTimestamp,
});
```

If setting up infrastructure using CDK to handle the above, you might do something like this:

```typescript
taskDefinition.addContainer("Container", {
      image: new ecs.EcrImage(this.imageRepository, "latest"),
      logging: new ecs.AwsLogDriver({
        ...
        datetimeFormat: cloudwatchWinston.ISO8601.cloudWatchFormat,
      }),
      ...
    });
```

Additionally the `cloudWatchWinston` submodule provides a rendering formatter, or you can use your own:

```javascript
const format = winston.format.combine([
  cloudWatchWinston.ISO8601.winstonTimestamp,
  cloudWatchWinston.cloudWatchFormatter(),
]);

const logger = winston.createLogger({ format });

logger.debug('Hi there');
// => 2020-02-20T12:34:23Z +0.231s debug: Hi there
```

## Express Request ID capture and logging

When HTTP(s) request come in via ALBs or API Gateway, AWS adds a Request ID header. Slipstream helps handle this by capturing the header and adding it into the request context, and optionally, the Winston logger output.

```javascript
var express = require('express');
const winston = require('winston');
const { expressRequestId } = require('aws-slipstream-nodejs');

var app = express();

const logger = winston.createLogger({
  format: expressRequestId.winstonFormatter(),
});

app.use(expressRequestId.expressMiddleware());
```

The Winston formatter fetches the current request ID using CLS-hooked, so it works throughout a request call chain.

The Request ID is added to the log entry metadata, and can optionally prepend the requests into the log message.

## Express friendly request output

A friendly HTTP request logging output message is provided, which adds some additional details about the express request when using `express-winston`.

```javascript
var express = require('express');
const expressWinston = require('express-winston');
const { expressWinstonRequestMessage } = require('aws-slipstream-nodejs');

const requestLogging = expressWinston.logger({
  msg: expressWinstonRequestMessage,
});

const app = express();

app.use(requestLogging);
```

## Combined example

```javascript
var express = require('express');
const winston = require('winston');
const {
  expressRequestId,
  cloudWatchWinston,
  expressWinstonRequestMessage,
} = require('aws-slipstream-nodejs');

var app = express();

const format = winston.format.combine([
  cloudWatchWinston.ISO8601.winstonTimestamp,
  expressRequestId.winstonFormatter({ addToMessage: true }),
  cloudWatchWinston.cloudWatchFormatter(),
]);

const logger = winston.createLogger({ format });
const expressLogger = expressWinston.logger({
  winstonInstance: logger,
  msg: expressWinstonRequestMessage,
});

app.use(expressRequestId.expressMiddleware());
app.use(expressLogger);
```

Using the above, express HTTP requests will be logged as below:

```
2020-06-11 05:49:22 +0000 +0.442s [aws:248c9268447e5e1b0b34ef82] info: GET / -> HTTP 200 in 4ms
--------------------------------- ------------------------------       ------------------------
 |                                 + Request ID (addToMessage: true)    |
 + CloudWatch Timestamp                                                 + expressWinstonRequestMessage

```

Additionally, any other `logger.log` messages, either inside the request handler, or inside other calls made for that request:

```
2020-06-11 05:49:22 +0000 +0.829s [aws:248c9268447e5e1b0b34ef82] debug: Loading user from DB { userId: 102 }
--------------------------------- ------------------------------        -------------------- ---------------
 |                                 + Request ID (addToMessage: true)     |                    + Log metadata
 + CloudWatch Timestamp                                                  + Log message

```

When specifying `addToMessage: false` (the default behaviour), the Request ID isn't added to the message line, but rather included in the log metadata as below:

```
2020-06-11 05:49:22 +0000 +0.829s  debug: Loading user from DB { userId: 102, requestId: { from: "AWS", id: "248c9268447e5e1b0b34ef82" } }
---------------------------------         -------------------- ---------------------------------------------------------------------------
 |                                         |                    + Log metadata |
 + CloudWatch Timestamp                    + Log message                       |
                                                                               + Request ID (addToMessage: false)
```
