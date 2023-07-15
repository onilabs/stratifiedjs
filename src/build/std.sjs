/**
  // metadata for sjs:bundle:
  @require sjs:object
  @require sjs:array
  @require sjs:set
  @require sjs:map
  @require sjs:sequence
  @require sjs:string
  @require sjs:compare
  @require sjs:debug
  @require sjs:function
  @require sjs:cutil
  @require sjs:quasi
  @require sjs:assert
  @require sjs:logging
  @require sjs:event
  @require sjs:sys
  @require sjs:http
  @require sjs:regexp
  @require sjs:url
  @require sjs:observable
  @require sjs:service
*/

var { hostenv, getGlobal } = require('builtin:apollo-sys');
var modules = [
  'sjs:object',
  'sjs:array',
  'sjs:set',
  'sjs:map',
  'sjs:sequence',
  'sjs:string',
  'sjs:compare',
  'sjs:debug',
  {id: 'sjs:function', name:'fn'},
  'sjs:cutil',
  'sjs:quasi',
  {id:'sjs:assert', name:'assert'},
  {id:'sjs:logging', include:['print','debug','verbose','info','warn','error']},
  {id:'sjs:logging', name:'logging'},
  'sjs:event',
  {id:'sjs:sys', name: 'sys'},
  {id:'sjs:http', name: 'http'},
  {id:'sjs:regexp', name: 'regexp'},
  {id:'sjs:url', name: 'url'},
  'sjs:observable',
  'sjs:service'
];

if (hostenv === 'nodejs') {
  modules = modules.concat([
    {id:'sjs:nodejs/stream', name:'stream'},
    {id:'sjs:nodejs/stream', include:['pump']},
    {id:'sjs:sys', include: ['argv', 'eval']},
    'sjs:bytes',
    {id:'nodejs:path', name: 'path'},
    {id:'sjs:nodejs/fs', name: 'fs'},
    {id:'sjs:nodejs/child-process', name: 'childProcess'},
  ]);
} else {
  modules = modules.concat([
    {id:'sjs:sys', include: ['eval']}
  ]);
  if (getGlobal().document && getGlobal().document.createElement) {
    modules = modules.concat([
      {id: 'sjs:xbrowser/dom', name: 'dom'},
      {id: 'sjs:xbrowser/dom', include: ['preventDefault','stopEvent', 'eventTarget']}
    ]);
  }
}

