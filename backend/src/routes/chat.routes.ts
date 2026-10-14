import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";

const router = Router();

router.post("/chat", ChatController.handleChat);
router.get("/chat/messages", ChatController.getMessages);
router.post("/chat/messages", ChatController.saveMessage);
router.delete("/chat/messages", ChatController.clearMessages);

export default router;
