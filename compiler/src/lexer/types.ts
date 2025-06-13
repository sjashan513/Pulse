/**
 * @fileoverview Defines the token types and structures for the Pulse lexer.
 */

/**
 * An enum representing all possible token types that the lexer can produce.
 */
export enum TokenType {
    // Structural Tokens
    TAG_OPEN,           // <
    TAG_CLOSE,          // >
    TAG_END,            // />
    END_TAG_OPEN,       // </
    EQUALS,             // =
  
    // Content Tokens
    TAG_NAME,           // e.g., "div", "p", "my-component"
    TEXT,               // Plain text content between tags
  
    // Attribute-related Tokens
    ATTRIBUTE_NAME,        // A standard static attribute name, e.g., "id", "class"
    BINDING_NAME,          // An attribute name for a standard binding, prefixed with ':', e.g., ":href"
    BOOLEAN_BINDING_NAME,  // An attribute name for a boolean binding, prefixed with '?', e.g., "?disabled"
    PROPERTY_BINDING_NAME, // An attribute name for a property binding, prefixed with '.', e.g., ".value"
    EVENT_HANDLER_NAME,    // An attribute name for an event handler, prefixed with '@', e.g., "@click"
    ATTRIBUTE_VALUE,       // The value of an attribute, e.g., "container", "true"
  
    // Interpolation Tokens
    INTERPOLATION_OPEN,   // {{
    INTERPOLATION_CLOSE,  // }}
    EXPRESSION,           // The JavaScript expression inside {{ ... }} or an attribute value
  
    // Comment Tokens
    COMMENT_OPEN,         // <!--
    COMMENT_TEXT,         // The text content inside a comment
    COMMENT_CLOSE,        // -->
  
    // Meta Tokens
    WHITESPACE,           // One or more whitespace characters (space, tab, newline)
    EOF,                  // End of File/Input
    UNKNOWN,              // An unrecognized character or sequence
  }
  
  /**
   * Represents a single position (line, column, character offset) in the source file.
   */
  export interface SourcePosition {
    line: number;
    column: number;
    offset: number;
  }
  
  /**
   * Represents a span of code in the source file, with a start and end position.
   */
  export interface SourceLocation {
    start: SourcePosition;
    end: SourcePosition;
  }
  
  /**
   * The core Token interface. Every token produced by the lexer will adhere to this structure.
   */
  export interface Token {
    /** The category of the token. */
    type: TokenType;
    /** The raw string value of the token as it appeared in the source. */
    value: string;
    /** The location of the token in the source file for error reporting. */
    loc: SourceLocation;
  }
  
  export type SpecialPrefix = '@' | ':' | '?' | '.';
  
  export const SPECIAL_PREFIXES = {
    '@': TokenType.EVENT_HANDLER_NAME,
    ':': TokenType.BINDING_NAME,
    '?': TokenType.BOOLEAN_BINDING_NAME,
    '.': TokenType.PROPERTY_BINDING_NAME,
}