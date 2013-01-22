var surface = require("sjs:surface/base");

var myCSS = surface.CSS("
       { font-family: sans-serif; }
  span { color: red; }
");

var ui = surface.Html(
  {
    style:   myCSS,
    content: "<h1>Hello, <span>world</span></h1>"
  });

surface.root.append(ui);
