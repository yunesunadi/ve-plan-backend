import { Request, Response } from "express";
import { validationResult } from "express-validator";

export function isRequestInvalid(req: Request, res: Response) {
  const errors = validationResult(req);

  if(errors.array().length > 0) {
    res.status(400).json({
      status: "error",
      message: "Validation error",
      error: errors.array().map((err: any) => ({ value: err.path, msg: err.msg  }))
    });
    return true;
  }

  return false;
}