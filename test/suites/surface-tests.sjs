var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var logging = require("sjs:logging");

if(testUtil.isBrowser) {
  var surface = require('sjs:surface/base');

  test('creating table-related fragments individually', '<tr><td>cell</td></td>', function() {
    return surface.Html({
      content: `
        <tr>
          <td>cell</td>
        </tr>
    `}).dompeer.outerHTML.replace(/\s+/g,'');
  });
}
