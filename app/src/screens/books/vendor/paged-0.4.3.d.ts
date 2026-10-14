  export class Previewer {
    preview(content: string | DocumentFragment, stylesheets: Record<string, string>[], renderTo: HTMLElement): Promise<{ total: number; performance: number }>
    chunker: { stop(): void; destroy(): void }
    polisher: { destroy(): void }
  }
