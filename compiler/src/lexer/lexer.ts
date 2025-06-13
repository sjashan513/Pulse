/**
 * @fileoverview The main lexer for the Pulse template language.
 * This file implements a state machine to tokenize the template source code.
 */

import { SourcePosition, Token, TokenType } from './types';

// --- Helper Regular Expressions ---
const isTagNameChar = (char: string) => /[a-zA-Z0-9]/.test(char); // FIX: Allow numbers in tag names
const isWhitespace = (char: string) => /\s/.test(char);


// --- Context Management ---
/**
 * A context object that holds the state of the lexer as it processes the source.
 * This makes it easier to pass the lexer's state between functions.
 */
interface LexerContext {
  readonly source: string;
  offset: number;
  line: number;
  column: number;
}

/**
 * Creates a new lexer context from a source string.
 * @param source The source code to tokenize.
 * @returns A new LexerContext instance.
 */
function createContext(source: string): LexerContext {
  return {
    source,
    offset: 0,
    line: 1,
    column: 1,
  };
}

/**
 * Gets the current position from the context.
 * @param context The current lexer context.
 * @returns A SourcePosition object.
 */
function getCurrentPosition(context: LexerContext): SourcePosition {
  const { offset, line, column } = context;
  return { offset, line, column };
}

/**
 * Advances the lexer's position by a given number of characters,
 * updating the line and column counters as needed.
 * @param context The lexer context to modify.
 * @param numChars The number of characters to advance.
 */
function advanceBy(context: LexerContext, numChars: number): void {
  for (let i = 0; i < numChars; i++) {
    if (context.offset >= context.source.length) break;
    if (context.source[context.offset] === '\n') {
      context.line++;
      context.column = 1;
    } else {
      context.column++;
    }
    context.offset++;
  }
}

// --- Token Creation ---
/**
 * Creates a token with the given type and value, capturing the source location.
 * @param type The type of the token.
 * @param value The raw string value of the token.
 * @param start The starting position of the token.
 * @param end The ending position of the token.
 * @returns A new Token object.
 */
function createToken(type: TokenType, value: string, start: SourcePosition, end: SourcePosition): Token {
  return {
    type,
    value,
    loc: { start, end },
  };
}

// --- Tokenization Logic ---

/**
 * The main entry point for the lexer. It acts as the central dispatcher.
 * @param source The template string to tokenize.
 * @returns An array of Token objects.
 */
export function tokenize(source: string): Token[] {
  const context = createContext(source);
  const tokens: Token[] = [];

  while (context.offset < context.source.length) {
    if (context.source.startsWith('<', context.offset)) {
      tokens.push(...tokenizeTag(context));
    } else if (context.source.startsWith('{{', context.offset)) {
      tokens.push(...tokenizeInterpolation(context));
    } else {
      const textToken = tokenizeText(context);
      // Only push text tokens if they have content.
      if (textToken.value.length > 0) {
          tokens.push(textToken);
      }
    }
  }

  const eofPos = getCurrentPosition(context);
  tokens.push(createToken(TokenType.EOF, '', eofPos, eofPos));

  return tokens;
}

/**
 * Tokenizes an interpolation block from `{{` to `}}`.
 * @param context The lexer context.
 * @returns An array of tokens for the interpolation.
 */
function tokenizeInterpolation(context: LexerContext): Token[] {
    const tokens: Token[] = [];
    const start = getCurrentPosition(context);
    
    advanceBy(context, 2);
    tokens.push(createToken(TokenType.INTERPOLATION_OPEN, '{{', start, getCurrentPosition(context)));

    const endExpressionIndex = context.source.indexOf('}}', context.offset);
    if (endExpressionIndex === -1) {
        // Error case: unclosed interpolation
        const expression = context.source.slice(context.offset);
        const expressionStart = getCurrentPosition(context);
        advanceBy(context, expression.length);
        tokens.push(createToken(TokenType.EXPRESSION, expression, expressionStart, getCurrentPosition(context)));
        return tokens;
    }
    
    const expressionStart = getCurrentPosition(context);
    const expression = context.source.slice(context.offset, endExpressionIndex);
    advanceBy(context, expression.length);
    tokens.push(createToken(TokenType.EXPRESSION, expression.trim(), expressionStart, getCurrentPosition(context)));

    const closeStart = getCurrentPosition(context);
    advanceBy(context, 2);
    tokens.push(createToken(TokenType.INTERPOLATION_CLOSE, '}}', closeStart, getCurrentPosition(context)));

    return tokens;
}

/**
 * Tokenizes a complete tag structure, including its name and attributes.
 * @param context The current lexer context.
 * @returns An array of tokens representing the tag.
 */
