
waitfor {
  var http = require('apollo:http');
}
and {
  var dom = require('apollo:xbrowser/dom');
}
and {
  var ui = require('apollo:ui');
}
and {
  var cutil = require('apollo:cutil');
}
and {
  var coll = require('apollo:collection');
}
and {
  var docutil = require('apollo:docutil');
}
and {
  var common = require('apollo:common');
}
and {
  // preload:
  spawn require('./showdown');
}

//----------------------------------------------------------------------
// style

dom.addCSS(
"
.mb-type  { float: right; }
");

//----------------------------------------------------------------------
// main program loop

exports.run = function(default_location, trail_parent, index_parent, main_parent) {

  // construct our main ui:
  var top_view, index_view, trail_view;
  top_view = ui.makeView(
    "<div class='mb-top mb-main' name='main'></div>");

  using(top_view.show(main_parent)) {

    // Our ui gets updated everytime the location.hash changes. We
    // recreate the main view each time from scratch. The index &
    // trail views get updated with update() calls.

    (index_view = makeIndexView()).show(index_parent);
    (trail_view = makeTrailView()).show(trail_parent);

    // main loop:
    // Note how the update() calls and the construction of the main view
    // will automatically be aborted if the location changes while we're still
    // busy.
    var location = parseLocation(default_location);
    while (1) {
      waitfor {
        waitfor {
          waitfor {
            trail_view.update(location);
          }
          and {
            index_view.update(location);
          }
          and {
            var mainView = makeMainView(location);
          }
        }
        or {
          // display a 'loading...' dialog after 300ms
          hold(300);
          doLoadingDialog(top_view.elems.main);
          // if the loading dialog returns, it means the user wants to 'retry':
          continue;
        }
        catch (e) {
          doInternalErrorDialog(e.toString(), top_view.elems.main);
        }
        using(mainView.show(top_view.elems.main)) {
          if (mainView.run) 
            mainView.run();
          else
            hold();
        }
      }
      or {
        dom.waitforEvent(window, "hashchange");
        location = parseLocation(default_location);
      }
    }
  }
};

//----------------------------------------------------------------------
// Documentation DB
// 
// We load in documentation as needed and store it in memoized
// functions. 
// Lib docs are extracted from a file 'sjs-lib-index.txt'; module docs
// are extracted from the particular module's source itself. The
// parsing of the docs happens here, client-side:


/*
  libpath -> null ||
  { type: "lib", 
    path: URLSTRING,
    modules: {name1: {type:"module", name:name1, summary: STRING|null}, name2: ..., ...},
    dirs: {name1: {type:"dir", name:name1, summary: STRING|null}, name2: ..., ...},
    OPT lib: STRING, // short name
    OPT summary: STRING,
    OPT desc: STRING
  }
    
*/
var getLibDocs = exports.getLibDocs = cutil.makeMemoizedFunction(function(libpath) {
  try {
    var url = http.constructURL(libpath, "sjs-lib-index.txt");
    var docs = docutil.parseSJSLibDocs(http.get(url));
    docs.path = libpath;
    return docs;
  }
  catch (e) {
    return null;
  }
});

// retrieve documentation for lib at path, as well as parents
function getPathDocs(libpath) {
  var rv = getLibDocs(libpath);
  var current = rv;
  while (current && (libpath = parentPath(libpath))) {
    current = current.parent = getLibDocs(libpath);
  }
  return rv;
}

var getModuleDocs = cutil.makeMemoizedFunction(function(modulepath) {
  try { 
    if (modulepath.charAt(modulepath.length-1) == '/') return null;
    var docs = docutil.parseModuleDocs(http.get(modulepath + ".sjs"));
    return docs;
  }
  catch (e) {
    return null;
  }
});

//----------------------------------------------------------------------
// Trail View

function makeTrailView() {
  var view = ui.makeView(
    "<div class='mb-top mb-trail'>Oni Apollo Documentation Browser</div>");
  view.update = function(location) {
    var html = "";
    var path_docs = getPathDocs(location.path);
    if (path_docs) {
      while (path_docs.parent) {
        html = "&nbsp;<b>&gt;</b>&nbsp;<a href='#"+path_docs.path+"'>"+
          topDir(path_docs.path) +"</a>" + html;
        path_docs = path_docs.parent;
      }
      html = "<a href='#"+path_docs.path+"'>"+
        (path_docs.lib || "Unnamed Module Collection") +"</a>" + html;
    }
/*    if (location.module) {
      if (html.length) html += "&nbsp;<b>&gt;</b>&nbsp;"
      html += "<a href='#"+location.path+location.module+"'>"+location.module+"</a>";
    }
*/
    view.replace("<div class='mb-top mb-trail'>"+html+"</div>");
  };
  return view;
}

//----------------------------------------------------------------------
// Index View

function makeIndexView() {
  var view = ui.makeView(
    "<div class='mb-top mb-index'>
       <ul name='list'></ul>
     </div>");
  var entries = {}, selection, current_location = {};
 
  view.update = function(location) { 
    if (location.path != current_location.path) {
      // we need to update all of our entries.
      var lib_docs = getPathDocs(location.path);

      // remove previous entries:
      coll.each(entries, function(e) { e.hide(); });
      entries = {}; selection = null;

      if (lib_docs) {
        (entries["./"] = makeIndexDirEntry(lib_docs.path, "./")).show(view.elems.list);
        if (lib_docs.parent) {
          (entries["../"] = makeIndexDirEntry(lib_docs.parent.path, "../")).show(view.elems.list);
        }
        // create a sorted list of modules & directories:
        var l = [];
        coll.each(lib_docs.modules, function(mdocs, module) {
//          (entries[module] = makeIndexModuleEntry(location, module)).show(view.elems.list);
          l.push([module, makeIndexModuleEntry(location, module)]);
        });
        coll.each(lib_docs.dirs, function(ddocs, dir) {
//          (entries[dir] = makeIndexDirEntry(location.path+dir+"/", dir+"/")).show(view.elems.list);
          l.push([dir, makeIndexDirEntry(location.path+dir+"/", dir+"/")]);
        });
        l.sort({|a,b| a[0]<b[0] ? -1 : (a[0]>b[0] ? 1 : 0)});
        coll.each(l, {|e| (entries[e[0]] = e[1]).show(view.elems.list) });
      }
      // else ... we didn't find any lib_docs; so no modules we can list
    }

    if (location.module != selection) {
      if (selection) selection.deselect();
      if (location.module) {
        selection = entries[location.module]; 
        if (!selection) {
          // didn't find the module in our index entries... let's add
          // it, but only if there is documentation for it:
          if (!getModuleDocs(location.path + location.module)) return;
          (selection = entries[location.module] = makeIndexEntry(location, location.module)).show(view.top[0]);
        } 
        selection.select(); 
      }
    }
  };

  return view;
}

function makeIndexModuleEntry(location, module) {
  var view = ui.makeView(
    "<li>
       <h3><a href='#{path}{module}'>{module}</a></h3>
       <ul name='symbols'></ul>
     </li>");
  view.supplant({path: location.path, module: module});

  var symbols_view;

  view.select = function() {
    // we expand our view to include symbols:
    var module_docs = getModuleDocs(location.path + module);
    if (!module_docs) return; // no docs; nothing much we can do
    var symbols_template = 
      coll.map(coll.values(common.mergeSettings(module_docs.symbols, module_docs.classes)), 
               function(symbol) {
                 return common.supplant(
                   "<li><a href='#{path}{module}::{symbolname}'>{symbolname}</a></li>",
                   {path:location.path, module: module, symbolname:symbol.name})
               }).join("");
    (symbols_view = ui.makeView(symbols_template)).show(view.elems.symbols);
  };
  view.deselect = function() { 
    if (symbols_view) symbols_view.hide(); 
    symbols_view = null;
  };

  return view;
}

function makeIndexDirEntry(path, dir) {
  var view = ui.makeView(
    "<li>
       <h3><a href='#{path}'>{dir}</a></h3>
     </li>");
  view.supplant({path: path, dir: dir});

  view.select = function() {};
  view.deselect = function() {};

  return view;
}


//----------------------------------------------------------------------
// Internal error:

function doInternalErrorDialog(txt, domparent) {
  var view = ui.makeView("
<div class='mb-error'>
<h1>:-(</h1><b>{txt}</b><br>You shouldn't have seen this error; please report to info@onilabs.com.<br>
Please also hit the 'retry' button and see if this fixes things: 
<button name='ok'>retry</button>
</div>
").supplant({txt:txt});
  using (view.show(domparent)) {
    try {
      dom.waitforEvent(view.elems.ok, 'click');
    }
    or {
      // escape key
      dom.waitforEvent(document, 'keydown', function(e) { return e.keyCode == 27; });
    }
  }
}

//----------------------------------------------------------------------
// Loading dialog:

// Displays a 'Loading...' and then, after 4 seconds, a Retry button.
// Only returns when the Retry button is pressed.

function doLoadingDialog(domparent) {
  using(ui.makeView("<span class='mb-warning'> Loading... </span>").show(domparent)) {
    hold(4000);
  }
  var view = ui.makeView(
    "<span class='mb-warning'> Still Loading... 
     <a name='retry' href='javascript:void(0)'>Retry</a> </span>");
  using(view.show(domparent)) {
    dom.waitforEvent(view.elems.retry, 'click');
  }
}

//----------------------------------------------------------------------
// Main View:

function makeMainView(location) {
  // figure out which view to display: module view, symbol view, lib view or error view
  var view;
  try {
    if (!location.module) {
      // lib view
      view = makeLibView(location);
    }
    else if (!location.symbol) {
      view = makeModuleView(location);
    }
    else {
      view = makeSymbolView(location);
    }
  }
  catch (e) {
    // make an error view
    view  = makeErrorView(location, 'Documentation Error: '+e);
  }
  return view;
}

//----------------------------------------------------------------------
// (Non-critial) Error View:

function makeErrorView(location, txt) {
  var view = ui.makeView(
"<h2>:-(</h2>
 <h3>{txt}</h3>
 <p>Were you looking for one of these:</p>
 <ul>
   <li><a href='http://code.onilabs.com/apollo/latest/doc/modules.html'>Latest Stable Apollo Standard Library Docs</a></li>
   <li><a href='http://code.onilabs.com/apollo/unstable/doc/modules.html'>Latest Unstable (GitHub trunk) Apollo Standard Library Docs</a></li>
 </ul>
 <p>Otherwise, please enter a URL pointing to a module library (a directory with a file 'sjs-lib-index.txt'), or an SJS module:</p>
<input name='url' type='text' style='width:30em' value='http://'></input><button name='go'>Go</button>
").supplant({txt:txt});

  view.run = function() { 
    if (window.location.hash)
      view.elems.url.value = window.location.hash.substr(1);
    view.elems.url.focus();
    try {
      dom.waitforEvent(view.elems.url, "keypress", function(e) { return e.keyCode == 13; });
    }
    or { 
      dom.waitforEvent(view.elems.go, "click");
    }
    window.location.replace("#"+view.elems.url.value);
  };

  return view;
}

//----------------------------------------------------------------------
// Module View:

// helper to sanitize modulename into a valid variable name
function moduleVarName(modulename) {
  return modulename.replace(/-/g, '_').replace(/\./g, '_');
}

function makeModuleView(location) {
  var docs = getModuleDocs(location.path + location.module);
  if (!docs) throw "No module at '"+location.path + location.module+"'";
  var view = ui.makeView(
"<h2>The {name} module</h2>
 <div class='mb-require'><code>require('{home}');</code></div>
 <div name='summary' class='mb-summary'></div>
 <div name='symbols'></div>
 <div name='desc'></div>
").supplant({
  name:    docs.module||location.module, 
//  varname: moduleVarName(docs.module||location.module),
  home:    docs.home || (location.path+location.module) 
});

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);
 
  // collect symbols (XXX really want classes in symbols hash to start with)
  var symbols = {};
  coll.each(common.mergeSettings(docs.symbols, docs.classes), function(s) {
    if (!symbols[s.type]) symbols[s.type] = [];
    symbols[s.type].push(
      common.supplant(
        "<tr>
           <td class='mb-td-symbol'><a href='#{path}{module}::{symbol}'>{symbol}</a></td>
           <td>{summary}</td>
         </tr>",
        { path: location.path, module: location.module, 
          symbol: s.name, summary: makeSummaryHTML(s, location) }));
  });
  
  if (symbols['function'])
    ui.makeView("<h3>Functions</h3><table>"+symbols['function'].join("")+"</table>").show(view.elems.symbols);
  if (symbols['variable'])
    ui.makeView("<h3>Variables</h3><table>"+symbols['variable'].join("")+"</table>").show(view.elems.symbols);
  if (symbols['class'])
    ui.makeView("<h3>Classes</h3><table>"+symbols['class'].join("")+"</table>").show(view.elems.symbols);

  return view;
}

//----------------------------------------------------------------------
// Symbol View (showing details for a class or symbol):

function makeSymbolView(location) {
  var mdocs = getModuleDocs(location.path + location.module);
  if (!mdocs) throw "No module at '"+location.path + location.module+"'";
  
  var docs = mdocs;
  if (location.classname) {
    if (!mdocs.classes || !(docs = mdocs.classes[location.classname])) 
      throw "Class '"+location.classname+"' not found in documentation";
  }

  docs = docs.symbols[location.symbol] || docs.classes[location.symbol];
  if (!docs) 
    throw "Symbol '"+location.symbol+"' not found in documentation";

  var view;
  if (!location.classname) {
    view = ui.makeView(
      "<h2><a href='#{path}{module}'>{module}</a>::{name}</h2>"+
        (docs.type != "class" ?
         "<div class='mb-require'><code>require('{home}').{name};</code></div>" : "")+
      "<div name='summary' class='mb-summary'></div>
       <div name='details'></div>
       <div name='desc'></div>
      ").supplant({
        path: location.path, 
        module: location.module, 
        name:location.symbol,
        home: mdocs.home || (location.path+location.module)});
  }
  else {
    var template =         
      "<h2><a href='#{path}{module}'>{module}</a>::<a href='#{path}{module}::{class}'>{class}</a>::{name}</h2>"+
      (docs.type == "ctor" || docs['static'] ? 
       "<div class='mb-require'><code>require('{home}').{name};</code></div>" : "")+
      "<div name='summary' class='mb-summary'></div>
       <div name='details'></div>
       <div name='desc'></div>
      ";
    view = ui.makeView(template).supplant({
      path:location.path, 
      module:location.module, 
      name: docs['static'] ? location.classname + "." + location.symbol : location.symbol, 
      'class':location.classname,
      home: mdocs.home || (location.path+location.module)});
  }

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);
  
  if (docs.type == "function" || docs.type == "ctor") {
    // function signature
    var signature;
    if (docs.type != 'ctor' && location.classname && !docs['static'])
      signature = location.classname.toLowerCase()+".";
    else
      signature = "";

    signature += docs.name+"(<span class='mb-arglist'>"+
      coll.map(docs.param || [], function(p) {
        var rv = p.name || '.';
        if (p.valtype && p.valtype.indexOf("optional") != -1)
          rv = "<span class='mb-optarg'>["+rv+"]</span>";
        return rv;
      }).join(", ")+
      "</span>)";
    if (docs.type == 'ctor') {
      if (signature.indexOf('.') != -1)
        signature = '('+signature+')';
      signature = "new "+signature;
    }

    if (docs['return']) {
      signature += " <span class='mb-rv'>returns "+
        makeTypeHTML(docs['return'].valtype, location)+"</span>";
    }

    if (docs.altsyntax)
      signature += "<br>"+docs.altsyntax;

    ui.makeView("<h3>"+signature+"</h3>").show(view.elems.details);


    // function args details
    var args = coll.map(docs.param || [], function(p) {
      return common.supplant(
        "<tr><td class='mb-td-symbol'>{name}</td><td><span class='mb-type'>{type}</span>{def}{summary}</td></tr>",
        { name:p.name||'.', type:makeTypeHTML(p.valtype, location), 
          def: p.defval? "<span class='mb-defval'>Default: "+makeTypeHTML(p.defval,location)+"</span>" : "",
          summary:makeSummaryHTML(p, location) });
    });
    if (args.length)
      ui.makeView("<table>"+args.join("")+"</table>").show(view.elems.details);

    // settings
    var settings = coll.map(docs.setting || [], function(s) {
      return common.supplant(
        "<tr><td class='mb-td-symbol'>{name}</td><td><span class='mb-type'>{type}</span>{def}{summary}</td></tr>",
        { name: s.name, type: makeTypeHTML(s.valtype, location), 
          def: s.defval? "<span class='mb-defval'>Default: "+makeTypeHTML(s.defval,location)+"</span>" : "",
          summary: makeSummaryHTML(s, location)
        });
    });
    if (settings.length)
      ui.makeView("<h3>Settings</h3><table>"+settings.join("")+"</table>").show(view.elems.details);

    if (docs['return'] && docs['return'].summary) {
      ui.makeView(common.supplant(
        "<h3>Return Value</h3>
         <table><tr>
           <td><span class='mb-type'>{type}</span>{summary}</td>
         </tr></table>",
        { type: makeTypeHTML(docs['return'].valtype, location),
          summary : makeSummaryHTML(docs['return'], location)
        })).show(view.elems.details);
    }
                          
  }
  else if (docs.type == "class") {
    ui.makeView("<h3>Class {name}</h3>").supplant(docs).show(view.elems.details);


    // collect symbols
    var symbols = {};
    coll.each(docs.symbols, function(s) { 
      var type = s.type;
      if (s['static'])
        type = 'static-'+type;
      if (!symbols[type]) symbols[type] = [];
      symbols[type].push(
        common.supplant(
          "<tr>
             <td class='mb-td-symbol'><a href='#{path}{module}::{class}::{symbol}'>{symbol}</a></td>
             <td>{summary}</td>
           </tr>",
          { path: location.path, module:location.module, 'class': docs.name, 
            symbol: s.name, summary: makeSummaryHTML(s, location) }));
    });
    
    if (symbols['ctor'])
      ui.makeView("<table>"+symbols['ctor'].join("")+"</table>").show(view.elems.details);
    if (symbols['static-function'])
      ui.makeView("<h3>Static Functions</h3><table>"+symbols['static-function'].join("")+"</table>").show(view.elems.details);
    if (symbols['function'])
      ui.makeView("<h3>Methods</h3><table>"+symbols['function'].join("")+"</table>").show(view.elems.details);
    if (symbols['variable'])
      ui.makeView("<h3>Member Variables</h3><table>"+symbols['variable'].join("")+"</table>").show(view.elems.details);

  }

  return view;
}

function makeLibView(location) {
  var docs = getPathDocs(location.path);
  if (!docs) throw "No module library at '"+location.path+"'";
  var view = ui.makeView(
"<h2>{name}</h2>
 <div name='summary' class='mb-summary'></div>
 <div name='modules'></div>
 <div name='dirs'></div>
 <div name='desc'></div>
").supplant({
  name: docs.lib ? docs.lib : "Unnamed Module Collection"});

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);

  // collect modules & dirs:
  var modules = coll.reduce(docs.modules, "", {|p,m| p+common.supplant(
    "<tr>
      <td class='mb-td-symbol'><a href='#{path}{module}'>{module}</a></td>
      <td>{summary}</td>
     </tr>", 
    { path: location.path, module: m.name, summary: makeSummaryHTML(m, location) }) });

  if (modules.length) {
    ui.makeView("<h3>Modules</h3><table>"+modules+"</table>").show(view.elems.modules);
  }

  var dirs = coll.reduce(docs.dirs, "", {|p,d| p+common.supplant(
    "<tr>
      <td class='mb-td-symbol'><a href='#{path}{dir}'>{dir}</a></td>
      <td>{summary}</td>
     </tr>", 
    { path: location.path, dir: d.name, summary: makeSummaryHTML(d, location) }) });

  if (dirs.length) {
    ui.makeView("<h3>Directories</h3><table>"+dirs+"</table>").show(view.elems.dirs);
  }

  return view;
}


//----------------------------------------------------------------------
// helpers

// we expect window.location to be of the form:
//
//    # http://foo.bar//modulelib/  [ module  [ [ ::class ] ::symbol ] ]
//
// we parse this into {path, module, classname, symbol}
function parseLocation(default_location) {
  if (!window.location.hash)
    window.location.replace("#"+default_location);
  var matches = /#(.*\/)([^:#]*)(?:\:\:([^:]*)(?:\:\:(.*))?)?/.exec(window.location.hash);
  if (!matches) return { path: "", module: "", classname: "", symbol: "" };
  var loc = { 
    path: http.canonicalizeURL(matches[1], window.location.href), // XXX want resolution like in require here
    module: matches[2],
    classname: matches[4] ? matches[3] : null,
    symbol: matches[4] ? matches[4] : matches[3]
  };
  // we don't want .sjs extensions in module names:
  if (/\.sjs$/.test(loc.module)) loc.module = loc.module.substr(0,loc.module.length-4);
  return loc;
}

function parentPath(path) {
  if (!http.parseURL(path).directory) return null;
  return http.canonicalizeURL(http.constructURL(path, "../"), 
                              window.location.href);
}

function topDir(path) {
  return /([^\/]+)\/?$/.exec(path)[1];
}

function ensureSlash(path) {
  return http.constructURL(path, "/");
}

function makeSummaryHTML(obj, location) {
  var rv = markup(obj.summary, location);
  if (obj.deprecated)
    rv += "<div class='note'>" + 
    markup("**Deprecated:** "+obj.deprecated, location) + "</div>";
  if (obj.hostenv)
    rv += common.supplant("<div class='note'><b>Note:</b> This {type} only works in the '{hostenv}' version of Apollo.</div>", obj);
  return rv;
}

function makeDescriptionHTML(obj, location) {
  var rv = obj.desc ? "<h3>More information</h3>"+markup(obj.desc, location) : "";
  return rv;
}

function makeTypeHTML(type, location) {
  if (!type) return "";
  type = type.split("|");
  for (var i=0; i<type.length; ++i) {
    var resolved = resolveLink(type[i].replace('optional ',''), location);
    if (!resolved) continue;
    type[i] = (type[i].indexOf('optional') != -1 ? "optional ":"") + "<a href='"+resolved[0]+"'>"+resolved[1]+"</a>";
  }
  return type.join("|");
}

function resolveLink(id, location) {
  if (id.indexOf("::") == -1) return null; // ids we care about contain '::' 
  if (id.charAt(id.length-1) == ':') {
    // link to another module
    return ["#"+location.path+id.substring(0, id.length-2), id.substring(0, id.length-2)];
  }
  else if (id.charAt(0) != ':') {
    // 'absolute' link into another module of our lib
    // e.g. "cutil::Semaphore::acquire"
    return ["#"+location.path+id, "<code>"+id+"</code>"];
  }
  else {
    // 'relative' link into our module
    // e.g. "::Semaphore::acquire", or "::foo"
    return ["#"+location.path+location.module+id, "<code>"+id.substring(2)+"</code>"];
  }
}


function markup(text, location) {
  function resolve(id) { return resolveLink(id, location); }
  return require('./showdown').makeHTML(text, resolve);
}