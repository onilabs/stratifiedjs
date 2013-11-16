
/* ------------------------------------ *
* NOTE:                                *
*   This file is auto-generated        *
*   any manual edits will be LOST      *
* ------------------------------------ */
/**
  // metadata for sjs:bundle:
  @require sjs:object
  @require sjs:array
  @require sjs:sequence
  @require sjs:compare
  @require sjs:debug
  @require sjs:function
  @require sjs:cutil
  @require sjs:quasi
  @require sjs:assert
  @require sjs:logging
  @require sjs:string
  @require sjs:events
  @require sjs:sys
  @require sjs:url
*/

var hostenv = require('builtin:apollo-sys').hostenv;
var modules = [
  'sjs:object',
  'sjs:array',
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
  {id:'sjs:events', exclude: ['Stream', 'Queue']},
  {id:'sjs:sys', name: 'sys'},
  {id:'sjs:http', name: 'http'},
  {id:'sjs:regexp', name: 'regexp'},
  {id:'sjs:url', name: 'url'},
];

if (hostenv === 'nodejs') {
  modules = modules.concat([
    'sjs:nodejs/stream',
    {id:'sjs:sys', include: ['argv', 'eval']},
    {id:'nodejs:path', name: 'path'},
    {id:'sjs:nodejs/fs', name: 'fs'},
    {id:'sjs:nodejs/child-process', name: 'childProcess'},
  ]);
} else {
  modules = modules.concat([
    {id:'sjs:sys', include: ['eval']},
    {id: 'sjs:xbrowser/dom', name: 'dom'},
    {id: 'sjs:xbrowser/dom', include: ['preventDefault','stopEvent', 'eventTarget']},
  ]);
}

module.exports = require(modules);

