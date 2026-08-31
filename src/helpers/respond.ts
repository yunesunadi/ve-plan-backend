import { Response } from "express";

type Payload = Record<string, unknown> | undefined;

export function ok(res: Response, message: string, extra?: Payload) {
  return res.status(200).json({ status: "success", message, ...(extra ?? {}) });
}

export function created(res: Response, message: string, extra?: Payload) {
  return res.status(201).json({ status: "success", message, ...(extra ?? {}) });
}

export function badRequest(res: Response, message: string, extra?: Payload) {
  return res.status(400).json({ status: "error", message, ...(extra ?? {}) });
}

export function unauthorized(res: Response, message: string) {
  return res.status(401).json({ status: "error", message });
}

export function forbidden(res: Response, message: string) {
  return res.status(403).json({ status: "error", message });
}

export function notFound(res: Response, message: string) {
  return res.status(404).json({ status: "error", message });
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ status: "error", message });
}

export function gone(res: Response, message: string) {
  return res.status(410).json({ status: "error", message });
}

export function serverError(res: Response, message = "Something went wrong.") {
  return res.status(500).json({ status: "error", message });
}
