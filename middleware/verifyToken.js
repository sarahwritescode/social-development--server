
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("${process.env.CLIENT_URI}/api/auth/jwks")
);

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "Authorization token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.CLIENT_URI,
      audience: process.env.CLIENT_URI,
    });

    if (!payload.sub || typeof payload.email !== "string") {
      return res.status(401).send({
        success: false,
        message: "Invalid user information in token.",
      });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).send({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
