import pinoHttp from "pino-http";
import logger from "../config/pino";

// export const requestLogger = pinoHttp({
//   logger,
//   serializers: {
//     req: (req) => ({
//       id: req.id,
//       method: req.method,
//       url: req.url,
//     }),

//     res: (res) => ({
//       statusCode: res.statusCode,
//     }),
//   },
//   customSuccessMessage: (req, res) => {
//     return `${req.method} ${req.url} ${res.statusCode}`;
//   },

//   customErrorMessage: (req, res, error) => {
//     return `${req.method} ${req.url} ${res.statusCode} - ${error.message}`;
//   },
// });

export const requestLogger = pinoHttp({
  logger,

  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  customErrorMessage: (req, res, error) => {
    return `${req.method} ${req.url} ${res.statusCode} ==> ${error.message}`;
  },

  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
});
