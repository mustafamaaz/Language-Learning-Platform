import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import {
  upsertUser,
  findUserById,
  createRefreshToken,
  rotateRefreshToken,
  deleteAllRefreshTokens,
} from "../services/authService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
const ACCESS_TOKEN_EXPIRY = "15m";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    path: "/api/auth",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    path: "/api/auth",
  });
}

export async function googleLogin(req, res) {
  const { credential, role } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Invalid Google credential." });
  }

  const user = await upsertUser({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.picture,
  });

  if (role === "admin" && user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "This account does not have admin privileges." });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  setRefreshCookie(res, `${user.id}:${refreshToken}`);

  return res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
  });
}

export async function refresh(req, res) {
  const cookie = req.cookies?.refresh_token;
  if (!cookie) {
    return res.status(401).json({ message: "No refresh token." });
  }

  const separatorIdx = cookie.indexOf(":");
  if (separatorIdx === -1) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Malformed refresh token." });
  }

  const userId = cookie.slice(0, separatorIdx);
  const rawToken = cookie.slice(separatorIdx + 1);

  const newRaw = await rotateRefreshToken(userId, rawToken);
  if (!newRaw) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Refresh token is invalid or revoked." });
  }

  const user = await findUserById(userId);
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "User not found." });
  }

  const accessToken = signAccessToken(user);
  setRefreshCookie(res, `${user.id}:${newRaw}`);

  return res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
  });
}

export async function logout(req, res) {
  const cookie = req.cookies?.refresh_token;
  if (cookie) {
    const userId = cookie.split(":")[0];
    await deleteAllRefreshTokens(userId).catch(() => {});
  }

  clearRefreshCookie(res);
  return res.json({ message: "Logged out." });
}

export async function me(req, res) {
  const user = await findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    role: user.role,
  });
}
