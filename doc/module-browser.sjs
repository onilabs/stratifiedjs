
waitfor {
  var http = require('sjs:http');
}
and {
  var url = require('sjs:url');
}
and {
  var dom = require('sjs:xbrowser/dom');
}
and {
  var events = require('sjs:events');
}
and {
  var ui = require('./ui');
}
and {
  var func = require('sjs:function');
}
and {
  var string = require('sjs:string');
}
and {
  var { each, map, toArray, join, reduce, at, transform, filter, sort } = require('sjs:sequence');
}
and {
  var { ownPropertyPairs, ownValues, ownKeys, merge, extend, get, clone } = require('sjs:object');
}
and {
  var docutil = require('sjs:docutil');
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

exports.run = function(doc_root, trail_parent, index_parent, main_parent) {

  // construct our main ui:
  var top_view, index_view, trail_view;
  top_view = ui.makeView(
    "<div class='mb-top mb-main' name='main'></div>");
  doc_root = url.normalize(doc_root, document.location.href);

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
    var location = parseLocation(doc_root);
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
        events.wait(window, "hashchange");
        location = parseLocation(doc_root);
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
    children: {name1: {type:"module|dir", name:name1, summary: STRING|null}, name2: ..., ...},
    OPT lib: STRING, // short name
    OPT summary: STRING,
    OPT desc: STRING
  }
    
*/
var getLibDocs = exports.getLibDocs = func.memoize(function(libpath) {
  try {
    var u = url.build(libpath, "sjs-lib-index.txt");
    var docs = docutil.parseSJSLibDocs(http.get(u));
    docs.path = libpath;
    return docs;
  }
  catch (e) {
    return null;
  }
});

var getIndex = func.memoize(function(root) {
  var u = url.build(root, "sjs-lib-index.json");
  var contents;
  try {
    contents = http.get(u);
  } catch(e) {
    if (e.status && e.status == 404) {
      return null;
    }
    throw e;
  }
  return JSON.parse(contents);
});


// retrieve documentation for lib at path, as well as parents
function getPathDocs(libpath) {
  var docs = [];
  var current;
  while (libpath) {
    current = getLibDocs(libpath);
    if (!current) break;
    docs.unshift(current);
    libpath = parentPath(libpath);
  }

  var index = getIndex(docs[0].path);
  // if we have an index, extend all directory docs with
  // information from their entry in the index
  // (contains children and summary)
  for (var i=0; i<docs.length; i++) {
    var doc = docs[i];
    doc.parent = docs[i-1];
    if (index) {
      if (i > 0) {
        var name = doc.path.match(/([^\/]+\/)$/) .. at(1);
        index = index.children .. get(name);
      }
      if (index) {
        doc = docs[i] = doc .. clone();
        // merge
        ['children'] .. each {|key|
          doc[key] = merge(doc[key], index[key]);
        };

        // override
        ['summary'] .. each {|key|
          doc[key] = doc[key] || index[key];
        };
      }
    }
  }
  return docs .. at(-1);
}

var getModuleDocs = func.memoize(function(modulepath) {
  try {
    if (modulepath.charAt(modulepath.length-1) == '/') return null;
    var docs = docutil.parseModuleDocs(http.get(modulepath + ".sjs?format=src"));
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
    "<div class='mb-top mb-trail'>StratifiedJS Documentation Browser</div>");
  view.update = function(location) {
    var html = "";
    var path_docs = getPathDocs(location.path);
    if (path_docs) {
      while (path_docs.parent) {
        html = "&nbsp;<b>&raquo;</b>&nbsp;<a href='#"+location.relativeLink(path_docs.path)+"'>"+
          topDir(path_docs.path) +"</a>" + html;
        path_docs = path_docs.parent;
      }
      html = "<a href='#"+location.relativeLink(path_docs.path)+"'>"+
        (path_docs.lib || "Unnamed Module Collection") +"</a>" + html;
    }
    if (location.module) {
      if (html.length) html += "&nbsp;<b>&raquo;</b>&nbsp;"
      html += "<a href='#"+location.moduleLink()+"'>"+location.module+"</a>";
    }
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
      ownValues(entries) .. each { |e| e.hide() }
      entries = {}; selection = null;

      if (lib_docs) {
        (entries["./"] = makeIndexDirEntry(location, "./")).show(view.elems.list);
        if (lib_docs.parent) {
          (entries["../"] = makeIndexDirEntry(location, "../")).show(view.elems.list);
        }
        // create a sorted list of modules & directories:
        var l = [];
        lib_docs.children
          .. ownKeys
          .. sort
          .. each {|name|
            var v = entries[name] = makeIndexEntry(location, name);
            v.show(view.elems.list);
          };
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
          (selection = entries[location.module] = makeIndexModuleEntry(location, location.module)).show(view.top[0]);
        } 
        selection.select(); 
      }
    }
  };

  return view;
}

