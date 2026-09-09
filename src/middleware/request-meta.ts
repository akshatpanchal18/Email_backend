import { UAParser } from "ua-parser-js";
import { Request, Response, NextFunction } from "express";
export interface RequestMeta {
  ip: string | undefined;

  device: {
    type: string;
    model: string | undefined;
    vendor: string | undefined;
  };

  browser: {
    name: string | undefined;
    version: string | undefined;
  };

  os: {
    name: string | undefined;
    version: string | undefined;
  };

  userAgent: string;

  method: string;

  url: string;

  timestamp: Date;
}
export const requestMeta = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userAgent = req.get("user-agent") ?? "";

  const parser = new UAParser(userAgent);

  const result = parser.getResult();

  const meta: RequestMeta = {
    ip: req.ip,

    device: {
      type: result.device.type ?? "desktop",
      model: result.device.model,
      vendor: result.device.vendor,
    },

    browser: {
      name: result.browser.name,
      version: result.browser.version,
    },

    os: {
      name: result.os.name,
      version: result.os.version,
    },

    userAgent,

    method: req.method,
    url: req.originalUrl,

    timestamp: new Date(),
  };

  console.log(meta);
  req.meta = meta;
  next();
};
