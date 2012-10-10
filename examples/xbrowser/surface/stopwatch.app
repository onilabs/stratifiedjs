var surface = require("apollo:surface/base");

var ui = surface.Html(
  {
    content: "<button id='start'>Start</button>
              <button id='stop'>Stop</button>
              <span></span>",
    mechanism() {
      this.elapsed = 0;
      while (1) {
        this.waitforEvent('#start', 'click');
        waitfor {
          while (1) {
            this.select1('span').innerHTML = this.elapsed++;
            hold(1000);
          }
        }
        or {
          this.waitforEvent('#stop', 'click');
        }
      }
    }
  });

surface.root.append(ui);

