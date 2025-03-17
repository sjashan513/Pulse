#include <iostream>
#include <vector>
#include <string>
#include <cctype>
#include <emscripten/bind.h>

////////////////////////////////////////////////////////////
// Inline helper functions
////////////////////////////////////////////////////////////
inline bool isAlpha(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

inline bool isDigit(char c) {
    return (c >= '0' && c <= '9');
}

inline bool isWhitespace(char c) {
    return (c == ' ' || c == '\t' || c == '\n' || c == '\r');
}

inline bool isQuote(char c) {
    return (c == '"' || c == '\'');
}

////////////////////////////////////////////////////////////
// Enum for token types
////////////////////////////////////////////////////////////
enum class TokenType {
    Identifier,
    Number,
    Operator,
    TEXT,
    TAG_OPEN,
    TAG_CLOSE,
    ATTRIBUTE,
    ATTR_VALUE
};

////////////////////////////////////////////////////////////
// Token struct using std::string for safe JS bridging
////////////////////////////////////////////////////////////
struct Token {
    TokenType type;
    std::string lexeme;
    size_t position;

    // NEW default constructor
    Token()
      : type(TokenType::TEXT), lexeme(""), position(0) {}

    // Existing 3-argument constructor
    Token(TokenType type, const std::string& lex, size_t pos)
      : type(type), lexeme(lex), position(pos) {}
};

////////////////////////////////////////////////////////////
// Tokenizer function using std::string
////////////////////////////////////////////////////////////
std::vector<Token> tokenize(const std::string& input) {
    std::vector<Token> tokens;
    tokens.reserve(128); // minimize allocations

    const char* start = input.data();
    const char* current = start;
    const char* end = start + input.size();
    size_t pos = 0;

    while (current < end) {
        char c = *current;

        // Skip whitespace
        if (isWhitespace(c)) {
            ++current;
            ++pos;
            continue;
        }

        const char* tokenStart = current;

        // Tokenize identifiers (letters or underscore + letters/digits)
        if (isAlpha(c)) {
            while (current < end && (isAlpha(*current) || isDigit(*current))) {
                ++current;
                ++pos;
            }
            // Construct a std::string for the lexeme
            std::string lex(tokenStart, current);
            tokens.emplace_back(TokenType::Identifier, lex, pos - lex.size());
        }
        // Tokenize numbers
        else if (isDigit(c)) {
            while (current < end && isDigit(*current)) {
                ++current;
                ++pos;
            }
            std::string lex(tokenStart, current);
            tokens.emplace_back(TokenType::Number, lex, pos - lex.size());
        }
        // Single-character operators or other tokens
        else {
            std::string lex(tokenStart, 1);
            tokens.emplace_back(TokenType::Operator, lex, pos);
            ++current;
            ++pos;
        }
    }

    return tokens;
}

////////////////////////////////////////////////////////////
// Embind bindings
////////////////////////////////////////////////////////////
EMSCRIPTEN_BINDINGS(my_module) {
    // Expose enum TokenType
    emscripten::enum_<TokenType>("TokenType")
        .value("Identifier", TokenType::Identifier)
        .value("Number", TokenType::Number)
        .value("Operator", TokenType::Operator)
        .value("TEXT", TokenType::TEXT)
        .value("TAG_OPEN", TokenType::TAG_OPEN)
        .value("TAG_CLOSE", TokenType::TAG_CLOSE)
        .value("ATTRIBUTE", TokenType::ATTRIBUTE)
        .value("ATTR_VALUE", TokenType::ATTR_VALUE);

    // Expose struct Token
    emscripten::value_object<Token>("Token")
        .field("type", &Token::type)
        .field("lexeme", &Token::lexeme)
        .field("position", &Token::position);

    // Register std::vector<Token> so Embind knows how to return it
    emscripten::register_vector<Token>("VectorToken");

    // Finally, bind the tokenize function
    emscripten::function("tokenize", &tokenize);
}
