// core/compiler/reactivity/internals/tokenizer.ts
export interface Token {
    type: 'text' | 'tag-open' | 'tag-close';
    value: string;
    attributes?: { name: string; value: string }[] | undefined;
    start?: number | undefined;
    end?: number | undefined;
  }
  
  type State = 'TEXT' | 'TAG_OPEN' | 'TAG_CLOSE' | 'ATTRIBUTE' | 'ATTR_VALUE';
  
  // Numeric enum for states to avoid string comparisons
  const enum StateId {
    TEXT = 0,
    TAG_OPEN = 1,
    TAG_CLOSE = 2,
    ATTRIBUTE = 3,
    ATTR_VALUE = 4,
  }
  
  // Numeric enum for character categories using bitmasks
  const enum CharCategory {
    OTHER = 0,
    DEFAULT = 1 << 0, // Letters, digits, @
    WHITESPACE = 1 << 1, // Space, newline, tab
    TAG_OPEN = 1 << 2, // <
    TAG_CLOSE = 1 << 3, // >
    SLASH = 1 << 4, // /
    EQUALS = 1 << 5, // =
    QUOTE = 1 << 6, // " or '
    PAREN = 1 << 7, // ( or )
  }
  
  // Numeric enum for actions
  const enum Action {
    CONSUME = 0,
    SWITCH_STATE = 1,
    EMIT_TOKEN = 2,
  }
  
  interface Transition {
    action: Action;
    nextState?: StateId;
    emitType?: 'text' | 'tag-open' | 'tag-close';
  }
  
  // Lookup table for character categories (128 for ASCII)
  const charCategories = new Uint8Array(128);
  
  // Initialize character categories using bitmasks
  const initCharCategories = () => {
    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) charCategories[c] = CharCategory.DEFAULT;
    for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) charCategories[c] = CharCategory.DEFAULT;
    for (let c = '0'.charCodeAt(0); c <= '9'.charCodeAt(0); c++) charCategories[c] = CharCategory.DEFAULT;
    charCategories['<'.charCodeAt(0)] = CharCategory.TAG_OPEN;
    charCategories['>'.charCodeAt(0)] = CharCategory.TAG_CLOSE;
    charCategories['/'.charCodeAt(0)] = CharCategory.SLASH;
    charCategories['='.charCodeAt(0)] = CharCategory.EQUALS;
    charCategories['"'.charCodeAt(0)] = CharCategory.QUOTE;
    charCategories["'".charCodeAt(0)] = CharCategory.QUOTE;
    charCategories['@'.charCodeAt(0)] = CharCategory.DEFAULT;
    charCategories[' '.charCodeAt(0)] = CharCategory.WHITESPACE;
    charCategories['\n'.charCodeAt(0)] = CharCategory.WHITESPACE;
    charCategories['\t'.charCodeAt(0)] = CharCategory.WHITESPACE;
    charCategories['('.charCodeAt(0)] = CharCategory.PAREN;
    charCategories[')'.charCodeAt(0)] = CharCategory.PAREN;
  };
  initCharCategories();
  
  // Predefined character category masks for transitions
  const CATEGORY_DEFAULT = CharCategory.DEFAULT | CharCategory.PAREN;
  const CATEGORY_QUOTE = CharCategory.QUOTE;
  const CATEGORY_WHITESPACE = CharCategory.WHITESPACE;
  
  // State transition table: [state][category] -> Transition
  const transitionTable: Transition[][] = Array.from({ length: 5 }, () => []);
  
  // Initialize transition table
  const initTransitionTable = () => {
    // TEXT state
    transitionTable[StateId.TEXT][CharCategory.TAG_OPEN] = { action: Action.SWITCH_STATE, nextState: StateId.TAG_OPEN };
    transitionTable[StateId.TEXT][CATEGORY_DEFAULT] = { action: Action.CONSUME };
    transitionTable[StateId.TEXT][CharCategory.WHITESPACE] = { action: Action.CONSUME };
    transitionTable[StateId.TEXT][0] = { action: Action.CONSUME }; // OTHER
  
    // TAG_OPEN state
    transitionTable[StateId.TAG_OPEN][CharCategory.SLASH] = { action: Action.SWITCH_STATE, nextState: StateId.TAG_CLOSE };
    transitionTable[StateId.TAG_OPEN][CharCategory.TAG_CLOSE] = {
      action: Action.EMIT_TOKEN,
      emitType: 'tag-open',
      nextState: StateId.TEXT,
    };
    transitionTable[StateId.TAG_OPEN][CharCategory.WHITESPACE] = { action: Action.SWITCH_STATE, nextState: StateId.ATTRIBUTE };
    transitionTable[StateId.TAG_OPEN][CATEGORY_DEFAULT] = { action: Action.CONSUME };
    transitionTable[StateId.TAG_OPEN][0] = { action: Action.CONSUME }; // OTHER
  
    // TAG_CLOSE state
    transitionTable[StateId.TAG_CLOSE][CharCategory.TAG_CLOSE] = {
      action: Action.EMIT_TOKEN,
      emitType: 'tag-close',
      nextState: StateId.TEXT,
    };
    transitionTable[StateId.TAG_CLOSE][CATEGORY_DEFAULT] = { action: Action.CONSUME };
    transitionTable[StateId.TAG_CLOSE][0] = { action: Action.CONSUME }; // OTHER
  
    // ATTRIBUTE state
    transitionTable[StateId.ATTRIBUTE][CharCategory.QUOTE] = { action: Action.SWITCH_STATE, nextState: StateId.ATTR_VALUE };
    transitionTable[StateId.ATTRIBUTE][CharCategory.EQUALS] = { action: Action.SWITCH_STATE, nextState: StateId.ATTR_VALUE };
    transitionTable[StateId.ATTRIBUTE][CharCategory.TAG_CLOSE] = {
      action: Action.EMIT_TOKEN,
      emitType: 'tag-open',
      nextState: StateId.TEXT,
    };
    transitionTable[StateId.ATTRIBUTE][CharCategory.WHITESPACE] = { action: Action.CONSUME };
    transitionTable[StateId.ATTRIBUTE][CATEGORY_DEFAULT] = { action: Action.CONSUME };
    transitionTable[StateId.ATTRIBUTE][0] = { action: Action.CONSUME }; // OTHER
  
    // ATTR_VALUE state
    transitionTable[StateId.ATTR_VALUE][CharCategory.QUOTE] = { action: Action.SWITCH_STATE, nextState: StateId.ATTRIBUTE };
    transitionTable[StateId.ATTR_VALUE][CharCategory.WHITESPACE] = { action: Action.SWITCH_STATE, nextState: StateId.ATTRIBUTE };
    transitionTable[StateId.ATTR_VALUE][CharCategory.TAG_CLOSE] = { action: Action.SWITCH_STATE, nextState: StateId.ATTRIBUTE };
    transitionTable[StateId.ATTR_VALUE][CATEGORY_DEFAULT] = { action: Action.CONSUME };
    transitionTable[StateId.ATTR_VALUE][0] = { action: Action.CONSUME }; // OTHER
  };
  initTransitionTable();
  
  export class TokenizerV2 {
    private input: string;
    private pos: number = 0;
    private state: StateId = StateId.TEXT;
    private buffer: string = '';
    private tokens: Token[] = [];
    private currentTag: string = '';
    private currentAttrName: string = '';
    private currentAttrValue: string = '';
    private attributes: { name: string; value: string }[] = [];
    private tokenStart: number = 0;
  
    constructor(input: string) {
      this.input = input; // Pre-processing moved to tokenization
    }
  
    private preprocessChar(char: string, pos: number): boolean {
      // Skip comments manually during tokenization
      if (char === '<' && this.input.startsWith('<!--', pos)) {
        const end = this.input.indexOf('-->', pos + 4);
        if (end === -1) throw new Error('Unclosed comment at position ' + pos);
        this.pos = end + 3;
        return true;
      }
      return false;
    }
  
    tokenize(): Token[] {
      while (this.pos < this.input.length) {
        const charCode = this.input.charCodeAt(this.pos);
        if (charCode >= 128) throw new Error(`Unsupported character at position ${this.pos}`);
  
        const category = charCategories[charCode];
        let transition = transitionTable[this.state][category];
        if (!transition) {
          // Fallback for categories with multiple bits
          if (category & CATEGORY_DEFAULT) transition = transitionTable[this.state][CATEGORY_DEFAULT];
          else if (category & CATEGORY_QUOTE) transition = transitionTable[this.state][CATEGORY_QUOTE];
          else if (category & CATEGORY_WHITESPACE) transition = transitionTable[this.state][CATEGORY_WHITESPACE];
          else transition = transitionTable[this.state][0]; // OTHER
        }
  
        if (this.preprocessChar(this.input[this.pos], this.pos)) continue;
  
        switch (transition.action) {
          case Action.CONSUME:
            if (this.state === StateId.TAG_OPEN || this.state === StateId.TAG_CLOSE) {
              this.currentTag += this.input[this.pos];
            } else if (this.state === StateId.ATTRIBUTE) {
              this.currentAttrName += this.input[this.pos];
            } else if (this.state === StateId.ATTR_VALUE) {
              this.currentAttrValue += this.input[this.pos];
            } else {
              this.buffer += this.input[this.pos];
            }
            this.pos++;
            break;
          case Action.SWITCH_STATE:
            if (this.state === StateId.ATTRIBUTE && this.currentAttrName.length) {
              this.attributes.push({ name: this.currentAttrName, value: '' });
              this.currentAttrName = '';
            } else if (this.state === StateId.ATTR_VALUE && this.currentAttrValue.length) {
              this.attributes[this.attributes.length - 1].value = this.currentAttrValue;
              this.currentAttrValue = '';
            }
            this.state = transition.nextState!;
            this.pos++;
            break;
          case Action.EMIT_TOKEN:
            if (this.buffer.length) {
              const textToken: Token = {
                type: 'text',
                value: this.buffer.trim(),
                start: this.tokenStart,
                end: this.pos,
              };
              this.tokens.push(textToken);
              this.buffer = '';
            }
            if (
              this.state === StateId.TAG_OPEN ||
              this.state === StateId.TAG_CLOSE ||
              this.state === StateId.ATTRIBUTE
            ) {
              const tagValue = this.currentTag.trim();
              if (tagValue) {
                const token: Token = {
                  type: transition.emitType!,
                  value: tagValue,
                  attributes: this.attributes.length > 0 ? this.attributes : undefined,
                  start: this.tokenStart,
                  end: this.pos + 1,
                };
                this.tokens.push(token);
                this.currentTag = '';
                this.attributes = [];
              }
            }
            this.state = transition.nextState || this.state;
            this.tokenStart = this.pos + 1;
            this.pos++;
            break;
        }
      }
  
      if (this.buffer.length) {
        const textToken: Token = {
          type: 'text',
          value: this.buffer.trim(),
          start: this.tokenStart,
          end: this.pos,
        };
        this.tokens.push(textToken);
      }
      return this.tokens;
    }
  }