function makeIndexEntry(location, name) {
  if (name .. string.endsWith('/'))
    return makeIndexDirEntry(location, name);
  return makeIndexModuleEntry(location, name);
};

function makeIndexModuleEntry(location, module) {
  var view = ui.makeView(
    "<li class='module'>
       <h3><a href='##{location.moduleLink(module)}'>#{module}</a></h3>
       <ul name='symbols'></ul>
     </li>");

  var symbols_view;

  view.select = function() {
    // we expand our view to include symbols:
    var module_docs = getModuleDocs(location.path + module);
    if (!module_docs) return; // no docs; nothing much we can do
    var symbols_template = module_docs.children
      .. ownKeys
      .. map(name -> "<li><a href='##{location.moduleLink(module)}::#{name}'>#{name}</a></li>")
      .. join;
    (symbols_view = ui.makeView(symbols_template)).show(view.elems.symbols);
  };
  view.deselect = function() { 
    if (symbols_view) symbols_view.hide(); 
    symbols_view = null;
  };

  return view;
}

function makeIndexDirEntry(location, dir) {
  var view = ui.makeView(
    "<li class='directory'>
       <h3><a href='##{location.relativeLink(url.normalize(location.path + dir))}'>#{dir}</a></h3>
     </li>");

  view.select = function() {};
  view.deselect = function() {};

  return view;
}


//----------------------------------------------------------------------
// Internal error:

function doInternalErrorDialog(txt, domparent) {
  var view = ui.makeView("
<div class='mb-error'>
<h1>:-(</h1><pre>#{txt .. string.sanitize}</pre>
<p>You shouldn't have seen this error; please report to info@onilabs.com.</p>
<p>Please also hit the 'retry' button and see if this fixes things: 
<button name='ok'>retry</button>
</p>
</div>
");
  using (view.show(domparent)) {
    try {
      events.wait(view.elems.ok, 'click');
    }
    or {
      // escape key
      events.wait(document, 'keydown', function(e) { return e.keyCode == 27; });
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
    events.wait(view.elems.retry, 'click');
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
 <h3>#{txt}</h3>
 <p>Were you looking for one of these:</p>
 <ul>
   <li><a href='http://code.onilabs.com/sjs/latest/doc/modules.html'>Latest Stable StratifiedJS Standard Library Docs</a></li>
   <li><a href='http://code.onilabs.com/sjs/unstable/doc/modules.html'>Latest Unstable (GitHub trunk) StratifiedJS Standard Library Docs</a></li>
 </ul>
 <p>Otherwise, please enter a URL pointing to a module library (a directory with a file 'sjs-lib-index.txt'), or an SJS module:</p>
<input name='url' type='text' style='width:30em' value='http://'></input><button name='go'>Go</button>
");

  view.run = function() { 
    if (window.location.hash)
      view.elems.url.value = window.location.hash.substr(1);
    view.elems.url.focus();
    try {
      events.wait(view.elems.url, "keypress", function(e) { return e.keyCode == 13; });
    }
    or { 
      events.wait(view.elems.go, "click");
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
"<h2>The #{docs.module||location.module} module</h2>
 <div class='mb-require'><code>require('#{docs.home||(location.path+location.module)}');</code></div>
 <div name='summary' class='mb-summary'></div>
 <div name='desc'></div>
 <div name='symbols'></div>
");

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);
 
  var children = {};
  docs.children .. ownPropertyPairs .. each {
    |[name, s]|
    if (!children[s.type]) children[s.type] = [];
    children[s.type].push(
        "<tr>
           <td class='mb-td-symbol'><a href='##{location.moduleLink()}::#{name}'>#{name}</a></td>
           <td>#{makeSummaryHTML(s,location)}</td>
         </tr>");
  }
  
  if (children['function'])
    ui.makeView("<h3>Functions</h3><table>"+children['function'].join("")+"</table>").show(view.elems.symbols);
  if (children['variable'])
    ui.makeView("<h3>Variables</h3><table>"+children['variable'].join("")+"</table>").show(view.elems.symbols);
  if (children['class'])
    ui.makeView("<h3>Classes</h3><table>"+children['class'].join("")+"</table>").show(view.elems.symbols);

  return view;
}

//----------------------------------------------------------------------
// Symbol View (showing details for a class or symbol):

function makeSymbolView(location) {
  var mdocs = getModuleDocs(location.path + location.module);
  if (!mdocs) throw "No module at '"+location.path + location.module+"'";
  
  var docs = mdocs;
  if (location.classname) {
    if (!(docs = mdocs.children[location.classname]))
      throw "Class '"+location.classname+"' not found in documentation";
  }

  var name = location.symbol;
  docs = docs.children[location.symbol];
  if (!docs)
    throw "Symbol '"+location.symbol+"' not found in documentation";

  var view;
  if (!location.classname) {
    view = ui.makeView(
      "<h2><a href='##{location.moduleLink()}'>#{location.module}</a>::#{location.symbol}</h2>"+
        (docs.type != "class" ?
         "<div class='mb-require'><code>require('#{mdocs.home||(location.path+location.module)}').#{location.symbol};</code></div>" : "")+
      "<div name='summary' class='mb-summary'></div>
       <div name='details'></div>
       <div name='desc'></div>
    ");
  }
  else {
    var name = docs['static'] ? location.classname + "." + location.symbol : location.symbol;
    var template =         
      "<h2><a href='##{location.moduleLink()}'>#{location.module}</a>::<a href='##{location.moduleLink()}::#{location.classname}'>#{location.classname}</a>::#{name}</h2>"+
      (docs.type == "ctor" || docs['static'] || docs.type == "proto"? 
       "<div class='mb-require'><code>require('#{mdocs.home || (location.path+location.module)}').#{name};</code></div>" : "")+
      "<div name='summary' class='mb-summary'></div>
       <div name='details'></div>
       <div name='desc'></div>
      ";
    view = ui.makeView(template);
  }

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);
  
  if (docs.type == "function" || docs.type == "ctor") {
    // function signature
    var signature;
    if (docs.type != 'ctor' && location.classname && !docs['static'])
      signature = location.classname.toLowerCase()+"."+location.symbol;
    else {
      signature = location.symbol;
      if (docs.type == 'ctor' && !docs.nonew) {
        if (signature.indexOf('.') != -1)
          signature = '('+signature+')';
        signature = "new "+signature;
      }
    }      

    signature += "(<span class='mb-arglist'>"+
      ((docs.param||[]) .. map(function(p) {
        var rv = p.name || '.';
        if (p.valtype && p.valtype.indexOf("optional") != -1)
          rv = "<span class='mb-optarg'>["+rv+"]</span>";
        return rv;
      }) .. join(", "))+
      "</span>)";

    if (docs['return']) {
      signature += " <span class='mb-rv'>returns "+
        makeTypeHTML(docs['return'].valtype, location)+"</span>";
    }

    if (docs.altsyntax)
      signature += docs.altsyntax .. map(altsyntax -> "<br>"+altsyntax.replace(/\[[^\]]+\]/g, "<span class='mb-optarg'>$&</span>")) .. join;

    ui.makeView("<h3>"+signature+"</h3>").show(view.elems.details);


    // function args details
    var args = (docs.param || []) .. map(function(p) {
      var name = p.name||'.';
      var def = p.defval? "<span class='mb-defval'>Default: "+makeTypeHTML(p.defval,location)+"</span>" : "";
      return "<tr><td class='mb-td-symbol'>#{name}</td><td><span class='mb-type'>#{makeTypeHTML(p.valtype,location)}</span>#{def}#{makeSummaryHTML(p,location)}</td></tr>";
    });
    if (args.length)
      ui.makeView("<table>"+args.join("")+"</table>").show(view.elems.details);

    // settings
    var settings = (docs.setting || []) .. map(function(s) {
      var def = s.defval? "<span class='mb-defval'>Default: "+makeTypeHTML(s.defval,location)+"</span>" : "";
      return "<tr><td class='mb-td-symbol'>#{s.name}</td><td><span class='mb-type'>#{makeTypeHTML(s.valtype, location)}</span>#{def}#{makeSummaryHTML(s, location)}</td></tr>";
    });
    if (settings.length)
      ui.makeView("<h3>Settings</h3><table>"+settings.join("")+"</table>").show(view.elems.details);

    // attribs (nearly identical to settings)
    var attribs = (docs.attrib || []) .. map(function(s) {
      var def = s.defval? "<span class='mb-defval'>Default: "+makeTypeHTML(s.defval,location)+"</span>" : "";
      return "<tr><td class='mb-td-symbol'>#{s.name}</td><td><span class='mb-type'>#{makeTypeHTML(s.valtype, location)}</span>#{def}#{makeSummaryHTML(s, location)}</td></tr>";
    });
    if (attribs.length)
      ui.makeView("<h3>Attribs</h3><table>"+attribs.join("")+"</table>").show(view.elems.details);


    if (docs['return'] && docs['return'].summary) {
      ui.makeView(
        "<h3>Return Value</h3>
         <table><tr>
           <td><span class='mb-type'>#{makeTypeHTML(docs['return'].valtype, location)}</span>#{makeSummaryHTML(docs['return'], location)}</td>
         </tr></table>").show(view.elems.details);
    }
                          
  }
  else if (docs.type == "class") {
    var template; 
    if (docs.inherit)
      template = "<h3>Class #{location.symbol} inherits #{makeTypeHTML(docs.inherit,location)}</h3>";
    else
      template = "<h3>Class #{location.symbol}</h3>";
    ui.makeView(template).show(view.elems.details);
      

    // collect symbols
    var children = {};
    docs.children .. ownPropertyPairs .. each { 
      |[name, s]|
      var type = s.type;
      if (s['static'])
        type = 'static-'+type;
      if (!children[type]) children[type] = [];
      children[type].push(
          "<tr>
             <td class='mb-td-symbol'><a href='##{location.moduleLink()}::#{location.symbol}::#{name}'>#{name}</a></td>
             <td>#{makeSummaryHTML(s, location)}</td>
           </tr>");
    }
    
    if (children['ctor'])
      ui.makeView("<table>"+children['ctor'].join("")+"</table>").show(view.elems.details);
    if (children['proto'])
      ui.makeView("<table>"+children['proto'].join("")+"</table>").show(view.elems.details);
    if (children['static-function'])
      ui.makeView("<h3>Static Functions</h3><table>"+children['static-function'].join("")+"</table>").show(view.elems.details);
    if (children['function'])
      ui.makeView("<h3>Methods</h3><table>"+children['function'].join("")+"</table>").show(view.elems.details);
    if (children['variable'])
      ui.makeView("<h3>Member Variables</h3><table>"+children['variable'].join("")+"</table>").show(view.elems.details);

  }

  return view;
}

function makeLibView(location) {
  var docs = getPathDocs(location.path);
  if (!docs) throw "No module library at '"+location.path+"'";
  var view = ui.makeView(
"<h2>#{docs.lib ? docs.lib : "Unnamed Module Collection" }</h2>
 <div name='summary' class='mb-summary'></div>
 <div name='desc'></div>
 <div name='modules'></div>
 <div name='dirs'></div>
");

  ui.makeView(makeSummaryHTML(docs, location)).show(view.elems.summary);
  ui.makeView(makeDescriptionHTML(docs, location)).show(view.elems.desc);

  // collect children:

  var modules = docs.children .. ownPropertyPairs
    .. filter([k,v] -> v.type == 'module')
    .. reduce("", (p,[name, m]) -> p +
    "<tr>
      <td class='mb-td-symbol'><a href='##{location.pathLink()}#{name}'>#{name}</a></td>
      <td>#{makeSummaryHTML(m, location)}</td>
     </tr>"
  );

  if (modules.length) {
    ui.makeView("<h3>Modules</h3><table>#{modules}</table>").show(view.elems.modules);
  }

  var dirs = docs.children .. ownPropertyPairs
    .. filter([k,v] -> v.type == 'dir')
    .. reduce("", (p,[name, d]) -> p +
    "<tr>
      <td class='mb-td-symbol'><a href='##{location.pathLink()}#{name}'>#{name}</a></td>
      <td>#{makeSummaryHTML(d,location)}</td>
     </tr>"
   );

  if (dirs.length) {
    ui.makeView("<h3>Directories</h3><table>"+dirs+"</table>").show(view.elems.dirs);
  }

  return view;
}

// Location object: location of some symbol / reference
// Includes methods for making links that are relative to
// the doc_root for this module browser.
function Location(root, path, module, classname, symbol) {
  this.root = root;
  this.path = path;
  this.module = module;
  this.classname = classname;
  this.symbol = symbol;
}
Location.prototype.pathLink = function() {
  var path = this.relativeLink(this.path);
  // don't bother to recalculate
  this.pathLink = -> path;
  return path;
}
Location.prototype.moduleLink = function(mod) {
  if (mod === undefined) mod = this.module;
  return this.relativeLink(this.path + mod);
}
Location.prototype.relativeLink = function(href) {
  if (href .. string.startsWith(this.root)) {
    href = href.substr(this.root.length);
  }
  return href;
}

//----------------------------------------------------------------------
// helpers

// we expect window.location to be of the form:
//
//    # [http://foo.bar/modulelib/]  [ module  [ [ ::class ] ::symbol ] ]
//
// we parse this into {path, module, classname, symbol}
//
// If URL is not given, we use default_location (or window.location href)
function parseLocation(doc_root) {
  var hash = window.location.hash || "#" + doc_root;
  //if (!window.location.hash)
  //  window.location.replace("#"+doc_root);
  var matches = /#(.*\/)?([^:/#]*)(?:\:\:([^:]*)(?:\:\:(.*))?)?/.exec(hash);

  if (!matches) return new Location(doc_root, "", "", "", "");
  var [, matchUrl, module, classname, symbol] = matches;
  var loc = new Location(
    doc_root,
    url.normalize(matchUrl || "", doc_root), // XXX want resolution like in require here
    module,
    symbol ? classname : null,
    symbol ? symbol : classname
  );
  // we don't want .sjs extensions in module names:
  if (/\.sjs$/.test(loc.module)) loc.module = loc.module.substr(0,loc.module.length-4);
  return loc;
}

function parentPath(path) {
  if (!url.parse(path).directory) return null;
  return url.normalize(url.build(path, "../"), window.location.href);
}

function topDir(path) {
  return /([^\/]+)\/?$/.exec(path)[1];
}

function ensureSlash(path) {
  return url.build(path, "/");
}

function makeSummaryHTML(obj, location) {
  var rv = markup(obj.summary, location);
  if (obj.deprecated)
    rv += "<div class='note'>" + 
    markup("**Deprecated:** "+obj.deprecated, location) + "</div>";
  if (obj.hostenv)
    rv += "<div class='note'><b>Note:</b> This #{obj.type} only works in the '#{obj.hostenv}' version of StratifiedJS.</div>";
  return rv;
}

function makeDescriptionHTML(obj, location) {
  var rv = obj.desc ? "<h3>Description</h3>"+markup(obj.desc, location) : "";
  return rv;
}

function makeTypeHTML(type, location) {
  if (!type) return "";
  type = type.split("|");
  for (var i=0; i<type.length; ++i) {
    var resolved = resolveLink(type[i].replace('optional ',''), location);
    if (!resolved) continue;
    type[i] = (type[i].indexOf('optional') != -1 ? "optional ":"") + "<a href='"+location.relativeLink(resolved[0])+"'>"+resolved[1]+"</a>";
  }
  return type.join("|");
}

function resolveLink(id, location) {
  if (id.indexOf("::") == -1) return null; // ids we care about contain '::' 
  var resolved = null;
  if (id.charAt(id.length-1) == ':') {
    // link to another module
    id = id.substring(0, id.length-2);
    var desc = id.replace(/^[.\/]*/, ''); // don't print relative path components
    var target = url.normalize(id, location.path);
    resolved = [target, desc];
  }
  else if (id.charAt(0) != ':') {
    // 'absolute' link into another module of our lib
    // e.g. "cutil::Semaphore::acquire"
    resolved = [location.path+id, "<code>"+id+"</code>"];
  }
  else {
    // 'relative' link into our module
    // e.g. "::Semaphore::acquire", or "::foo"
    resolved = [location.path+location.module+id, "<code>"+id.substring(2)+"</code>"];
  }
  if (!resolved) return null;

  // relativize the link:
  resolved[0] = "#" + location.relativeLink(resolved[0]);
  return resolved;
}


function markup(text, location) {
  function resolve(id) { return resolveLink(id, location); }
  return require('./showdown').makeHTML(text, resolve);
}