/**
@noindex
@summary Common functionality for SJS modules
@desc
  
  This module combines commonly-used functionality from the
  StratifiedJS standard library.
  
  Below are a list of the symbols exposed in this module, with
  links to the symbol's original module.
  ### From the [sjs:object::] module:
   - **get**: (function [sjs:object::get])
   - **getOwn**: (function [sjs:object::getOwn])
   - **getPath**: (function [sjs:object::getPath])
   - **setPath**: (function [sjs:object::setPath])
   - **has**: (function [sjs:object::has])
   - **hasOwn**: (function [sjs:object::hasOwn])
   - **keys**: (function [sjs:object::keys])
   - **ownKeys**: (function [sjs:object::ownKeys])
   - **values**: (function [sjs:object::values])
   - **ownValues**: (function [sjs:object::ownValues])
   - **propertyPairs**: (function [sjs:object::propertyPairs])
   - **ownPropertyPairs**: (function [sjs:object::ownPropertyPairs])
   - **pairsToObject**: (function [sjs:object::pairsToObject])
   - **extend**: (function [sjs:object::extend])
   - **merge**: (function [sjs:object::merge])
   - **clone**: (function [sjs:object::clone])
   - **override**: (function [sjs:object::override])
   - **construct**: (function [sjs:object::construct])
   - **Constructor**: (function [sjs:object::Constructor])
  ### From the [sjs:array::] module:
   - **isArrayLike**: (function [sjs:array::isArrayLike])
   - **remove**: (function [sjs:array::remove])
   - **cycle**: (function [sjs:array::cycle])
   - **flatten**: (function [sjs:array::flatten])
   - **union**: (function [sjs:array::union])
   - **difference**: (function [sjs:array::difference])
   - **cmp**: (function [sjs:array::cmp])
  ### From the [sjs:sequence::] module:
   - **Sequence**: (class [sjs:sequence::Sequence])
   - **Stream**: (class [sjs:sequence::Stream])
   - **toStream**: (function [sjs:sequence::toStream])
   - **isStream**: (function [sjs:sequence::isStream])
   - **isSequence**: (function [sjs:sequence::isSequence])
   - **generate**: (function [sjs:sequence::generate])
   - **each**: (function [sjs:sequence::each])
   - **consume**: (function [sjs:sequence::consume])
   - **toArray**: (function [sjs:sequence::toArray])
   - **SequenceExhausted**: (class [sjs:sequence::SequenceExhausted])
   - **first**: (function [sjs:sequence::first])
   - **at**: (function [sjs:sequence::at])
   - **slice**: (function [sjs:sequence::slice])
   - **join**: (function [sjs:sequence::join])
   - **sort**: (function [sjs:sequence::sort])
   - **sortBy**: (function [sjs:sequence::sortBy])
   - **reverse**: (function [sjs:sequence::reverse])
   - **count**: (function [sjs:sequence::count])
   - **take**: (function [sjs:sequence::take])
   - **takeWhile**: (function [sjs:sequence::takeWhile])
   - **skip**: (function [sjs:sequence::skip])
   - **skipWhile**: (function [sjs:sequence::skipWhile])
   - **filter**: (function [sjs:sequence::filter])
   - **partition**: (function [sjs:sequence::partition])
   - **map**: (function [sjs:sequence::map])
   - **transform**: (function [sjs:sequence::transform])
   - **concat**: (function [sjs:sequence::concat])
   - **pack**: (function [sjs:sequence::pack])
   - **unpack**: (function [sjs:sequence::unpack])
   - **combine**: (function [sjs:sequence::combine])
   - **groupBy**: (function [sjs:sequence::groupBy])
   - **zip**: (function [sjs:sequence::zip])
   - **zipLongest**: (function [sjs:sequence::zipLongest])
   - **indexed**: (function [sjs:sequence::indexed])
   - **intersperse**: (function [sjs:sequence::intersperse])
   - **reduce**: (function [sjs:sequence::reduce])
   - **reduce1**: (function [sjs:sequence::reduce1])
   - **find**: (function [sjs:sequence::find])
   - **hasElem**: (function [sjs:sequence::hasElem])
   - **all**: (function [sjs:sequence::all])
   - **any**: (function [sjs:sequence::any])
   - **integers**: (function [sjs:sequence::integers])
   - **fib**: (function [sjs:sequence::fib])
   - **buffer**: (function [sjs:sequence::buffer])
   - **each.par**: (function [sjs:sequence::each.par])
   - **map.par**: (function [sjs:sequence::map.par])
   - **transform.par**: (function [sjs:sequence::transform.par])
   - **transform.par.unordered**: (function [sjs:sequence::transform.par.unordered])
   - **find.par**: (function [sjs:sequence::find.par])
   - **filter.par**: (function [sjs:sequence::filter.par])
   - **all.par**: (function [sjs:sequence::all.par])
   - **any.par**: (function [sjs:sequence::any.par])
  ### From the [sjs:string::] module:
   - **isString**: (function [sjs:string::isString])
   - **sanitize**: (function [sjs:string::sanitize])
   - **supplant**: (function [sjs:string::supplant])
   - **startsWith**: (function [sjs:string::startsWith])
   - **endsWith**: (function [sjs:string::endsWith])
   - **contains**: (function [sjs:string::contains])
   - **strip**: (function [sjs:string::strip])
   - **lstrip**: (function [sjs:string::lstrip])
   - **rstrip**: (function [sjs:string::rstrip])
   - **split**: (function [sjs:string::split])
   - **rsplit**: (function [sjs:string::rsplit])
   - **padRight**: (function [sjs:string::padRight])
   - **padLeft**: (function [sjs:string::padLeft])
   - **padBoth**: (function [sjs:string::padBoth])
   - **unindent**: (function [sjs:string::unindent])
   - **capitalize**: (function [sjs:string::capitalize])
   - **utf16ToUtf8**: (function [sjs:string::utf16ToUtf8])
   - **utf8ToUtf16**: (function [sjs:string::utf8ToUtf16])
   - **octetsToBase64**: (function [sjs:string::octetsToBase64])
   - **base64ToOctets**: (function [sjs:string::base64ToOctets])
  ### From the [sjs:compare::] module:
   - **equals**: (function [sjs:compare::equals])
   - **eq**: (function [sjs:compare::eq])
   - **shallowEquals**: (function [sjs:compare::shallowEquals])
   - **shallowEq**: (function [sjs:compare::shallowEq])
   - **describeEquals**: (function [sjs:compare::describeEquals])
  ### From the [sjs:debug::] module:
   - **inspect**: (function [sjs:debug::inspect])
   - **prompt**: (function [sjs:debug::prompt])
  ### From the [sjs:function::] module:
   - **fn**: (module [sjs:function::])
  ### From the [sjs:cutil::] module:
   - **StratumAborted**: (class [sjs:cutil::StratumAborted])
   - **waitforAll**: (function [sjs:cutil::waitforAll])
   - **waitforFirst**: (function [sjs:cutil::waitforFirst])
   - **Semaphore**: (class [sjs:cutil::Semaphore])
   - **Condition**: (class [sjs:cutil::Condition])
   - **Queue**: (class [sjs:cutil::Queue])
   - **breaking**: (function [sjs:cutil::breaking])
  ### From the [sjs:quasi::] module:
   - **Quasi**: (class [sjs:quasi::Quasi])
   - **isQuasi**: (function [sjs:quasi::isQuasi])
   - **joinQuasis**: (function [sjs:quasi::joinQuasis])
   - **mapQuasi**: (function [sjs:quasi::mapQuasi])
   - **toQuasi**: (function [sjs:quasi::toQuasi])
  ### From the [sjs:assert::] module:
   - **assert**: (module [sjs:assert::])
  ### From the [sjs:logging::] module:
   - **print**: (function [sjs:logging::print])
   - **debug**: (function [sjs:logging::debug])
   - **verbose**: (function [sjs:logging::verbose])
   - **info**: (function [sjs:logging::info])
   - **warn**: (function [sjs:logging::warn])
   - **error**: (function [sjs:logging::error])
   - **logging**: (module [sjs:logging::])
  ### From the [sjs:events::] module:
   - **Emitter**: (class [sjs:events::Emitter])
   - **HostEmitter**: (class [sjs:events::HostEmitter])
   - **wait**: (function [sjs:events::wait])
   - **when**: (function [sjs:events::when])
  ### From the [sjs:sys::] module:
   - **sys**: (module [sjs:sys::])
  ### From the [sjs:http::] module:
   - **http**: (module [sjs:http::])
  ### From the [sjs:regexp::] module:
   - **regexp**: (module [sjs:regexp::])
  ### From the [sjs:url::] module:
   - **url**: (module [sjs:url::])
  ### From the [sjs:nodejs/stream::] module:
  *(when in the nodejs environment)*
   - **read**: (function [sjs:nodejs/stream::read])
   - **readAll**: (function [sjs:nodejs/stream::readAll])
   - **write**: (function [sjs:nodejs/stream::write])
   - **pump**: (function [sjs:nodejs/stream::pump])
   - **ReadableStringStream**: (class [sjs:nodejs/stream::ReadableStringStream])
   - **WritableStringStream**: (class [sjs:nodejs/stream::WritableStringStream])
  ### From the [sjs:sys::] module:
  *(when in the nodejs environment)*
   - **argv**: (function [sjs:sys::argv])
   - **eval**: (function [sjs:sys::eval])
  ### From the [nodejs:path](http://nodejs.org/api/path.html) module:
  *(when in the nodejs environment)*
   - **path**: (module [nodejs:path](http://nodejs.org/api/path.html))
  ### From the [sjs:nodejs/fs::] module:
  *(when in the nodejs environment)*
   - **fs**: (module [sjs:nodejs/fs::])
  ### From the [sjs:nodejs/child-process::] module:
  *(when in the nodejs environment)*
   - **childProcess**: (module [sjs:nodejs/child-process::])
  ### From the [sjs:sys::] module:
  *(when in the xbrowser environment)*
  ### From the [sjs:xbrowser/dom::] module:
  *(when in the xbrowser environment)*
   - **dom**: (module [sjs:xbrowser/dom::])
   - **preventDefault**: (function [sjs:xbrowser/dom::preventDefault])
   - **stopEvent**: (function [sjs:xbrowser/dom::stopEvent])
   - **eventTarget**: (function [sjs:xbrowser/dom::eventTarget])

*/
