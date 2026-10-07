// config/swagger.ts
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";

const routes = (file: string) => path.join(__dirname, `../routes/${file}.{ts,js}`); // works in src and dist

const modules = {
  auth: { title: "Auth API", files: ["auth.routes"] },
  mailbox: { title: "Mailbox API", files: ["mailbox.routes"] },
} as const;

export type DocModule = keyof typeof modules;

const buildSpec = (key: DocModule) =>
  swaggerJSDoc({
    definition: {
      openapi: "3.0.3",
      info: { title: modules[key].title, version: "1.0.0" },
      servers: [{ url: "/api/v1" }], // adjust to your base path
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
          ApiResponse: {
            type: "object",
            properties: {
              statusCode: { type: "integer" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    apis: modules[key].files.map(routes),
  });

export const specs = Object.fromEntries((Object.keys(modules) as DocModule[]).map((k) => [k, buildSpec(k)])) as Record<DocModule, object>;

export const swaggerUrls = (Object.keys(modules) as DocModule[]).map((k) => ({
  name: modules[k].title,
  url: `/docs/${k}.json`,
}));
