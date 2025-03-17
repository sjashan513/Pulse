// core-structures/reactivity/internals/parser.ts
import { signalGraph } from "./signalGraph";
import { Token, Tokenizer } from "./tokenizer";

export interface AstNode {
  type: string;
  tag?: string;
  attributes?: { name: string; value: string; signal?: string | null; isDirective?: boolean }[] | undefined;
  children?: AstNode[];
  events?: { [key: string]: string } | undefined;
  value?: string;
  signal?: string | null; // For text nodes with a single signal
  nodeId?: string; // To identify DOM nodes
  start?: number | undefined;
  end?: number | undefined;
}

const preprocess = (input: string): string => {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ') // Collapse remaining whitespace
    .trim();
};

const astCache = new Map<string, AstNode>();

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private nodeCounter: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private extractSignal(value: string): string | null {
    if (value.endsWith('()')) {
      const signalName = value.slice(0, -2);
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(signalName)) {
        return signalName;
      }
    }
    return null;
  }

  parse(): AstNode {
    const root: AstNode = {
      type: 'element',
      tag: 'root',
      children: [],
      start: 0,
      end: this.tokens[this.tokens.length - 1]?.end || 0,
    };
    const stack: AstNode[] = [root];

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];

      if (token.type === 'text') {
        const signal = this.extractSignal(token.value);
        const node: AstNode = {
          type: 'text',
          value: token.value.trim(),
          signal: signal || null,
          nodeId: `node-${this.nodeCounter++}`,
          start: token.start,
          end: token.end,
        };
        if (signal) {
          const prefix = token.value.slice(0, token.value.indexOf(signal + '()')).trim();
          signalGraph.addBinding(signal, {
            signal,
            operation: 'setText',
            target: node.nodeId!,
            prefix,
          });
        }
        stack[stack.length - 1].children!.push(node);
      } else if (token.type === 'tag-open') {
        const attributes = token.attributes?.map((attr) => {
          const signal = this.extractSignal(attr.value);
          const isDirective = attr.name.startsWith('@');
          if (signal && isDirective) {
            const eventName = attr.name.slice(1);
            const nodeId = `node-${this.nodeCounter}`;
            signalGraph.addBinding(signal, {
              signal,
              operation: 'setEvent',
              target: nodeId,
              event: eventName,
            });
          }
          return { ...attr, ...(signal ? { signal } : {}), isDirective };
        }) || [];
        const node: AstNode = {
          type: 'element',
          tag: token.value,
          attributes,
          children: [],
          nodeId: `node-${this.nodeCounter++}`,
          start: token.start,
          end: token.end,
          events: attributes
            .filter(attr => attr.isDirective)
            .reduce((acc, attr) => {
              acc[attr.name.slice(1)] = attr.value;
              return acc;
            }, {} as { [key: string]: string }),
        };
        stack[stack.length - 1].children!.push(node);
        stack.push(node);
      } else if (token.type === 'tag-close') {
        if (stack.length <= 1) {
          throw new Error(`Unexpected closing tag "${token.value}" at pos ${this.pos}`);
        }
        const node = stack.pop()!;
        node.end = token.end;
      }
      this.pos++;
    }
    if (stack.length > 1) {
      const unclosedTags = stack.slice(1).map(node => node.tag).join(', ');
      throw new Error(`Unclosed tags: ${unclosedTags}`);
    }
    return root.children![0] || root;
  }
}

export function parseHtml(input: string): AstNode {
  const processedInput = preprocess(input);
  if (astCache.has(processedInput)) return astCache.get(processedInput)!;
  const tokenizer = new Tokenizer(processedInput);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  astCache.set(processedInput, ast);
  return ast;
}