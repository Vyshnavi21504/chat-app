import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
    // This is where the token is signed.
    // The secret key MUST match the one in your .env file and middleware
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "15d",
    });
    return token;
};