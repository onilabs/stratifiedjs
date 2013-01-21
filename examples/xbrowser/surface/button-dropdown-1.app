var surface   = require('sjs:surface/base');
var bootstrap = require('sjs:surface/bootstrap');

var ui = surface.Html("
<div class='btn-group' style='margin-top:30px'>
  <a class='btn dropdown-toggle' data-toggle='dropdown' href='#'>
    Action
    <span class='caret'></span>
  </a>
  <ul class='dropdown-menu'>
    <li><a tabindex='-1' href='#'>Action</a></li>
    <li><a tabindex='-1' href='#'>Another action</a></li>
    <li><a tabindex='-1' href='#'>Something else here</a></li>
  </ul>
</div>
");

var bs_container = bootstrap.Container();

bs_container.append(ui);

surface.root.append(bs_container);
