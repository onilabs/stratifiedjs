var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var logging = require("sjs:logging");

if(testUtil.isBrowser) {
  var surface = require('sjs:surface/base');

  test('removal of <surface-ui> for single-tag content', '<span>hi!</span>', function() {
    return surface.Html("<span>hi!</span>").dompeer.outerHTML;
  });

  test('creating table-related fragments individually', '<tr><td>cell</td></tr>', function() {
    return surface.Html({
      content: `
        <tr>
          <td>cell</td>
        </tr>
    `}).dompeer.outerHTML.replace(/\s+/g,'');
  });

  test('creating multiple table-related fragments', '<surface-ui><tr><td>cell1</td></tr><tr><td>cell2</td></tr></surface-ui>', function() {
    return surface.Html({
      content: `
        <tr><td>cell1</td></tr>
        <tr><td>cell2</td></tr>
    `}).dompeer.outerHTML.replace(/\s+/g,'');
  });

  test('substitutions in top-level tag', '<strong>content</strong>', function() {
    return surface.Html({
      content: `
        ${surface.Html("<strong>content</strong>")}
    `}).dompeer.outerHTML.replace(/\s+/g,'');
  });

  test('substitution in table-related tag', '<tr><td>cell</td></tr>', function() {
    return surface.Html({
      content: `
        <tr>${surface.Html("<td>cell</td>")}</tr>
    `}).dompeer.outerHTML.replace(/\s+/g,'');
  });
}
