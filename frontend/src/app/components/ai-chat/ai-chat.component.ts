import { Component, input, output, signal, ElementRef, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  edited?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  userEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  messages: ChatMessage[];
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.css'
})
export class AiChatComponent {
  messages = input<ChatMessage[]>([]);
  thinking = input<boolean>(false);
  clearing = input<boolean>(false);
  sessions = input<ChatSession[]>([]);
  activeSessionId = input<string>('');

  sendMessage = output<string>();
  editMessage = output<{ index: number; newText: string }>();
  clearChat = output<void>();
  newChat = output<void>();
  selectSession = output<string>();
  deleteSession = output<string>();

  inputText = signal('');
  editingIndex = signal<number | null>(null);
  editingText = signal<string>('');
  showHistory = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth > 1024 : false);
  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    effect(() => {
      this.messages();
      this.thinking();
      setTimeout(() => {
        const el = this.messagesContainer()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }, 50);
    });
  }

  toggleHistory(): void {
    this.showHistory.update((v) => !v);
  }

  onNewChat(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.showHistory.set(false);
    }
    this.newChat.emit();
  }

  onSelectSession(id: string): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.showHistory.set(false);
    }
    this.selectSession.emit(id);
  }

  onDeleteSession(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.deleteSession.emit(id);
  }

  send(): void {
    const text = this.inputText().trim();
    if (text) {
      this.sendMessage.emit(text);
      this.inputText.set('');
    }
  }

  ask(query: string): void {
    this.sendMessage.emit(query);
  }

  onClear(): void {
    this.clearChat.emit();
  }

  startEdit(index: number, text: string): void {
    this.editingIndex.set(index);
    this.editingText.set(text);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
    this.editingText.set('');
  }

  saveEdit(index: number): void {
    const newText = this.editingText().trim();
    if (newText && newText !== this.messages()[index]?.text) {
      this.editMessage.emit({ index, newText });
    }
    this.cancelEdit();
  }

  formatMessage(text: string): string {
    if (!text) return '';
    return text
      // 1. Remove leaked tool execution strings like forturn:defaultapi:getWeatherForecast{...}result:[...]表现 or similar
      .replace(/(?:for\s*turn|forturn|call)?[:\s]*(?:default_?api:)?\w+\s*\{[\s\S]*?\}\s*result:\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/gi, '')
      // 2. Catch any generic forturn/defaultapi or result traces
      .replace(/(?:for\s*turn|forturn|default_?api)[\s\S]*?(?:[\u4e00-\u9fa5]|result:[\s\S]*?\]|result:[\s\S]*?\})\s*/gi, '')
      // 3. Catch raw json arrays/objects emitted before answer if any
      .replace(/^(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/g, '')
      // 4. Strip any leftover Chinese/Asian internal tokens like 表现
      .replace(/^[\s\u4e00-\u9fa5:]+/g, '')
      // 5. Clean markdown headers and symbols
      .replace(/^#{1,6}\s*(.*?)$/gm, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^\s*[\*\-]\s+/gm, '• ')
      .replace(/\*\*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}