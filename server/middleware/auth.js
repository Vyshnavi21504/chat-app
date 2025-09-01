import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Middleware to protect routes by verifying a JWT token
export const protectRoute = async (req, res, next) => {
    try {
        // Get the token from the 'Authorization' header. 
        // The header format is typically "Bearer <token>".
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(" ")[1]; // Extract the token string from the header
        if (!token) {
            return res.status(401).json({ success: false, message: "Invalid token format" });
        }

        // Verify the token using the secret key from your environment variables
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        // Find the user by ID from the decoded token payload and exclude the password field
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Attach the user object to the request for use in subsequent middleware or controllers
        req.user = user;
        next();
    } catch (error) {
        // This catch block handles all errors, including token expiration and verification failures
        console.error("Authentication error:", error.message);
        res.status(401).json({ success: false, message: "Unauthorized access" });
    }
};

// This controller checks if a user is authenticated. It's safe to use `req.user` here
// because it would have been attached by the `protectRoute` middleware.
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};
