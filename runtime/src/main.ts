import { Lexer } from '../../compiler/src/lexer/lexer'


const rawhtml = '<button @click="increment">{{ count() }}</button>';

const lexer = new Lexer(rawhtml);
const tokens = lexer.tokenize();
console.log(tokens);