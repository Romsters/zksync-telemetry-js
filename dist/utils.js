"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInteractive = isInteractive;
exports.isCiEnvironment = isCiEnvironment;
exports.promptYesNo = promptYesNo;
const tty_1 = require("tty");
function isInteractive() {
    return (0, tty_1.isatty)(process.stdin.fd) &&
        (0, tty_1.isatty)(process.stdout.fd) &&
        !isCiEnvironment();
}
function isCiEnvironment() {
    return Boolean(process.env.CI ||
        process.env.CONTINUOUS_INTEGRATION ||
        process.env.BUILD_NUMBER ||
        process.env.GITHUB_ACTIONS);
}
async function promptYesNo(prompt) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        readline.question(`${prompt} (y/n) `, (answer) => {
            readline.close();
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });
}
