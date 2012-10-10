var surface = require('./base');
var coll = require('../collection');
var str = require('../string');

exports.ButtonDropdown = function(title, items) {

  var menu = coll.map(items) { 
    |item| 
    "<li><a href='#' data-command='#{item[1]}'>#{str.sanitize(item[0])}</a></li>"
  }.join('');

  var ui = surface.Html("
    <div class='btn-group'>
      <a class='btn dropdown-toggle' data-toggle='dropdown' href='#'>
        #{str.sanitize(title)}
      <span class='caret'></span>
      </a>
      <ul class='dropdown-menu'>
        #{menu}
      </ul>
    </div>
");
  surface.mixinCommandAPI(ui);
  return ui;
};
