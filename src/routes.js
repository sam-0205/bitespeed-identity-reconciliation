import express from "express";
import { identifyContact } from "./identifyController.js";

const router = express.Router();

router.post("/identify", identifyContact);

export default router;