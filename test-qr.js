import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { renderToString } from 'react-dom/server';

const svg = renderToString(React.createElement(QRCodeSVG, { value: "" }));
console.log("SVG OUTPUT:", svg);
