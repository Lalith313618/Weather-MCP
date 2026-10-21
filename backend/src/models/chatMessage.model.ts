import { Schema, model, Document } from "mongoose";

export interface IChatMessage extends Document {
  sender: "user" | "assistant";
  text: string;
  time: string;
  user?: string | null;
  sessionId?: string | null;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: false,
      default: null,
      index: true
    },
    sessionId: {
      type: String,
      required: false,
      default: null,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

export const ChatMessage = model<IChatMessage>("ChatMessage", chatMessageSchema);
