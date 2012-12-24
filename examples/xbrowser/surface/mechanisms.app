var surface = require("apollo:surface/base");

var ui = surface.Html(
  {
    content: "<h1>The time is <span></span></h1>",
    mechanism: function() {
      while (1) {
        this.select1('span').innerHTML = new Date();
        hold(1000);
      }
    }
  });

surface.root.append(ui);

