import { NextFunction, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const ALLOWED_MIME = new Set(Object.keys(EXT_BY_MIME));

function storage(subdir: string) {
  const dir = path.join("dist", "photos", subdir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const name = crypto.randomBytes(16).toString("hex");
      cb(null, name + (EXT_BY_MIME[file.mimetype] ?? ""));
    },
  });
}

export function imageUpload(subdir: string) {
  return multer({
    storage: storage(subdir),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new UploadTypeError());
      }
      cb(null, true);
    },
  });
}

export class UploadTypeError extends Error {
  constructor() {
    super("Only JPEG, PNG, or WebP images are allowed.");
    this.name = "UploadTypeError";
  }
}

function sniff(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function verifyImageFile(file?: Express.Multer.File): boolean {
  if (!file) return true;
  try {
    const fd = fs.openSync(file.path, "r");
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    fs.closeSync(fd);
    const real = sniff(head);
    if (real && ALLOWED_MIME.has(real)) return true;
  } catch {
    /* fall through to reject */
  }
  removeUpload(file.filename, path.basename(path.dirname(file.path)));
  return false;
}

export function removeUpload(filename: string | null | undefined, subdir: string) {
  if (!filename || /^https?:\/\//i.test(filename)) return;
  const target = path.join("dist", "photos", subdir, path.basename(filename));
  fs.promises.unlink(target).catch((err) => {
    if (err?.code !== "ENOENT") {
      console.log(`best-effort unlink failed: ${target}`, err);
    }
  });
}

export function uploadErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ status: "error", message: "Image must be 5 MB or smaller." });
    }
    return res.status(400).json({ status: "error", message: "Invalid file upload." });
  }
  if (err instanceof UploadTypeError) {
    return res.status(415).json({ status: "error", message: err.message });
  }
  return next(err);
}

export const STATIC_HEADERS = (res: Response) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
};
