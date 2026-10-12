import { Schema, model, Document } from "mongoose";

export interface IChatMessage extends Document {
  sender: "user" | "assistant";
  text: string;
  time: string;
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
