var surface   = require('sjs:surface/base');
var bootstrap = require('sjs:surface/bootstrap');

var ui = surface.Html("
  <div style='margin:20px 20px;'>
    <button class='btn' data-command='toggleResponsive'>Toggle Responsive</button>
    <button class='btn' data-command='increaseColumn'>+ column width</button>
    <button class='btn' data-command='decreaseColumn'>- column width</button>
  </div>
  <hr>
  <div class='row'>
    <div class='span4'>
      <h3>Typographic scale</h3>
      <p>The entire typographic grid is based on two Less variables in our variables.less file: <code>@baseFontSize</code> and <code>@baseLineHeight</code>. The first is the base font-size used throughout and the second is the base line-height.</p>
      <p>We use those variables, and some math, to create the margins, paddings, and line-heights of all our type and more.</p>
    </div>
    <div class='span4'>
      <h3>Example body text</h3>
      <p>Nullam quis risus eget urna mollis ornare vel eu leo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nullam id dolor id nibh ultricies vehicula.</p>
      <h3>Lead body copy</h3>
      <p>Make a paragraph stand out by adding <code>.lead</code>.</p>
      <p class='lead'>Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Duis mollis, est non commodo luctus.</p>
    </div>
    <div class='span4'>
      <div class='well'>
        <h1>h1. Heading 1</h1>
        <h2>h2. Heading 2</h2>
        <h3>h3. Heading 3</h3>
        <h4>h4. Heading 4</h4>
        <h5>h5. Heading 5</h5>
        <h6>h6. Heading 6</h6>
      </div>
    </div>
  </div>
");

surface.mixinCommandAPI(ui);


var responsive = false;
var columnWidth = 60;
while (1) {
  var lookAndFeel = Object.create(bootstrap.defaultLookAndFeel);
  lookAndFeel.gridColumnWidth = -> columnWidth+'px';

  var bs_container = bootstrap.Container(
    {
      children: [ui],
      responsive: responsive,
      lookAndFeel: lookAndFeel
    });
  surface.root.append(bs_container);
  var command = ui.waitforCommand();
  if (command == 'toggleResponsive')
    responsive = !responsive;
  else if (command == 'increaseColumn')
    columnWidth+=10;
  else if (command == 'decreaseColumn')
    columnWidth-=10;

  surface.root.remove(bs_container);
}
