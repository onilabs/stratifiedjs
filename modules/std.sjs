
/* ----------------------------------- *
* NOTE:                                *
*   This file is auto-generated        *
*   any manual edits will be LOST      *
*   (edit src/build/std.sjs instead)   *
* ------------------------------------ */
/**
  // metadata for sjs:bundle:
  @require sjs:object
  @require sjs:array
  @require sjs:set
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
*/

var hostenv = require('builtin:apollo-sys').hostenv;
var modules = [
  'sjs:object',
  'sjs:array',
  'sjs:set',
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
  'sjs:observable'
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
  
  ### Module aliases:
  
   - **assert**: (module [sjs:assert](#sjs%3Aassert))
   - **childProcess**: (module [sjs:nodejs/child-process](#sjs%3Anodejs%2Fchild-process))
   - **dom**: (module [sjs:xbrowser/dom](#sjs%3Axbrowser%2Fdom))
   - **fn**: (module [sjs:function](#sjs%3Afunction))
   - **fs**: (module [sjs:nodejs/fs](#sjs%3Anodejs%2Ffs))
   - **http**: (module [sjs:http](#sjs%3Ahttp))
   - **logging**: (module [sjs:logging](#sjs%3Alogging))
   - **path**: (module [nodejs:path](http://nodejs.org/api/path.html))
   - **regexp**: (module [sjs:regexp](#sjs%3Aregexp))
   - **stream**: (module [sjs:nodejs/stream](#sjs%3Anodejs%2Fstream))
   - **sys**: (module [sjs:sys](#sjs%3Asys))
   - **url**: (module [sjs:url](#sjs%3Aurl))
  
  ### Symbols from the [sjs:array](#sjs%3Aarray) module:
  
   - **array_difference**: (function [sjs:array::array_difference])
   - **array_union**: (function [sjs:array::array_union])
   - **cmp**: (function [sjs:array::cmp])
   - **cycle**: (function [sjs:array::cycle])
   - **flatten**: (function [sjs:array::flatten])
   - **haveCommonElements**: (function [sjs:array::haveCommonElements])
   - **isArrayLike**: (function [sjs:array::isArrayLike])
   - **kCombinations**: (function [sjs:array::kCombinations])
   - **permutations**: (function [sjs:array::permutations])
   - **remove**: (function [sjs:array::remove])
  
  
  ### Symbols from the [sjs:bytes](#sjs%3Abytes) module:
  *(when in the nodejs environment)*
  
   - **isArrayBuffer**: (function [sjs:bytes::isArrayBuffer])
   - **isBuffer**: (function [sjs:bytes::isBuffer])
   - **isBytes**: (function [sjs:bytes::isBytes])
   - **isUint8Array**: (function [sjs:bytes::isUint8Array])
   - **parseBytes**: (function [sjs:bytes::parseBytes])
   - **toArrayBuffer**: (function [sjs:bytes::toArrayBuffer])
   - **toBuffer**: (function [sjs:bytes::toBuffer])
   - **toUint8Array**: (function [sjs:bytes::toUint8Array])
  
  
  ### Symbols from the [sjs:compare](#sjs%3Acompare) module:
  
   - **describeEquals**: (function [sjs:compare::describeEquals])
   - **eq**: (function [sjs:compare::eq])
   - **equals**: (function [sjs:compare::equals])
   - **shallowEq**: (function [sjs:compare::shallowEq])
   - **shallowEquals**: (function [sjs:compare::shallowEquals])
  
  
  ### Symbols from the [sjs:cutil](#sjs%3Acutil) module:
  
   - **breaking**: (function [sjs:cutil::breaking])
   - **Condition**: (class [sjs:cutil::Condition])
   - **Queue**: (class [sjs:cutil::Queue])
   - **Semaphore**: (class [sjs:cutil::Semaphore])
   - **StratumAborted**: (variable [sjs:cutil::StratumAborted])
   - **waitforAll**: (function [sjs:cutil::waitforAll])
   - **waitforFirst**: (function [sjs:cutil::waitforFirst])
   - **withSpawnScope**: (function [sjs:cutil::withSpawnScope])
  
  
  ### Symbols from the [sjs:debug](#sjs%3Adebug) module:
  
   - **inspect**: (function [sjs:debug::inspect])
   - **prompt**: (function [sjs:debug::prompt])
   - **Stopwatch**: (class [sjs:debug::Stopwatch])
  
  
  ### Symbols from the [sjs:event](#sjs%3Aevent) module:
  
   - **Emitter**: (class [sjs:event::Emitter])
   - **events**: (function [sjs:event::events])
   - **wait**: (function [sjs:event::wait])
  
  
  ### Symbols from the [sjs:logging](#sjs%3Alogging) module:
  
   - **debug**: (function [sjs:logging::debug])
   - **error**: (function [sjs:logging::error])
   - **info**: (function [sjs:logging::info])
   - **print**: (function [sjs:logging::print])
   - **verbose**: (function [sjs:logging::verbose])
   - **warn**: (function [sjs:logging::warn])
  
  
  ### Symbols from the [sjs:nodejs/stream](#sjs%3Anodejs%2Fstream) module:
  *(when in the nodejs environment)*
  
   - **pump**: (function [sjs:nodejs/stream::pump])
  
  
  ### Symbols from the [sjs:object](#sjs%3Aobject) module:
  
   - **allKeys**: (function [sjs:object::allKeys])
   - **allPropertyPairs**: (function [sjs:object::allPropertyPairs])
   - **allValues**: (function [sjs:object::allValues])
   - **clone**: (function [sjs:object::clone])
   - **construct**: (function [sjs:object::construct])
   - **Constructor**: (function [sjs:object::Constructor])
   - **extend**: (function [sjs:object::extend])
   - **get**: (function [sjs:object::get])
   - **getOwn**: (function [sjs:object::getOwn])
   - **getPath**: (function [sjs:object::getPath])
   - **has**: (function [sjs:object::has])
   - **hasOwn**: (function [sjs:object::hasOwn])
   - **mapValues**: (function [sjs:object::mapValues])
   - **merge**: (function [sjs:object::merge])
   - **override**: (function [sjs:object::override])
   - **ownKeys**: (function [sjs:object::ownKeys])
   - **ownPropertyPairs**: (function [sjs:object::ownPropertyPairs])
   - **ownValues**: (function [sjs:object::ownValues])
   - **pairsToObject**: (function [sjs:object::pairsToObject])
   - **pick**: (function [sjs:object::pick])
   - **setPath**: (function [sjs:object::setPath])
   - **tap**: (function [sjs:object::tap])
  
  
  ### Symbols from the [sjs:observable](#sjs%3Aobservable) module:
  
   - **changes**: (function [sjs:observable::changes])
   - **CompoundObservable**: (function [sjs:observable::CompoundObservable])
   - **ConstantObservable**: (function [sjs:observable::ConstantObservable])
   - **constantObservable**: (function [sjs:observable::constantObservable])
   - **current**: (function [sjs:observable::current])
   - **DelayedObservable**: (function [sjs:observable::DelayedObservable])
   - **isConflictError**: (function [sjs:observable::isConflictError])
   - **isObservableVar**: (function [sjs:observable::isObservableVar])
   - **isObservableWindowVar**: (function [sjs:observable::isObservableWindowVar])
   - **ObservableVar**: (class [sjs:observable::ObservableVar])
   - **ObservableWindowVar**: (class [sjs:observable::ObservableWindowVar])
   - **observe**: (function [sjs:observable::observe])
   - **sample**: (function [sjs:observable::sample])
   - **synchronize**: (function [sjs:observable::synchronize])
   - **updatesToObservable**: (function [sjs:observable::updatesToObservable])
  
  
  ### Symbols from the [sjs:quasi](#sjs%3Aquasi) module:
  
   - **isQuasi**: (function [sjs:quasi::isQuasi])
   - **joinQuasis**: (function [sjs:quasi::joinQuasis])
   - **mapQuasi**: (function [sjs:quasi::mapQuasi])
   - **Quasi**: (class [sjs:quasi::Quasi])
   - **toQuasi**: (function [sjs:quasi::toQuasi])
  
  
  ### Symbols from the [sjs:sequence](#sjs%3Asequence) module:
  
   - **.monitor.start**: (function [sjs:sequence::.monitor.start])
   - **all**: (function [sjs:sequence::all])
   - **all.par**: (function [sjs:sequence::all.par])
   - **any**: (function [sjs:sequence::any])
   - **any.par**: (function [sjs:sequence::any.par])
   - **at**: (function [sjs:sequence::at])
   - **batch**: (function [sjs:sequence::batch])
   - **batchN**: (function [sjs:sequence::batchN])
   - **buffer**: (function [sjs:sequence::buffer])
   - **combine**: (function [sjs:sequence::combine])
   - **combineSort**: (function [sjs:sequence::combineSort])
   - **concat**: (function [sjs:sequence::concat])
   - **consume**: (function [sjs:sequence::consume])
   - **consumeMultiple**: (function [sjs:sequence::consumeMultiple])
   - **count**: (function [sjs:sequence::count])
   - **dedupe**: (function [sjs:sequence::dedupe])
   - **each**: (function [sjs:sequence::each])
   - **each.par**: (function [sjs:sequence::each.par])
   - **each.track**: (function [sjs:sequence::each.track])
   - **fib**: (function [sjs:sequence::fib])
   - **filter**: (function [sjs:sequence::filter])
   - **filter.par**: (function [sjs:sequence::filter.par])
   - **find**: (function [sjs:sequence::find])
   - **find.par**: (function [sjs:sequence::find.par])
   - **first**: (function [sjs:sequence::first])
   - **generate**: (function [sjs:sequence::generate])
   - **groupBy**: (function [sjs:sequence::groupBy])
   - **hasElem**: (function [sjs:sequence::hasElem])
   - **indexed**: (function [sjs:sequence::indexed])
   - **integers**: (function [sjs:sequence::integers])
   - **intersperse**: (function [sjs:sequence::intersperse])
   - **intersperse_n_1**: (function [sjs:sequence::intersperse_n_1])
   - **isConcreteSequence**: (function [sjs:sequence::isConcreteSequence])
   - **isSequence**: (function [sjs:sequence::isSequence])
   - **isStream**: (function [sjs:sequence::isStream])
   - **isStructuredStream**: (function [sjs:sequence::isStructuredStream])
   - **join**: (function [sjs:sequence::join])
   - **last**: (function [sjs:sequence::last])
   - **map**: (function [sjs:sequence::map])
   - **map.filter**: (function [sjs:sequence::map.filter])
   - **map.par**: (function [sjs:sequence::map.par])
   - **mirror**: (function [sjs:sequence::mirror])
   - **monitor**: (function [sjs:sequence::monitor])
   - **monitor.raw**: (function [sjs:sequence::monitor.raw])
   - **pack**: (function [sjs:sequence::pack])
   - **PACK_OMIT**: (variable [sjs:sequence::PACK_OMIT])
   - **partition**: (function [sjs:sequence::partition])
   - **product**: (function [sjs:sequence::product])
   - **reduce**: (function [sjs:sequence::reduce])
   - **reduce1**: (function [sjs:sequence::reduce1])
   - **reverse**: (function [sjs:sequence::reverse])
   - **rollingWindow**: (function [sjs:sequence::rollingWindow])
   - **scan**: (function [sjs:sequence::scan])
   - **skip**: (function [sjs:sequence::skip])
   - **skipWhile**: (function [sjs:sequence::skipWhile])
   - **slice**: (function [sjs:sequence::slice])
   - **sort**: (function [sjs:sequence::sort])
   - **sortBy**: (function [sjs:sequence::sortBy])
   - **Stream**: (class [sjs:sequence::Stream])
   - **StructuredStream**: (class [sjs:sequence::StructuredStream])
   - **tailbuffer**: (function [sjs:sequence::tailbuffer])
   - **take**: (function [sjs:sequence::take])
   - **takeUntil**: (function [sjs:sequence::takeUntil])
   - **takeWhile**: (function [sjs:sequence::takeWhile])
   - **toArray**: (function [sjs:sequence::toArray])
   - **toStream**: (function [sjs:sequence::toStream])
   - **transform**: (function [sjs:sequence::transform])
   - **transform$map**: (function [sjs:sequence::transform$map])
   - **transform.filter**: (function [sjs:sequence::transform.filter])
   - **transform.par**: (function [sjs:sequence::transform.par])
   - **transform.par.unordered**: (function [sjs:sequence::transform.par.unordered])
   - **unique**: (function [sjs:sequence::unique])
   - **uniqueBy**: (function [sjs:sequence::uniqueBy])
   - **unpack**: (function [sjs:sequence::unpack])
   - **withOpenStream**: (function [sjs:sequence::withOpenStream])
   - **zip**: (function [sjs:sequence::zip])
   - **zipLongest**: (function [sjs:sequence::zipLongest])
  
  
  ### Symbols from the [sjs:set](#sjs%3Aset) module:
  
   - **difference**: (function [sjs:set::difference])
   - **intersection**: (function [sjs:set::intersection])
   - **isSet**: (function [sjs:set::isSet])
   - **isSubset**: (function [sjs:set::isSubset])
   - **Set**: (class [sjs:set::Set])
   - **toSet**: (function [sjs:set::toSet])
   - **union**: (function [sjs:set::union])
  
  
  ### Symbols from the [sjs:string](#sjs%3Astring) module:
  
   - **arrayBufferToOctets**: (function [sjs:string::arrayBufferToOctets])
   - **base64ToArrayBuffer**: (function [sjs:string::base64ToArrayBuffer])
   - **base64ToOctets**: (function [sjs:string::base64ToOctets])
   - **capitalize**: (function [sjs:string::capitalize])
   - **contains**: (function [sjs:string::contains])
   - **decapitalize**: (function [sjs:string::decapitalize])
   - **decode**: (function [sjs:string::decode])
   - **encode**: (function [sjs:string::encode])
   - **endsWith**: (function [sjs:string::endsWith])
   - **indent**: (function [sjs:string::indent])
   - **isString**: (function [sjs:string::isString])
   - **lstrip**: (function [sjs:string::lstrip])
   - **octetsToArrayBuffer**: (function [sjs:string::octetsToArrayBuffer])
   - **octetsToBase64**: (function [sjs:string::octetsToBase64])
   - **padBoth**: (function [sjs:string::padBoth])
   - **padLeft**: (function [sjs:string::padLeft])
   - **padRight**: (function [sjs:string::padRight])
   - **prefixLines**: (function [sjs:string::prefixLines])
   - **repeat**: (function [sjs:string::repeat])
   - **rsplit**: (function [sjs:string::rsplit])
   - **rstrip**: (function [sjs:string::rstrip])
   - **sanitize**: (function [sjs:string::sanitize])
   - **split**: (function [sjs:string::split])
   - **startsWith**: (function [sjs:string::startsWith])
   - **stringToUtf8**: (function [sjs:string::stringToUtf8])
   - **strip**: (function [sjs:string::strip])
   - **supplant**: (function [sjs:string::supplant])
   - **unindent**: (function [sjs:string::unindent])
   - **utf8ToString**: (function [sjs:string::utf8ToString])
  
  
  ### Symbols from the [sjs:sys](#sjs%3Asys) module:
  
   - **argv**: (function [sjs:sys::argv])
   - **eval**: (function [sjs:sys::eval])
  
  
  ### Symbols from the [sjs:xbrowser/dom](#sjs%3Axbrowser%2Fdom) module:
  *(when in the xbrowser environment)*
  
   - **eventTarget**: (function [sjs:xbrowser/dom::eventTarget])
   - **preventDefault**: (function [sjs:xbrowser/dom::preventDefault])
   - **stopEvent**: (function [sjs:xbrowser/dom::stopEvent])

*/
