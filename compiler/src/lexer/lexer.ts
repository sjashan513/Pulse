// <p class="active">{{ count() }}</p>
import { Token, TokenType } from "./types";

enum LexerState {
    DATA = 'DATA',
    TAG_NAME = 'TAG_NAME',
    JS_CONTENT = 'JS_CONTENT',
    TAG_CONTENT = 'TAG_CONTENT',
    ATTRIBUTE_NAME = 'ATTRIBUTE_NAME',
    ATTRIBUTE_VALUE = 'ATTRIBUTE_VALUE',
}

export class Lexer {
    private _rawHtml: string;
    private _position: number;
    private _tokens: Token[];
    private _state: LexerState;


    constructor(rawHtml: string) {
        this._rawHtml = rawHtml;
        this._position = 0;
        this._tokens = [];
        this._state = LexerState.DATA;
    }

    // Helper to easily grab the current letter
    private get currentChar(): string {
        return this._rawHtml[this._position];
    }

    public tokenize(): Token[] {
        // The Main FSM Loop
        while (this._position < this._rawHtml.length) {
            switch (this._state) {
                case LexerState.DATA:
                    this.handleDataState();
                    break;
                case LexerState.TAG_NAME:
                    this.handleTagNameState();
                    break;
                case LexerState.TAG_CONTENT:
                    this.handleTagContentState();
                    break;
                case LexerState.ATTRIBUTE_NAME:
                    this.handleAttributeNameState();
                    break;
                case LexerState.ATTRIBUTE_VALUE:
                    this.handleAttributeValueState();
                    break;
                case LexerState.JS_CONTENT:
                    this.handleJsContentState();
                    break;
                default:
                    throw new Error(`Unknown state: ${this._state}`);

            }
        }

        // Add the EOF (End of File) token when the loop finishes
        this._tokens.push({ type: TokenType.EOF, value: '' });
        return this._tokens;
    }

    private handleDataState(): void {
        // YOUR CHALLENGE GOES HERE
        if (this._rawHtml.startsWith('{{', this._position)) {
            this._tokens.push({ type: TokenType.INTERPOLATION_OPEN, value: '{{' });
            this._state = LexerState.JS_CONTENT;
            this._position += 2;
        } else if (this._rawHtml.startsWith('</', this._position)) {
            this._tokens.push({ type: TokenType.END_TAG_OPEN, value: '</' });
            this._state = LexerState.TAG_NAME;
            this._position += 2;
        } else if (this.currentChar === '<') {
            this._tokens.push({ type: TokenType.TAG_OPEN, value: '<' })
            this._state = LexerState.TAG_NAME;
            this._position++;
        } else {
            let textContent = '';
            while (this._position < this._rawHtml.length && !this._rawHtml.startsWith('{{', this._position) && this.currentChar !== '<') {
                textContent += this.currentChar;
                this._position++;
            }
            if (textContent.length > 0)
                this._tokens.push({ type: TokenType.TEXT, value: textContent });
        }


    }

    private handleTagNameState(): void {
        // We will do this next
        let tagName = '';
        while (this._position < this._rawHtml.length && this.currentChar !== '>' && !this._isWhitespace()) {
            tagName += this.currentChar;
            this._position++;
        }
        this._tokens.push({ type: TokenType.TAG_NAME, value: tagName });
        this._state = LexerState.TAG_CONTENT;

    }

    private handleTagContentState(): void {
        if (this._isWhitespace()) {
            // Group all consecutive spaces into a single token
            let spaces = '';
            while (this._position < this._rawHtml.length && this._isWhitespace()) {
                spaces += this.currentChar;
                this._position++;
            }
            this._tokens.push({ type: TokenType.WHITESPACE, value: spaces });
        } else if (this.currentChar === '>') {
            this._tokens.push({ type: TokenType.TAG_CLOSE, value: '>' });
            this._state = LexerState.DATA;
            this._position++;
        } else if (this.currentChar === '=') {
            this._tokens.push({ type: TokenType.EQUALS, value: '=' });
            this._state = LexerState.ATTRIBUTE_VALUE;
            this._position++;
        } else {
            // If it's not a space, '>', or '=', it MUST be an attribute name.
            // We change the state and let the next loop iteration handle it!
            this._state = LexerState.ATTRIBUTE_NAME;
        }
    }

    private handleAttributeNameState(): void {
        let atrName = '';
        while (this._position < this._rawHtml.length && !this._isWhitespace() && this.currentChar !== '=' && this.currentChar !== '>') {
            atrName += this.currentChar;
            this._position++;
        }
        if (atrName.startsWith('@')) {
            this._tokens.push({ type: TokenType.EVENT_HANDLER_NAME, value: atrName });
        } else if (atrName.includes('.') || atrName.includes(':')) {
            this._tokens.push({ type: TokenType.BINDING_NAME, value: atrName });
        } else {
            this._tokens.push({ type: TokenType.ATTRIBUTE_NAME, value: atrName });
        }
        this._state = LexerState.TAG_CONTENT;

    }

    private handleAttributeValueState(): void {
        const quote = this.currentChar;
        this._tokens.push({ type: TokenType.ATTRIBUTE_VALUE_START, value: quote });
        this._position++;
        let atrValue = '';
        while (this._position < this._rawHtml.length && this.currentChar !== quote) {
            atrValue += this.currentChar;
            this._position++;
        }
        this._tokens.push({ type: TokenType.ATTRIBUTE_VALUE, value: atrValue });
        this._tokens.push({ type: TokenType.ATTRIBUTE_VALUE_END, value: quote });
        this._state = LexerState.TAG_CONTENT;
        this._position++;
    }

    private handleJsContentState(): void {
        let jsContent = '';
        while (this._position < this._rawHtml.length && !this._rawHtml.startsWith('}}', this._position)) {
            jsContent += this.currentChar;
            this._position++;
        }
        this._tokens.push({ type: TokenType.JS_CONTENT, value: jsContent });
        this._tokens.push({ type: TokenType.INTERPOLATION_CLOSE, value: '}}' });
        this._state = LexerState.DATA;
        this._position += 2;
    }

    private _isWhitespace(): boolean {
        return /\s/.test(this.currentChar);
    }
}