function tokenizeTag(context: LexerContext): Token[] {
  const tokens: Token[] = [];
  const start = getCurrentPosition(context);

  if (context.source.startsWith('</', context.offset)) {
    advanceBy(context, 2);
    tokens.push(createToken(TokenType.END_TAG_OPEN, '</', start, getCurrentPosition(context)));
  } else {
    advanceBy(context, 1);
    tokens.push(createToken(TokenType.TAG_OPEN, '<', start, getCurrentPosition(context)));
  }

  const tagNameStart = getCurrentPosition(context);
  let tagName = '';
  // FIX: Use the corrected character check
  while (context.offset < context.source.length && isTagNameChar(context.source[context.offset])) {
    tagName += context.source[context.offset];
    advanceBy(context, 1);
  }
  if (tagName) {
    tokens.push(createToken(TokenType.TAG_NAME, tagName, tagNameStart, getCurrentPosition(context)));
  }

  while (context.offset < context.source.length && context.source[context.offset] !== '>') {
      consumeWhitespace(context);
      if (context.source[context.offset] === '>' || context.offset >= context.source.length) break;
      tokens.push(...tokenizeAttribute(context));
  }

  if (context.offset < context.source.length && context.source[context.offset] === '>') {
    const tagCloseStart = getCurrentPosition(context);
    advanceBy(context, 1);
    tokens.push(createToken(TokenType.TAG_CLOSE, '>', tagCloseStart, getCurrentPosition(context)));
  }

  return tokens;
}

/**
 * Tokenizes a single, complete attribute (name, equals, and value).
 * @param context The current lexer context.
 * @returns An array of tokens for the attribute.
 */
function tokenizeAttribute(context: LexerContext): Token[] {
    const tokens: Token[] = [];
    const start = getCurrentPosition(context);

    const char = context.source[context.offset];
    let tokenType: TokenType;
    switch (char) {
        case ':': tokenType = TokenType.BINDING_NAME; break;
        case '?': tokenType = TokenType.BOOLEAN_BINDING_NAME; break;
        case '.': tokenType = TokenType.PROPERTY_BINDING_NAME; break;
        case '@': tokenType = TokenType.EVENT_HANDLER_NAME; break;
        default: tokenType = TokenType.ATTRIBUTE_NAME; break;
    }

    let name = '';
    while (context.offset < context.source.length && !isWhitespace(context.source[context.offset]) && context.source[context.offset] !== '=' && context.source[context.offset] !== '>') {
        name += context.source[context.offset];
        advanceBy(context, 1);
    }
    tokens.push(createToken(tokenType, name, start, getCurrentPosition(context)));

    consumeWhitespace(context);
    
    if (context.source[context.offset] === '=') {
        const equalsStart = getCurrentPosition(context);
        advanceBy(context, 1);
        tokens.push(createToken(TokenType.EQUALS, '=', equalsStart, getCurrentPosition(context)));
        
        consumeWhitespace(context);

        const quoteChar = context.source[context.offset];
        if (quoteChar === '"' || quoteChar === "'") {
            advanceBy(context, 1); // Skip opening quote
            const valueStart = getCurrentPosition(context);
            
            const endQuoteIndex = context.source.indexOf(quoteChar, context.offset);

            if (endQuoteIndex === -1) {
                // ERROR CASE: Unclosed attribute value. Consume the rest of the source.
                const value = context.source.slice(context.offset);
                advanceBy(context, value.length);
                tokens.push(createToken(TokenType.ATTRIBUTE_VALUE, value, valueStart, getCurrentPosition(context)));
            } else {
                // Normal case
                const value = context.source.slice(context.offset, endQuoteIndex);
                advanceBy(context, value.length);
                tokens.push(createToken(TokenType.ATTRIBUTE_VALUE, value, valueStart, getCurrentPosition(context)));
                advanceBy(context, 1); // Skip closing quote
            }
        }
    }

    return tokens;
}

/**
 * Consumes all subsequent whitespace characters, but does not emit a token.
 * This is a utility function to be called before parsing meaningful tokens.
 * @param context The lexer context.
 */
function consumeWhitespace(context: LexerContext): void {
    while(context.offset < context.source.length && isWhitespace(context.source[context.offset])) {
        advanceBy(context, 1);
    }
}

/**
 * Handles the tokenization of plain text content. It consumes characters
 * until it hits a delimiter ('<' or '{{') or EOF.
 * @param context The current lexer context.
 * @returns A TEXT token.
 */
function tokenizeText(context: LexerContext): Token {
  const start = getCurrentPosition(context);
  let value = '';

  while (context.offset < context.source.length) {
    if (context.source.startsWith('<', context.offset) || context.source.startsWith('{{', context.offset)) {
        break;
    }
    value += context.source[context.offset];
    advanceBy(context, 1);
  }

  return createToken(TokenType.TEXT, value, start, getCurrentPosition(context));
}
