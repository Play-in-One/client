// Rebuild from the installed icon packages; no remote artwork.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { FaPlaystation, FaXbox } = require('react-icons/fa');
const { BsNintendoSwitch } = require('react-icons/bs');
const { IconBrandWindows, IconBrandApple, IconBrandUbuntu, IconStar, IconTag } = require('@tabler/icons-react');
const icons = { playstation: FaPlaystation, xbox: FaXbox, switch: BsNintendoSwitch, win: IconBrandWindows, mac: IconBrandApple, linux: IconBrandUbuntu, star: IconStar, tag: IconTag };
const symbols = Object.entries(icons).map(([name, Icon]) => {
    const svg = renderToStaticMarkup(createElement(Icon));
    const attrs = svg.match(/^<svg([^>]*)>/)[1].replace(/\s(?:height|width|class)="[^"]*"/g, '');
    return `<symbol id="${name}"${attrs}>${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</symbol>`;
});
writeFileSync(new URL('../public/platform-icons.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`);
