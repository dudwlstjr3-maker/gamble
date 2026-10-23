const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const bat = fs.readFileSync(path.join(root, 'play', 'start.bat'));
const text = bat.toString('latin1');

test('start.bat is plain ASCII with CRLF so cmd.exe reads it on any code page', () => {
  expect(bat.every(b => b < 0x80)).toBe(true);
  expect(text.endsWith('\r\n')).toBe(true);
  expect(text.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
});

test('start.bat only downloads the game from main and checks a marker the game carries', () => {
  expect(text.match(/https?:\/\/[^\s"]+/g)).toEqual(['https://raw.githubusercontent.com/dudwlstjr3-maker/gamble/main/index.html']);
  expect(text).not.toMatch(/\s(-d|-F|-T|-X)\s|--data|--form|--upload|--request/i);
  const marker = text.match(/findstr \/l \/c:"([^"]+)"/)[1];
  expect(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).toContain(marker);
});
