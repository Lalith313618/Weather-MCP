import { Component, input, output, signal, ElementRef, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  edited?: boolean;
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
  sendMessage = output<string>();
  editMessage = output<{ index: number; newText: string }>();
  clearChat = output<void>();

  inputText = signal('');
  editingIndex = signal<number | null>(null);
  editingText = signal<string>('');
  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    effect(() => {
      // Re-run effect whenever messages or thinking state changes
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
}
