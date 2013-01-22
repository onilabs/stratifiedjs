var surface = require("sjs:surface/base");

var myCSS = surface.CSS("
       { font-family: sans-serif; }
  span { color: red; }
");

var ui1 = surface.Html(
  {
    style:   myCSS,
    content: "<h1>Hello, <span>world</span></h1>"
  });

var ui2 = surface.Html(
  {
    content: "<h1>Hello, <span>world</span></h1>"
  });

var ui3 = surface.Html(
  {
    style:   myCSS,
    content: "<h1>Hello, <span>world</span></h1>"
  });


surface.root.append(ui1);
surface.root.append(ui2);
surface.root.append(ui3);
