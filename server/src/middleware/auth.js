import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";

const COOKIE = "dc_admin";

export function signToken(admin) {
  return jwt.sign(
    { sub: String(admin._id), email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

export const AUTH_COOKIE = COOKIE;

/** Reject the request unless a valid admin token is present. */
export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = req.cookies?.[COOKIE] || (header.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token) return res.status(401).json({ error: "Not signed in" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub);

    if (!admin || !admin.active) return res.status(401).json({ error: "Account is not active" });

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired, sign in again" });
  }
}

/** Require a specific role, used to protect destructive admin actions. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: "Not signed in" });
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Your role cannot do that" });
    }
    next();
  };
}
