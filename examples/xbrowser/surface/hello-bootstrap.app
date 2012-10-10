var surface   = require('apollo:surface/base');
var bootstrap = require('apollo:surface/bootstrap');

var ui = surface.Html('<h1>Hello, bootstrap</h1>');

var bs_container = bootstrap.Container();

bs_container.append(ui);

surface.root.append(bs_container);
