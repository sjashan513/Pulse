/**
 * @fileoverview Unit tests for the Pulse lexer.
 * NOTE: This is a simplified test runner for our environment.
 */

import { tokenize } from './lexer';
import { Token, TokenType } from './types';

// --- Simple Assertion Library ---

function assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
        console.error(`❌ FAILED: ${message}`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Got: ${actual}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
}

function assertDeepEqual(actual: any, expected: any, message: string) {
    // A simple JSON-based deep equal for our purposes
    const actualJson = JSON.stringify(actual, (k, v) => k === 'loc' ? undefined : v);
    const expectedJson = JSON.stringify(expected, (k, v) => k === 'loc' ? undefined : v);

    if (actualJson !== expectedJson) {
        console.error(`❌ FAILED: ${message}`);
        console.error(`   Expected: ${expectedJson}`);
        console.error(`   Got: ${actualJson}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
}


// --- Test Cases ---

export function runTests() {
    console.log('--- Running Lexer Tests ---');
    try {
        testSimpleTag();
        testTagWithText();
        testClosingTag();
        testTagWithAttributes();
        testTagWithPrefixedAttributes();
        testInterpolation();
        testComplexStructure();
        testWhitespaceHandling();
        testUnclosedAttributeValue(); // New error handling test
        testUnclosedInterpolation(); // New error handling test
        console.log('\n🎉 All lexer tests passed successfully!');
    } catch (e) {
        console.error('\n🔥 Lexer tests failed.');
    }
}

function testSimpleTag() {
    const source = `<div>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Simple Tag');
}

function testTagWithText() {
    const source = `<p>Hello Pulse</p>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'p' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.TEXT, value: 'Hello Pulse' },
        { type: TokenType.END_TAG_OPEN, value: '</' },
        { type: TokenType.TAG_NAME, value: 'p' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Tag with Text');
}

function testClosingTag() {
    const source = `</div>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.END_TAG_OPEN, value: '</' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Closing Tag');
}

function testTagWithAttributes() {
    const source = `<div id="app" class='main'>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.ATTRIBUTE_NAME, value: 'id' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'app' },
        { type: TokenType.ATTRIBUTE_NAME, value: 'class' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'main' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Tag with Attributes');
}

function testTagWithPrefixedAttributes() {
    const source = `<button @click="handler" :disabled="true">`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'button' },
        { type: TokenType.EVENT_HANDLER_NAME, value: '@click' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'handler' },
        { type: TokenType.BINDING_NAME, value: ':disabled' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'true' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Prefixed Attributes');
}

function testInterpolation() {
    const source = `<h1>{{ title }}</h1>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'h1' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.INTERPOLATION_OPEN, value: '{{' },
        { type: TokenType.EXPRESSION, value: 'title' },
        { type: TokenType.INTERPOLATION_CLOSE, value: '}}' },
        { type: TokenType.END_TAG_OPEN, value: '</' },
        { type: TokenType.TAG_NAME, value: 'h1' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Interpolation');
}

function testComplexStructure() {
    const source = `<div class="container"><p>Value: {{ count() }}</p></div>`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.ATTRIBUTE_NAME, value: 'class' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'container' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'p' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.TEXT, value: 'Value: ' },
        { type: TokenType.INTERPOLATION_OPEN, value: '{{' },
        { type: TokenType.EXPRESSION, value: 'count()' },
        { type: TokenType.INTERPOLATION_CLOSE, value: '}}' },
        { type: TokenType.END_TAG_OPEN, value: '</' },
        { type: TokenType.TAG_NAME, value: 'p' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.END_TAG_OPEN, value: '</' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Complex Structure');
}

function testWhitespaceHandling() {
    const source = `<div  class = "app" >`;
    const tokens = tokenize(source);
     assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.ATTRIBUTE_NAME, value: 'class' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'app' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Whitespace Handling');
}

function testUnclosedAttributeValue() {
    const source = `<div class="app`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.ATTRIBUTE_NAME, value: 'class' },
        { type: TokenType.EQUALS, value: '=' },
        { type: TokenType.ATTRIBUTE_VALUE, value: 'app' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Unclosed Attribute Value');
}

function testUnclosedInterpolation() {
    const source = `<div>{{ name`;
    const tokens = tokenize(source);
    assertDeepEqual(tokens, [
        { type: TokenType.TAG_OPEN, value: '<' },
        { type: TokenType.TAG_NAME, value: 'div' },
        { type: TokenType.TAG_CLOSE, value: '>' },
        { type: TokenType.INTERPOLATION_OPEN, value: '{{' },
        { type: TokenType.EXPRESSION, value: ' name' },
        { type: TokenType.EOF, value: '' },
    ], 'Test: Unclosed Interpolation');
}


// To run the tests, you could hypothetically call this function.
// runTests();
