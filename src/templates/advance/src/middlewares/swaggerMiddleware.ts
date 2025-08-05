// src/middlewares/swaggerMiddleware.ts
import { generateOpenApiDocument as generateOpenApiDocumentV1 } from "@/api/v1/docs/openapi.js";
import { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocumentV1 = generateOpenApiDocumentV1();

export const swaggerUiMiddleware = swaggerUi.serve;

export const getSwaggerUiSetup = (document: any) => swaggerUi.setup(document);

export const openApiJsonHandlerV1 = (req: Request, res: Response) => {
  res.json(swaggerDocumentV1);
};
