/**
 * The official dictionary of all token types the Pulse Lexer can emit.
 * This represents the complete "Source Grammar" vocabulary.
 */
export enum TokenType {
    // --- Structure & Tags ---
    TAG_OPEN = 'TAG_OPEN',                   // <
    TAG_NAME = 'TAG_NAME',                   // div, p, span
    TAG_CLOSE = 'TAG_CLOSE',                 // >
    END_TAG_OPEN = 'END_TAG_OPEN',           // </
    TEXT = 'TEXT',                           // Any plain text between tags

    // --- Attributes ---
    ATTRIBUTE_NAME = 'ATTRIBUTE_NAME',               // id, type, src
    ATTRIBUTE_VALUE_START = 'ATTRIBUTE_VALUE_START', // " or '
    ATTRIBUTE_VALUE = 'ATTRIBUTE_VALUE',             // the actual text inside quotes
    ATTRIBUTE_VALUE_END = 'ATTRIBUTE_VALUE_END',     // " or '
    EQUALS = 'EQUALS',                               // =

    // --- Pulse-Specific Syntax ---
    INTERPOLATION_OPEN = 'INTERPOLATION_OPEN',       // {{
    INTERPOLATION_CLOSE = 'INTERPOLATION_CLOSE',     // }}
    JS_CONTENT = 'JS_CONTENT',                       // count() + 1

    BINDING_NAME = 'BINDING_NAME',                   // Prefix/modifier for reactive attrs (e.g., class.active, :src)
    EVENT_HANDLER_NAME = 'EVENT_HANDLER_NAME',       // @click, @input
    DIRECTIVE_MODIFIER = 'DIRECTIVE_MODIFIER',       // .resume, .eager
    STRUCTURAL_DIRECTIVE_NAME = 'STRUCTURAL_DIRECTIVE_NAME', // @if, @for

    // --- Utilities ---
    WHITESPACE = 'WHITESPACE',               // spaces, tabs, newlines
    EOF = 'EOF'                              // End Of File

}

/**
 * Represents a single piece of the template string categorized by the Lexer.
 */
export interface Token {
    /** The category of the token */
    type: TokenType;
    /** The literal string value extracted from the source code */
    value: string;
}