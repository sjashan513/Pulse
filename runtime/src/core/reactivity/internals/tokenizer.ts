// core-structures/reactivity/internals/tokenizer.ts
export interface Token {
    type: 'text' | 'tag-open' | 'tag-close';
    value: string;
    attributes?: { name: string; value: string }[] | undefined;
    start?: number | undefined;
    end?: number | undefined;
  }
  
  type State = 'TEXT' | 'TAG_OPEN' | 'TAG_CLOSE' | 'ATTRIBUTE' | 'ATTR_VALUE';
  
  export interface Transition {
    action: 'CONSUME' | 'SWITCH_STATE' | 'EMIT_TOKEN';
    next?: State;
    emit?: Token;
  }
  
  const charCategories = new Array(128).fill('other');
  
  const initCharCategories = () => {
    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) charCategories[c] = 'default';
    for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) charCategories[c] = 'default';
    for (let c = '0'.charCodeAt(0); c <= '9'.charCodeAt(0); c++) charCategories[c] = 'default';
    charCategories['<'.charCodeAt(0)] = '<';
    charCategories['>'.charCodeAt(0)] = '>';
    charCategories['/'.charCodeAt(0)] = '/';
    charCategories['='.charCodeAt(0)] = '=';
    charCategories['"'.charCodeAt(0)] = 'quote';
    charCategories["'".charCodeAt(0)] = 'quote';
    charCategories['@'.charCodeAt(0)] = 'default';
    charCategories[' '.charCodeAt(0)] = 'whitespace';
    charCategories['\n'.charCodeAt(0)] = 'whitespace';
    charCategories['\t'.charCodeAt(0)] = 'whitespace';
    charCategories['('.charCodeAt(0)] = 'paren';
    charCategories[')'.charCodeAt(0)] = 'paren';
  };
  initCharCategories();
  
  export const getCharCategory = (char: string): string => {
    const code = char.charCodeAt(0);
    return code < 128 ? charCategories[code] : 'other';
  };
  
  export const transitionTable: Partial<Record<State, Record<string, Transition>>> = {
    TEXT: {
      '<': { action: 'SWITCH_STATE', next: 'TAG_OPEN' }, // Emit text before switching
      default: { action: 'CONSUME' },
    },
    TAG_OPEN: {
      '/': { action: 'SWITCH_STATE', next: 'TAG_CLOSE' },
      '>': {
        action: 'EMIT_TOKEN',
        emit: { type: 'tag-open', value: '' },
        next: 'TEXT',
      },
      whitespace: { action: 'SWITCH_STATE', next: 'ATTRIBUTE' },
      default: { action: 'CONSUME' },
    },
    TAG_CLOSE: {
      '>': {
        action: 'EMIT_TOKEN',
        emit: { type: 'tag-close', value: '' },
        next: 'TEXT',
      },
      default: { action: 'CONSUME' },
    },
    ATTRIBUTE: {
      quote: { action: 'SWITCH_STATE', next: 'ATTR_VALUE' },
      '=': { action: 'SWITCH_STATE', next: 'ATTR_VALUE' },
      '>': {
        action: 'EMIT_TOKEN',
        emit: { type: 'tag-open', value: '' },
        next: 'TEXT',
      },
      whitespace: { action: 'CONSUME' },
      default: { action: 'CONSUME' },
    },
    ATTR_VALUE: {
      quote: { action: 'SWITCH_STATE', next: 'ATTRIBUTE' },
      whitespace: { action: 'SWITCH_STATE', next: 'ATTRIBUTE' },
      '>': { action: 'SWITCH_STATE', next: 'ATTRIBUTE' },
      default: { action: 'CONSUME' },
    },
  };
  
  export class Tokenizer {
    private input: string;
    private pos: number = 0;
    private state: State = 'TEXT';
    private buffer: string[] = [];
    private tokens: Token[] = [];
    private currentTag: string[] = [];
    private currentAttrName: string[] = [];
    private currentAttrValue: string[] = [];
    private attributes: { name: string; value: string }[] = [];
    private tokenStart: number = 0;
  
    constructor(input: string) {
      this.input = this.preprocess(input);
    }
  
    private preprocess(input: string): string {
      let result = input.replace(/<!--[\s\S]*?-->/g, '');
      result = result.replace(/>([\s\t\n]+)</g, '><');
      result = result.replace(/\s+/g, ' ').trim();
      return result;
    }
  
    tokenize(): Token[] {
      while (this.pos < this.input.length) {
        const char = this.input[this.pos];
        const category = getCharCategory(char);
        const transition = transitionTable[this.state]?.[category] || transitionTable[this.state]?.['default'];
  
        if (!transition) throw new Error(`Unexpected character "${char}" at ${this.pos}`);
  
  
        switch (transition.action) {
          case 'CONSUME':
            if (this.state === 'TAG_OPEN' || this.state === 'TAG_CLOSE') {
              this.currentTag.push(char);
            } else if (this.state === 'ATTRIBUTE') {
              this.currentAttrName.push(char);
            } else if (this.state === 'ATTR_VALUE') {
              this.currentAttrValue.push(char);
            } else {
              this.buffer.push(char);
            }
            this.pos++;
            break;
          case 'SWITCH_STATE':
            if (this.state === 'ATTRIBUTE' && this.currentAttrName.length) {
              this.attributes.push({ name: this.currentAttrName.join(''), value: '' });
              this.currentAttrName = [];
            } else if (this.state === 'ATTR_VALUE' && this.currentAttrValue.length) {
              this.attributes[this.attributes.length - 1].value = this.currentAttrValue.join('');
              this.currentAttrValue = [];
            }
            this.state = transition.next!;
            this.pos++;
            break;
          case 'EMIT_TOKEN':
            if (this.buffer.length) {
              const textToken = {
                type: 'text' as const,
                value: this.buffer.join(''),
                start: this.tokenStart,
                end: this.pos,
              };
              this.tokens.push(textToken);
              this.buffer = [];
            }
            if (this.state === 'TAG_OPEN' || this.state === 'TAG_CLOSE' || this.state === 'ATTRIBUTE') {
              if (transition.emit) {
                const tagValue = this.currentTag.join('').trim();
                if (tagValue) {
                  transition.emit.value = tagValue;
                  transition.emit.attributes = this.attributes.length > 0 ? this.attributes : undefined;
                  transition.emit.start = this.tokenStart;
                  transition.emit.end = this.pos + 1; // Include the > character
                  this.tokens.push(transition.emit);
                  this.currentTag = [];
                  this.attributes = [];
                }
              }
            }
            this.state = transition.next || this.state;
            this.tokenStart = this.pos + 1; // Update tokenStart after emitting
            this.pos++;
            break;
        }
      }
      if (this.buffer.length) {
        const textToken = {
          type: 'text' as const,
          value: this.buffer.join(''),
          start: this.tokenStart,
          end: this.pos,
        };
        this.tokens.push(textToken);
      }
      return this.tokens;
    }
  }