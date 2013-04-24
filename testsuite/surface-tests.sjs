var testUtil = require('./lib/testUtil');
var test = testUtil.test;
var logging = require("sjs:logging");

if(testUtil.isBrowser && testUtil.at_least_IE(8)) {
  var surface = require('sjs:surface/base');
  var html = function(elem) {
    var html = elem.dompeer.outerHTML;
    // spacing is inconsistent on IE vs other browsers, but we don't care
    // for the purposes of these tests:
    return html.trim().replace(/\s+/g, ' ').replace(/> </g, "><").toLowerCase();
  }

  test('removal of <surface-ui> for single-tag content', '<span>hi!</span>', function() {
    return surface.Html("<span>hi!</span>") .. html;
  });

  test('creating table-related fragments individually', '<tr><td>cell</td></tr>', function() {
    return surface.Html({
      content: `
        <tr>
          <td>cell</td>
        </tr>
    `}) .. html;
  });

  test('creating multiple table-related fragments', '<surface-ui><tr><td>cell1</td></tr><tr><td>cell2</td></tr></surface-ui>', function() {
    return surface.Html({
      content: `
        <tr><td>cell1</td></tr>
        <tr><td>cell2</td></tr>
    `}) .. html;
  });

  test('substitutions in top-level tag', '<strong>content</strong>', function() {
    return surface.Html({
      content: `
        ${surface.Html("<strong>content</strong>")}
    `})..html;
  });

  test('substitution in table-related tag', '<tr><td>cell</td></tr>', function() {
    return surface.Html({
      content: `
        <tr>${surface.Html("<td>cell</td>")}</tr>
    `}) .. html;
  });

  test('single element + text', '<surface-ui><span>hi</span> there!</surface-ui>', function() {
    return surface.Html("<span>hi</span> there!") .. html;
  });

}
