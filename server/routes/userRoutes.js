import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {login, signup, checkAuth, updateProfile} from "../controllers/userController.js";
const userRouter = express.Router();

userRouter.post("/signup", signup); // no protectRoute here
userRouter.post("/login", login);   // no protectRoute here
userRouter.get("/check",protectRoute ,checkAuth);
userRouter.put("/update-profile",protectRoute ,updateProfile);


export default userRouter;