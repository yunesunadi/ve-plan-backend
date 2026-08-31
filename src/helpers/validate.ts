import { NextFunction, Request, Response } from "express";
import { param, body, validationResult, ValidationChain } from "express-validator";

export function handleValidation(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      error: errors.array().map((err: any) => ({ value: err.path, msg: err.msg })),
    });
  }
  next();
}

export function objectIdParam(name = "id", resource = "resource"): ValidationChain {
  return param(name, `Invalid ${resource} id.`).isMongoId();
}

export function objectIdBody(name: string, resource = "resource"): ValidationChain {
  return body(name, `${resource} id is required.`)
    .notEmpty()
    .bail()
    .isMongoId()
    .withMessage(`Invalid ${resource} id.`);
}

export function objectIdArrayBody(
  name: string,
  resource = "resource",
  max = 500
): ValidationChain[] {
  return [
    body(name, `${resource} list is required.`).isArray({ min: 1, max }),
    body(`${name}.*`, `Invalid ${resource} id.`).isMongoId(),
  ];
}
