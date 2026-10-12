import type { Request, Response, NextFunction } from "express";
import { ChatMessage } from "../models/chatMessage.model.js";
import { WeatherSearch } from "../models/weatherSearch.model.js";

export class ChatController {
  public static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await ChatMessage.find()
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
          createdAt: m.createdAt
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  public static async saveMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sender, text, time } = req.body;

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

      const saved = await ChatMessage.create({
        sender,
        text: text.trim(),
        time: formattedTime,
        createdAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: {
          id: saved._id,
          sender: saved.sender,
          text: saved.text,
          time: saved.time,
          createdAt: saved.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async clearMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear all chat records from the database
      const chatDeleteResult = await ChatMessage.deleteMany({});
      
      // Also clear search history logs so all related data is purged
      const searchDeleteResult = await WeatherSearch.deleteMany({});

      res.json({
        success: true,
        message: "Chat messages and search history successfully cleared from database",
        deletedChatsCount: chatDeleteResult.deletedCount,
        deletedSearchesCount: searchDeleteResult.deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
}
