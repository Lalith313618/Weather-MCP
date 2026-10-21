import type { Request, Response, NextFunction } from "express";
import { ChatMessage } from "../models/chatMessage.model.js";
import { WeatherSearch } from "../models/weatherSearch.model.js";
import { GeminiService } from "../services/gemini.service.js";

const geminiService = new GeminiService();

export class ChatController {
  public static async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({
          success: false,
          error: "Message query is required."
        });
        return;
      }

      const reply = await geminiService.chat(message.trim(), Array.isArray(history) ? history : []);

      res.json({
        success: true,
        reply
      });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to generate AI response with Gemini."
      });
    }
  }

  public static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.query.user as string;
      const sessionId = req.query.sessionId as string;
      const filter: any = {};
      if (user) filter.user = user.toLowerCase().trim();
      if (sessionId) filter.sessionId = sessionId;

      const messages = await ChatMessage.find(filter)
        .sort({ createdAt: 1 })
        .lean();

      res.json({
        success: true,
        count: messages.length,
        messages: messages.map((m) => ({
          id: m._id,
          sender: m.sender,
          text: m.text,
          time: m.time,
          user: m.user,
          sessionId: m.sessionId,
          createdAt: m.createdAt
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  public static async saveMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sender, text, time, user, sessionId } = req.body;

      if (!sender || !["user", "assistant"].includes(sender)) {
        res.status(400).json({
          success: false,
          error: "Valid sender ('user' or 'assistant') is required"
        });
        return;
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({
          success: false,
          error: "Message text cannot be empty"
        });
        return;
      }

      const formattedTime = time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const newMsg = new ChatMessage({
        sender,
        text: text.trim(),
        time: formattedTime,
        user: user ? String(user).toLowerCase().trim() : null,
        sessionId: sessionId ? String(sessionId) : null,
        createdAt: new Date()
      });

      const saved = await newMsg.save();

      res.status(201).json({
        success: true,
        message: {
          id: saved._id,
          sender: saved.sender,
          text: saved.text,
          time: saved.time,
          user: saved.user,
          sessionId: saved.sessionId,
          createdAt: saved.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async clearMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.query.user as string;
      const sessionId = req.query.sessionId as string;
      const filter: any = {};
      if (user) filter.user = user.toLowerCase().trim();
      if (sessionId) filter.sessionId = sessionId;

      const chatDeleteResult = await ChatMessage.deleteMany(filter);
      const searchDeleteResult = await WeatherSearch.deleteMany(filter);

      res.json({
        success: true,
        message: "Chat messages successfully cleared for user",
        deletedChatsCount: chatDeleteResult.deletedCount,
        deletedSearchesCount: searchDeleteResult.deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
}
