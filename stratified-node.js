/*
 * Oni StratifiedJS Runtime
 * Server-side NodeJS-based implementation
 *
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011-2022 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
global.__oni_rt={};(function(exports){var UNDEF;

























































function dummy(){}





var random64;
exports.G=global;
exports.VMID="N";
random64=require('crypto').randomBytes(8).toString('base64');
exports.VMID+=random64.replace(/\//g,'_').replace(/\+/g,'-').replace(/=/g,'');


var nextTick;
if(exports.G.process&&exports.G.process.nextTick){
nextTick=exports.G.process.nextTick;
}else if(exports.G.Promise){

nextTick=function(cb){Promise.resolve().then(cb)};
}else throw new Error("host environment not supported - need 'Promise' or 'nextTick'");





















function stack_to_string(stack){var rv='';

if(stack){
for(var i=0;i<stack.length;++i){
var line=stack[i];
if(line.length==1)line=line[0];else line='    at '+line.slice(0,2).join(':');



rv+='\n'+line;
}
}
return rv;
}

function CFException_toString(){return this.name+": "+this.message+stack_to_string(this.__oni_stack);

}

function adopt_native_stack(e,caller_module){if(!e.stack)return;


var stack=String(e.stack);




var firstColon=stack.indexOf(': ');
var msgStart=(firstColon===-1)?0:firstColon+2;


if(stack.lastIndexOf('\n',msgStart)!==-1)msgStart=0;

var msg=String(e.message);
if(msg&&stack.lastIndexOf(msg,msgStart)==msgStart){
stack=stack.slice(msgStart+msg.length);
}else{

stack=stack.replace(/^\w*Error/,'');
}
delete e.stack;
var lines=stack.split("\n");
var i;
for(i=0;i<lines.length;i++ ){
var line=lines[i];
if(!line.length)continue;

if((caller_module&&line.indexOf(caller_module)!==-1)||line.indexOf(".app!bundle")!==-1||line.indexOf("stratified-node.js")!==-1||line.indexOf("stratified.js")!==-1){




break;
}
e.__oni_stack.push([line]);
}
}

var token_oniE={};
function CFException(type,value,line,file){this.type=type;

this.val=value;

if(type==="t"&&(value instanceof Error||(typeof value==='object'&&value!=null&&value.message))){

if(value._oniE!==token_oniE){

value._oniE=token_oniE;
value.__oni_stack=value.__oni_stack||[];
value.line=line;
value.file=file||"unknown SJS source";

adopt_native_stack(value,file);

if(!value.hasOwnProperty('toString'))value.toString=CFException_toString;
}


if(line)value.__oni_stack.push([file||'unknown SJS source',line]);

}
}

var CFETypes={r:"return",b:"break",c:"continue",blb:"blocklambda break",blr:"blocklambda return"};
CFException.prototype={__oni_cfx:true,toString:function(){

if(this.type in CFETypes)return "Unexpected "+CFETypes[this.type]+" statement";else return "Uncaught internal SJS control flow exception ("+this.type+":: "+this.val+")";




},mapToJS:function(uncaught){
if(this.type=="t"){

throw this.val;
}else if(!this.aid)throw new Error(this.toString());else throw this;




}};



exports.CFException=CFException;

















































function createDynVarContext(proto_context){return Object.create(proto_context);

}
exports.createDynVarContext=createDynVarContext;

var root_dyn_vars={id:'0'};
exports.root_dyn_vars=root_dyn_vars;
exports.current_dyn_vars=root_dyn_vars;








exports.current_call=null;
















function ReturnToParentContinuation(frame,idx,val){this.frame=frame;

this.idx=idx;
this.val=val;
}
ReturnToParentContinuation.prototype={__oni_rtpc:true,execute:function(){

return this.frame.cont(this.idx,this.val)}};








function cont(frame,idx,val){var rv=frame.cont(idx,val);

while((rv&&rv.__oni_rtpc)){
rv=rv.execute();
}
return rv;
}



var ONI_EF={};

exports.is_ef=function(obj){return obj&&obj.__oni_ef===ONI_EF;

};


function setEFProto(t){for(var p in EF_Proto)t[p]=EF_Proto[p]}




function mergeCallstacks(target_ef,src_ef){if(target_ef===src_ef)return;


if(target_ef.callstack){




target_ef.callstack=target_ef.callstack.concat(src_ef.callstack);
if(target_ef.callstack.length>20)target_ef.callstack.splice(20/2,target_ef.callstack.length-20+1,['    ...(frames omitted)']);



}else{


target_ef.callstack=src_ef.callstack;
}
}


var EF_Proto={toString:function(){
return "<suspended SJS>"},__oni_ef:ONI_EF,wait:function(){


exports.current_dyn_vars=root_dyn_vars;

return this;
},setChildFrame:function(ef,idx,prevent_callstack_copy){


if(this.child_frame){


if(prevent_callstack_copy!==true&&this.child_frame.callstack){

mergeCallstacks(ef,this.child_frame);
}
this.child_frame.parent=UNDEF;
}
this.async=true;
this.child_frame=ef;
ef.parent=this;
ef.parent_idx=idx;
},quench:function(){






if(this.child_frame)this.child_frame.quench();




},abort:function(pseudo_abort){


this.aborted=true;

this.pseudo_abort=pseudo_abort;


if(!this.child_frame){

exports.current_dyn_vars=root_dyn_vars;
return this;
}else{

var abort_val=this.child_frame.abort(pseudo_abort);
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){
return this;
}else{

if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}


this.unreturnable=true;
return abort_val;
}
}
},returnToParent:function(val){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type==='t'&&this.callstack&&val.val!=null&&val.val.__oni_stack){









val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}

if(this.swallow_r){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==="r"){
val=val.val;
if(this.swallow_r===3){


val=UNDEF;
}
}
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){












if(this.swallow_r===1&&val.swallow_r&&this.tailcall){
val.swallow_r=3;
}else{

val.swallow_r=this.swallow_r;
}
}else if(this.swallow_r!==2){

val=UNDEF;
}
}




this.unreturnable=true;





if(this.async){
if(this.parent){






return new ReturnToParentContinuation(this.parent,this.parent_idx,val);






}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){





var v=val;
nextTick(function(){v.mapToJS(true)});
}
}else return val;


}};











function quenchPar(){for(var child of this.children){






if(child)child.quench();

}

};


function setChildFramePar(ef,idx){if(this.children[idx]){

if(this.children[idx].callstack){

mergeCallstacks(ef,this.children[idx]);
}
this.children[idx].parent=UNDEF;
}
this.children[idx]=ef;
ef.parent=this;
ef.parent_idx=idx;
}









var token_dis={};


function execIN(node,fenv){if(!node||node.__oni_dis!=token_dis){

return node;
}
return node.exec(node.ndata,fenv);
}
exports.ex=execIN;





exports.exseq=function(aobj,tobj,file,args){var rv=I_seq(args,new FEnv(aobj,tobj,file));


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};


exports.exrseq=function(aobj,tobj,file,args){var rv=I_reifiedseq(args,new FEnv(aobj,tobj,file));

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};





exports.exbl=function(fenv,args){var rv=I_blseq(args,fenv);


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};
































function FEnv(aobj,tobj,file,fold,branch,blanchor,reifiedstratum){this.aobj=aobj;

this.tobj=tobj;
this.file=file;
this.fold=fold;
this.branch=branch;
this.blanchor=blanchor;
this.reifiedstratum=reifiedstratum;
}

function copyFEnv(e){return new FEnv(e.aobj,e.tobj,e.file,e.fold,e.branch,e.blanchor,e.reifiedstratum);

}






function I_call(ndata,fenv){try{

current_call=[fenv.file,ndata[1]];
var rv=(ndata[0]).call(fenv);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([fenv.file,ndata[1]]);
}
return rv;
}catch(e){

if(!(e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
e=new CFException("t",e,ndata[1],fenv.file);
}
return e;
}
}

exports.C=function(...args){return {exec:I_call,ndata:args,__oni_dis:token_dis};





};






function I_nblock(ndata,fenv){try{

return (ndata[0]).call(fenv);
}catch(e){

if(!(e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
e=new CFException("t",e,ndata[1],fenv.file);
}
return e;
}
}

exports.Nb=function(...args){return {exec:I_nblock,ndata:args,__oni_dis:token_dis};





};
















function EF_Seq(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;

if(ndata[0]&8){




}else if(ndata[0]&1){

}

this.tailcall=!(ndata[0]&8);






this.swallow_r=(ndata[0]&1==1)?1:0;
if(ndata[0]&32)this.swallow_r=2;



this.sc=ndata[0]&(2|4);



if(ndata[0]&16){
this.unreturnable=true;


this.toplevel=true;
}
}
setEFProto(EF_Seq.prototype={});
EF_Seq.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){




this.setChildFrame(val,idx);
}else{

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}

return this.returnToParent(val);
}
while(idx<this.ndata.length){
if(this.sc&&idx>1){

if(this.sc==2){
if(val)break;
}else{

if(!val)break;
}
}
if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[idx],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
if(!(val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
return this.returnToParent(val);
}
}
}
if(++idx==this.ndata.length&&this.tailcall){

break;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
break;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
return this;
}
}
return this.returnToParent(val);
}
};

function I_seq(ndata,fenv){return cont(new EF_Seq(ndata,fenv),1);

}

exports.Seq=function(...args){return {exec:I_seq,ndata:args,__oni_dis:token_dis};





};




function createReifiedStratum(ef){var RS={toString:function(){

return "[object Stratum '"+ef.id+"']"},wait:function(){
if(ef.done)return RS;

var wef={wait:function(){
exports.current_dyn_vars=root_dyn_vars;

return wef;
},quench:function(){
ef.wait_frames.delete(wef)},abort:function(){
exports.current_dyn_vars=wef.__oni_dynvars;


return UNDEF;
},__oni_ef:ONI_EF,__oni_dynvars:exports.current_dyn_vars};




ef.wait_frames.add(wef);

exports.current_dyn_vars=root_dyn_vars;
return wef;
},running:true,spawn:function(f){

return spawnSubStratum(f,ef)},join:function(){
if(ef.pending<2)return;


var jef={wait:function(){
exports.current_dyn_vars=root_dyn_vars;

return jef;
},quench:function(){
ef.join_frames.delete(jef)},abort:function(){
exports.current_dyn_vars=jef.__oni_dynvars;



return UNDEF;
},__oni_ef:ONI_EF,__oni_dynvars:exports.current_dyn_vars};




ef.join_frames.add(jef);

exports.current_dyn_vars=root_dyn_vars;
return jef;

},abort:function(){
if(!RS.aborted){

ef.quench();
var dyn_vars=exports.current_dyn_vars;
if((ef.abort()!==ef)&&ef.parent){
cont(ef.parent,ef.parent_idx,ef.pending_rv);
}
exports.current_dyn_vars=dyn_vars;
};
return RS;
},capture:function(){
return exports.sys.captureStratum(RS);

},adopt:function(s){
if(ef.done)throw new Error("Inactive stratum cannot adopt");



if(s._ef.done||s._ef.parent===ef)return s;
var ef_to_adopt=s._ef;


if(ef_to_adopt.callstack){
ef_to_adopt.callstack.push(current_call);
}else{




ef_to_adopt.callstack=[current_call,ef_to_adopt.pending_caller];
}

var old_parent=s._ef.parent;
var old_parent_idx=s._ef.parent_idx;

var id=++ef.substratumid;
ef_to_adopt.id+='~'+ef.id+'/'+id;
++ef.pending;
ef_to_adopt.async=true;

var dynvars=exports.current_dyn_vars;

if(old_parent){
cont(old_parent,old_parent_idx,UNDEF);

}




ef_to_adopt.adopted=true;


ef_to_adopt.dynvars.__oni_anchor_route=ef.dynvars;


cont(ef,-2,[id,ef_to_adopt]);
exports.current_dyn_vars=dynvars;

return ef_to_adopt.reifiedstratum;
},_ef:ef,__oni_stratum:true};



return RS;
}

function spawnSubStratum(f,parent_ef){if(parent_ef.done)throw new Error("Cannot spawn stratum with inactive parent");

var parent_dynvars=exports.current_dyn_vars;
var id=++parent_ef.substratumid;
var reified_ef=new EF_Reified(parent_ef.id+'/'+id,parent_ef.dynvars);

exports.current_dyn_vars=reified_ef.dynvars;


++reified_ef.pending;
++parent_ef.pending;
reified_ef.callstack=[current_call];
var val;
try{

val=f(reified_ef.reifiedstratum);
}catch(e){

if(!(e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
e=new CFException("t",e);
}
val=e;
}


var substratum_val=cont(reified_ef,-1,val);
if(!reified_ef.adopted){

cont(parent_ef,-2,[id,substratum_val]);
}else{

console.log("NOT HOOKING UP ADOPTED STRATUM IN .SPAWN (parent="+reified_ef.parent+")");

cont(parent_ef,-2,[id,UNDEF]);
}
exports.current_dyn_vars=parent_dynvars;
return reified_ef.reifiedstratum;
}

function EF_Reified(id,anchor_route){this.id=id;


this.reifiedstratum=createReifiedStratum(this);
this.dynvars=createDynVarContext(exports.current_dyn_vars);
this.dynvars.__oni_anchor=UNDEF;
this.dynvars.__oni_anchor_route=anchor_route;

this.pending=0;
this.substratumid=0;
this.pending_rv=UNDEF;
this.main_child=UNDEF;
this.strata_children=new Map();
this.strata_children_aborted=false;
this.wait_frames=new Set();
this.join_frames=new Set();
}
setEFProto(EF_Reified.prototype={});







EF_Reified.prototype.contOUTERDEBUG=function(idx,val){try{

if(String(this).startsWith("<Reified3"))console.log("<<<<<<<<<< "+this+".cont("+idx+", "+val+", pending="+this.pending+",parent="+this.parent+")");
return this.cont_inner(idx,val);
}finally{

if(String(this).startsWith("<Reified3"))console.log(">>>>>>>>>> "+this+".cont("+idx+", "+val+", pending="+this.pending+",parent="+this.parent+")");
}
};

EF_Reified.prototype.cont=function(idx,val){if(idx===-1){






idx=0;
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
if(this.aborted){

val.quench();
val=val.abort();
}
}
}else if(idx===-2){

idx=val[0];
val=val[1];


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
if(this.strata_children_aborted){

val.quench();
val=val.abort();
}
}
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
if(idx===0)this.async=true;

this.setChildFrame(val,idx);
return this;
}else{


--this.pending;
if(idx===0){
this.main_child=UNDEF;
}else{

var child=this.strata_children.get(idx);
if(child){
child.parent=UNDEF;
this.strata_children.delete(idx);
}
}

if(idx===0){

if(this.pending_rv===UNDEF)this.pending_rv=val;else this.pending_rv=mergeExceptions(val,this.pending_rv);




this.aborted=true;
if(!this.strata_children_aborted)this.abort_child_strata();

}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

if(!this.aborted){

this.pending_rv=mergeExceptions(val,this.pending_rv);

this.quench();
this.abort();
if(this.done)return this.returnToParent(this.pending_rv);else return this;

}else if(val.type==='t'){

this.pending_rv=mergeExceptions(val,this.pending_rv);
}else{

var msg="Swallowing control-flow exception '"+val+"' from aborted sub-stratum";
if(console.error)console.error(msg);else console.log(msg);

}
}
}

if(this.pending<=1){
if(this.flushing){
return;
}else{

this.flushing=true;
this.flush_join_frames();
this.flushing=false;
}
}

if(this.pending===0){
if(this.done){
throw new Error(this+": Invalid internal VM state");
}
this.done=true;
this.reifiedstratum.running=false;

if(this.wait_frames.size){
var me=this;





nextTick(function(){me.flush_wait_frames()});
}



exports.current_dyn_vars=this.dynvars.__oni_anchor_route;

return this.returnToParent(this.assertRoutable(this.pending_rv));
}else if(idx===0){

this.async=true;


exports.current_dyn_vars=root_dyn_vars;

return this;
}else{


exports.current_dyn_vars=root_dyn_vars;
}
};

EF_Reified.prototype.flush_join_frames=function(){if(this.join_frames.size===0)return;

var frames=this.join_frames;
this.join_frames=new Set();
var current_dyn_vars=exports.current_dyn_vars;
for(var join_frame of frames){
if(join_frame.parent){
exports.current_dyn_vars=join_frame.__oni_dynvars;
cont(join_frame.parent,join_frame.parent_idx,UNDEF);

}
}

};

EF_Reified.prototype.flush_wait_frames=function(){var frames=this.wait_frames;


this.wait_frames=new Set();
for(var wait_frame of frames){
if(wait_frame.parent){
exports.current_dyn_vars=wait_frame.__oni_dynvars;

cont(wait_frame.parent,wait_frame.parent_idx,this.reifiedstratum);

}



exports.current_dyn_vars=root_dyn_vars;

}
};

EF_Reified.prototype.abort_child_strata=function(){;





this.strata_children_aborted=true;
if(this.strata_children.size===0)return;

for(var child of this.strata_children){

if(child[1].parent===this){
child[1].quench();
var abort_val=child[1].abort();
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){


}else{

child[1].parent=UNDEF;

this.strata_children.delete(child[0]);
--this.pending;

if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}

this.pending_rv=mergeExceptions(abort_val,this.pending_rv);

}
}else{


this.strata_children.delete(child[0]);
}
}
};

EF_Reified.prototype.abortOUTERDEBUG=function(pseudo_abort){if(String(this).startsWith("<Reified3"))console.log("<<<< "+this+".abort(pending="+this.pending+",parent="+this.parent+")");

try{
return this.abort_inner(pseudo_abort);
}finally{

if(String(this).startsWith("<Reified3"))console.log(">>>> "+this+".abort(pending="+this.pending+",parent="+this.parent+")");
}
};


EF_Reified.prototype.abort=function(pseudo_abort){if(this.aborted){





exports.current_dyn_vars=root_dyn_vars;
return this;
}
this.aborted=true;
this.pseudo_abort=pseudo_abort;
if(!this.main_child){

exports.current_dyn_vars=root_dyn_vars;
return this;
}else{

var abort_val=this.main_child.abort(pseudo_abort);
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){

return this;
}else{

this.main_child=UNDEF;

--this.pending;

if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}
this.pending_rv=mergeExceptions(abort_val,this.pending_rv);

this.abort_child_strata();

}

if(this.pending<=1){
this.flush_join_frames();

}

if(this.pending){
exports.current_dyn_vars=root_dyn_vars;
return this;
}


this.done=true;
this.reifiedstratum.running=false;

if(this.wait_frames.size){
var me=this;
nextTick(function(){me.flush_wait_frames()});
}



this.unreturnable=true;
exports.current_dyn_vars=this.dynvars.__oni_anchor_route;

return this.assertRoutable(this.pending_rv);
}
};


EF_Reified.prototype.assertRoutable=function(rv){if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx)&&(rv.type==='blb'||rv.type==='blr')){




var node=this.dynvars.__oni_anchor_route;

while(node){

if(node.__oni_anchor===rv.aid){

return rv;
}
node=node.__oni_anchor_route;
}
console.log(this+"::assertRoutable (2nd line) ANCHOR "+rv.aid+" NOT FOUND!!!");
return new CFException("t",new Error("Unroutable blocklambda break/return"));
}
return rv;
};


EF_Reified.prototype.quench=function(){if(this.main_child)this.main_child.quench();









};


EF_Reified.prototype.setChildFrame=function(ef,idx){if(idx===0){




if(this.main_child){
if(this.main_child.callstack){

mergeCallstacks(ef,this.main_child);
}
this.main_child.parent=UNDEF;
}
this.main_child=ef;
}else{

if(this.strata_children.has(idx)){
if(this.strata_children.get(idx).callstack){

mergeCallstacks(ef,this.strata_children.get(idx));
}
this.strata_children.get(idx).parent=UNDEF;
}
this.strata_children.set(idx,ef);
}
ef.parent=this;
ef.parent_idx=idx;
};

var reified_counter=0;
function I_reifiedseq(ndata,fenv){var dynvars=exports.current_dyn_vars;

var reified_ef=new EF_Reified(++reified_counter,dynvars);

exports.current_dyn_vars=reified_ef.dynvars;

var inner_ef=new EF_Seq(ndata,fenv);


reified_ef.pending_caller=current_call;

++reified_ef.pending;

inner_ef.fenv.reifiedstratum=reified_ef.reifiedstratum;



var val=cont(inner_ef,0);

if(!(exports.current_dyn_vars===root_dyn_vars||exports.current_dyn_vars===reified_ef.dynvars)){
console.log("XXXXXXXXXXXXXXXXX current dynvars = "+exports.current_dyn_vars.id+" / expected=root or "+reified_ef.dynvars.id);
}


var rv=cont(reified_ef,-1,val);




if(reified_ef.adopted){
exports.current_dyn_vars=dynvars;
return UNDEF;
}else{

return rv;
}
}

















function EF_BlSeq(ndata,fenv){this.ndata=ndata;






this.fenv=copyFEnv(fenv);

this.blanchor=fenv.blanchor;
this.fenv.blanchor=undefined;

this.tailcall=false;













this.sc=ndata[0]&(2|4);


}
setEFProto(EF_BlSeq.prototype={});
EF_BlSeq.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,idx);
}else{

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))val=this.translateCFEs(val);


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}

return this.returnToParent(val);
}
while(idx<this.ndata.length){
if(this.sc&&idx>1){

if(this.sc==2){
if(val)break;
}else{

if(!val)break;
}
}
if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[idx],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
if(!(val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))val=this.translateCFEs(val);
return this.returnToParent(val);
}
}




}
++idx;




if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
val=this.translateCFEs(val);
break;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
return this;
}
}

return this.returnToParent(val);
}
};

EF_BlSeq.prototype.translateCFEs=function(val){switch(val.type){case 'b':




val=new CFException('blb');
break;
case 'r':

val=new CFException('blr',val.val);
break;
case 'c':
return UNDEF;
default:
return val;
}


val.aid=this.blanchor.aid;




var node=exports.current_dyn_vars;
while(node){

if(node.__oni_anchor===val.aid){

return val;
}
node=node.__oni_anchor_route;
}

console.log(this+"::assertRoutable ANCHOR NOT FOUND!!!");
return new CFException("t",new Error("Unroutable blocklambda break/return"));
};

EF_BlSeq.prototype.abort=function(pseudo_abort){this.aborted=true;

if(this.breaking)return UNDEF;
this.pseudo_abort=pseudo_abort;


if(!this.child_frame){


exports.current_dyn_vars=root_dyn_vars;
return this;
}else{


var abort_val=this.child_frame.abort(pseudo_abort);

if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){
return this;
}else{

if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx))abort_val=this.translateCFEs(abort_val);
if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}


this.unreturnable=true;
return abort_val;
}
}
};









function I_blseq(ndata,fenv){if(fenv.blanchor.unreturnable)return new CFException("t",new Error("Blocklambda anchor at "+fenv.file+":"+fenv.blanchor.ndata[1]+" is inactive."));


return cont(new EF_BlSeq(ndata,fenv),1);
}



function I_blocklambda(ndata,fenv){return ndata.bind(fenv);

}

exports.Bl=function(f){return {exec:I_blocklambda,ndata:f,__oni_dis:token_dis};





};








function I_reify(ndata,fenv){var s=fenv.reifiedstratum;

if(!s)return new CFException("t",new Error("'reifiedStratum' used in non-reifiable context"),current_call[1],current_call[0]);
return s;
};

exports.Reify=function(){return {exec:I_reify,ndata:undefined,__oni_dis:token_dis};





};

















function EF_Sc(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.i=2;
this.pars=[];
}
setEFProto(EF_Sc.prototype={});

EF_Sc.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
return this.returnToParent(val);
}else{

if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
if(idx==1){

this.pars.push(val);
}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.fenv);
if(this.aborted){

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
rv.quench();
rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}
}

++this.i;
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return this.returnToParent(rv);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
this.setChildFrame(rv,1);
return this;
}
this.pars.push(rv);
}
if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}


try{
rv=this.ndata[1].apply(this.fenv,this.pars);
}catch(e){

rv=new CFException("t",e,this.ndata[0],this.fenv.file);


}
return this.returnToParent(rv);
}
};

function I_sc(ndata,fenv){return cont(new EF_Sc(ndata,fenv),0);

}


exports.Sc=function(...args){return {exec:I_sc,ndata:args,__oni_dis:token_dis};





};





function testIsFunction(f){if(typeof f=="function")return true;










return /(^| )\[[^o]/.test(""+f);
}












function EF_Fcall(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.i=2;
this.pars=[];

}
setEFProto(EF_Fcall.prototype={});

EF_Fcall.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){


return this.returnToParent(val);
}else if(idx==2){


return this.returnToParent(typeof val==='object'?val:this.o);
}else{

if(idx==1){

if(this.i===3){
this.l=val;
}else this.pars.push(val);


}
var rv;
var args_length=this.ndata.length;
if(this.ndata[0]&4)--args_length;
while(this.i<args_length){
rv=execIN(this.ndata[this.i],this.fenv);
if(this.aborted){

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
rv.quench();
rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}
}

++this.i;
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return this.returnToParent(rv);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
this.setChildFrame(rv,1,true);
return this;
}
if(this.i==3)this.l=rv;else this.pars.push(rv);



}

if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}


try{
var pars;

if(this.ndata[0]&4){
pars=[];
var spreads=this.ndata[this.ndata.length-1];
for(var i=0;i<this.pars.length;++i){
if(spreads[0]===i){
pars=pars.concat(this.pars[i]);
spreads.shift();
}else pars.push(this.pars[i]);


}
}else pars=this.pars;



current_call=[this.fenv.file,this.ndata[1]];

switch(this.ndata[0]&3){case 0:


if(typeof this.l=="function"){
rv=this.l(...pars);
}else if(!testIsFunction(this.l)){

rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.fenv.file);



}else{










try{
this.l(...pars);

}catch(e){







rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.fenv.file);



}
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.fenv.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],pars);
}else if(!testIsFunction(this.l[0][this.l[1]])){




rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.fenv.file);



}else{




var command="this.l[0][this.l[1]](";
for(var i=0;i<pars.length;++i){
if(i)command+=",";
command+="pars["+i+"]";
}
command+=")";

try{
rv=eval(command);
}catch(e){








rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.fenv.file);



}
}
break;
case 2:

var ctor=this.l;
rv=new ctor(...pars);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
if(!rv.fenv)throw new Error("Invalid constructor function (no function execution environment)");
this.o=rv.fenv.tobj;

this.setChildFrame(rv,2);
return this;
}
break;
default:
rv=new CFException("i","Invalid Fcall mode");
}
}catch(e){







if((e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
rv=e;
}else rv=new CFException("t",e,this.ndata[1],this.fenv.file);




}
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
if(this.aborted){

rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}


if(!rv.callstack)rv.callstack=[];
rv.callstack.push([this.fenv.file,this.ndata[1]]);
}
return this.returnToParent(rv);
}
};

function I_fcall(ndata,fenv){return cont(new EF_Fcall(ndata,fenv),0);

}


exports.Fcall=function(...args){return {exec:I_fcall,ndata:args,__oni_dis:token_dis};





};










var facall_counter=0;

function EF_FAcall(ndata,fenv){this.aid=++facall_counter;



this.ndata=ndata;
this.fenv=fenv;
this.i=2;
this.pars=[];


this.fenv=copyFEnv(fenv);
this.fenv.blanchor=this;

this.parent_dynvars=exports.current_dyn_vars;
this.facall_dynvars=createDynVarContext(exports.current_dyn_vars);
this.facall_dynvars.__oni_anchor_route=exports.current_dyn_vars;
this.facall_dynvars.__oni_anchor=this.aid;
}
setEFProto(EF_FAcall.prototype={});

EF_FAcall.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,idx);
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))val=this.translateCFEs(val);


exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(val);
}else if(idx===3){


exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(val);
}else if(idx==2){



if(exports.current_dyn_vars!==this.parent_dynvars)console.log(">>>>>>>>>>>>> HIT 1/2");
exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(typeof val==='object'?val:this.o);
}else{

if(idx==1){

if(this.i===3){
this.l=val;
}else this.pars.push(val);


}
var rv;
var args_length=this.ndata.length;
if(this.ndata[0]&4)--args_length;
while(this.i<args_length){

rv=execIN(this.ndata[this.i],this.fenv);
if(this.aborted){

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
rv.quench();
rv=rv.abort(this.pseudo_abort);
if(exports.current_dyn_vars!==this.parent_dynvars)console.log(">>>>>>>>> HIT 2");
if(!(rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
exports.current_dyn_vars=this.parent_dynvars;
}else{


}

return this.returnToParent(rv);
}
}

++this.i;
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx)){
if(exports.current_dyn_vars!==this.parent_dynvars)console.log(">>>>>>>>>>> HIT 3");
exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(rv);
}
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
this.setChildFrame(rv,1,true);
return this;
}
if(this.i==3)this.l=rv;else this.pars.push(rv);



}


exports.current_dyn_vars=this.facall_dynvars;

if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}


try{
var pars;

if(this.ndata[0]&4){
pars=[];
var spreads=this.ndata[this.ndata.length-1];
for(var i=0;i<this.pars.length;++i){
if(spreads[0]===i){
pars=pars.concat(this.pars[i]);
spreads.shift();
}else pars.push(this.pars[i]);


}
}else pars=this.pars;



current_call=[this.fenv.file,this.ndata[1]];

switch(this.ndata[0]&3){case 0:


if(typeof this.l=="function"){
rv=this.l(...pars);
}else if(!testIsFunction(this.l)){

rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.fenv.file);



}else{










try{
this.l(...pars);

}catch(e){







rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.fenv.file);



}
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.fenv.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],pars);
}else if(!testIsFunction(this.l[0][this.l[1]])){




rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.fenv.file);



}else{




var command="this.l[0][this.l[1]](";
for(var i=0;i<pars.length;++i){
if(i)command+=",";
command+="pars["+i+"]";
}
command+=")";

try{
rv=eval(command);
}catch(e){








rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.fenv.file);



}
}
break;
case 2:

var ctor=this.l;
rv=new ctor(...pars);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
if(!rv.fenv)throw new Error("Invalid constructor function (no function execution environment)");
this.o=rv.fenv.tobj;

this.setChildFrame(rv,2);
return this;
}
break;
default:
rv=new CFException("i","Invalid Fcall mode");
}
}catch(e){








if((e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
rv=this.translateCFEs(e);

}else rv=new CFException("t",e,this.ndata[1],this.fenv.file);




}

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){

if(this.aborted){

rv=rv.abort(this.pseudo_abort);
if(!(rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))rv=this.translateCFEs(rv);
exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(rv);
}
}
if(rv){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([this.fenv.file,this.ndata[1]]);
}
}


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===ONI_EF)){

this.setChildFrame(rv,3);
return this;
}else{

exports.current_dyn_vars=this.parent_dynvars;
return this.returnToParent(rv);
}
}
};

EF_FAcall.prototype.translateCFEs=function(val){if(val.type==='blb'&&val.aid===this.aid){


val=UNDEF;
}else if(val.type==='blr'&&val.aid===this.aid){

val=new CFException('r',val.val);
}
return val;
};


EF_FAcall.prototype.abort=function(pseudo_abort){this.aborted=true;

this.pseudo_abort=pseudo_abort;


if(!this.child_frame){

exports.current_dyn_vars=root_dyn_vars;
return this;
}else{

var abort_val=this.child_frame.abort(pseudo_abort);
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){

return this;
}else{

if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}



this.unreturnable=true;

if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx))abort_val=this.translateCFEs(abort_val);


exports.current_dyn_vars=this.parent_dynvars;

return abort_val;
}
}
};


function I_facall(ndata,fenv){return cont(new EF_FAcall(ndata,fenv),0);

}


exports.FAcall=function(...args){return {exec:I_facall,ndata:args,__oni_dis:token_dis};





};














function EF_If(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
}
setEFProto(EF_If.prototype={});

EF_If.prototype.cont=function(idx,val){switch(idx){case 0:



val=execIN(this.ndata[0],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}


case 1:
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

break;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,1);
return this;
}

if(val)val=execIN(this.ndata[1],this.fenv);else val=execIN(this.ndata[2],this.fenv);



if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
}
}
break;
default:
val=new CFException("i","invalid state in EF_If");
}
return this.returnToParent(val);
};

function I_if(ndata,fenv){return cont(new EF_If(ndata,fenv),0);

}


exports.If=function(...args){return {exec:I_if,ndata:args,__oni_dis:token_dis};





};





var Default={};
exports.Default=Default;





















function EF_Switch(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.phase=0;
}
setEFProto(EF_Switch.prototype={});

EF_Switch.prototype.cont=function(idx,val){switch(this.phase){case 0:


if(idx==0){
val=execIN(this.ndata[0],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

return this.returnToParent(val);
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,1);
return this;
}
this.phase=1;
this.testval=val;
idx=-1;
case 1:
while(true){
if(idx>-1){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))return this.returnToParent(val);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,idx);
return this;
}else if(val==Default||val==this.testval)break;


}
if(++idx>=this.ndata[1].length)return this.returnToParent(null);


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[1][idx][0],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}
}
this.phase=2;
val=0;
case 2:
while(true){
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,idx);
return this;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type=="b"){
val=val.val;
}
return this.returnToParent(val);
}
if(idx>=this.ndata[1].length){
return this.returnToParent(val);
}
if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[1][idx][1],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}
++idx;
}
default:
throw new Error("Invalid phase in Switch SJS node");
}
};

function I_switch(ndata,fenv){return cont(new EF_Switch(ndata,fenv),0);

}


exports.Switch=function(...args){return {exec:I_switch,ndata:args,__oni_dis:token_dis};





};






















function EF_Try(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.state=0;
}
setEFProto(EF_Try.prototype={});

EF_Try.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,this.state);
}else{

if(this.child_frame){
this.child_frame.parent=UNDEF;


this.child_frame=UNDEF;
}

switch(this.state){case 0:

this.state=1;
val=execIN(this.ndata[1],this.fenv);

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val);
return this;
}
case 1:

this.state=2;














if(this.ndata[2]&&((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type=="t")){

var v;
v=val.val;
val=this.ndata[2](this.fenv,v);



if(this.aborted&&(val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
}




if(!this.ndata[4]&&!this.ndata[3]&&!(this.aborted&&(val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF))){


return this.returnToParent(val);
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,0,true);
return this;
}
}
case 2:

this.state=3;

this.rv=val;
if(((this.aborted&&!this.pseudo_abort)||((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&(val.type==='blb'||val.type==='blr')))&&this.ndata[4]){
val=execIN(this.ndata[4],this.fenv);







if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,0,true);
return this;
}
}
case 3:

this.state=4;


if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type==="t"){
this.rv=val;
}

if(this.ndata[3]){
if(this.ndata[0]&1){



var v=(this.rv!==null&&typeof (this.rv)==='object'&&this.rv.__oni_cfx)?[this.rv,true,!!this.aborted,!!this.pseudo_abort,this.parent]:[this.rv,false,!!this.aborted,!!this.pseudo_abort,this.parent];


val=this.ndata[3](this.fenv,v);
}else{

val=execIN(this.ndata[3],this.fenv);
}


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,0,true);
return this;
}
}
case 4:


if(this.ndata[0]&1){
if(!(val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
val=new CFException("t",new Error("augmented finally(){} block needs to throw a value"));
}else{







if(Array.isArray(val.val))val=val.val[0];

}
}else{





if(!(val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
val=this.rv;


}else if((this.rv!==null&&typeof (this.rv)==='object'&&this.rv.__oni_cfx)&&this.rv.type==='t'&&this.rv!==val){



var msg;
if(val.type==='t')msg="Exception '"+val.val+"' thrown";else msg=CFETypes[val.type];



msg+=" in finally{} clause overriding try/catch exception '"+this.rv.val+"'";
if(console.error)console.error(msg);else console.log(msg);

}
}
break;
default:
val=new CFException("i","invalid state in CF_Try");
}
return this.returnToParent(val);
}
};

EF_Try.prototype.quench=function(){if(this.child_frame&&this.state!==4&&this.state!==3)this.child_frame.quench();


};

EF_Try.prototype.abort=function(pseudo_abort){this.aborted=true;


this.pseudo_abort=pseudo_abort;

if(!this.child_frame){
exports.current_dyn_vars=root_dyn_vars;
return this;
}


if(this.state!==4){
var val=this.child_frame.abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val);
}else{










this.async=false;
var rv=cont(this,0,val);

if(rv!==this){




return rv;
}else{

this.rv=val;
this.async=true;
}

}
}else{

exports.current_dyn_vars=root_dyn_vars;
}

return this;
};

function I_try(ndata,fenv){return cont(new EF_Try(ndata,fenv),0);

}


exports.Try=function(...args){return {exec:I_try,ndata:args,__oni_dis:token_dis};





};













function EF_Loop(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
}
setEFProto(EF_Loop.prototype={});

EF_Loop.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
}else if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==='c'||val.type==='b')val=UNDEF;
}
return this.returnToParent(val);
}else{

while(true){

if(idx===0){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

return this.returnToParent(val);
}

val=execIN(this.ndata[1],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,2,true);
return this;
}
idx=2;
}

if(idx>1){
if(idx===2){

if(!val||(val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){

return this.returnToParent(val);
}
}
while(1){
if(idx>2){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==="b"){

val=UNDEF;
}else if(val.type==="c"){


val=UNDEF;

break;
}
return this.returnToParent(val);
}
if(idx>=this.ndata.length)break;

}


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[idx+1],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);


if(!(val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF))return this.returnToParent(val);

}
}
++idx;
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,idx);
return this;
}
}
idx=1;
}

if(this.ndata[2]){

val=execIN(this.ndata[2],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,0,true);
return this;
}
}
idx=0;
}
}
};

function I_loop(ndata,fenv){return cont(new EF_Loop(ndata,fenv),ndata[0],true);

}


exports.Loop=function(...args){return {exec:I_loop,ndata:args,__oni_dis:token_dis};





};













function EF_ForIn(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
}
setEFProto(EF_ForIn.prototype={});

EF_ForIn.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,idx);
}else{

if(idx==0){
val=execIN(this.ndata[0],this.fenv);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,1,true);
return this;
}
idx=1;
}
if(idx==1){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted)return this.returnToParent(val);

var for_in_obj=val;
for(var x in for_in_obj){
if(typeof this.remainingX==='undefined'){
val=this.ndata[1](this.fenv,x);
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
continue;
}
return this.returnToParent(val);
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.remainingX=[];
this.for_in_obj=for_in_obj;
}
}else this.remainingX.push(x);


}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
if(!this.remainingX)this.remainingX=[];
this.setChildFrame(val,2,true);
return this;
}

return this.returnToParent(val);
}
if(idx==2){
while(1){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||this.aborted){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
if(this.remainingX.length)continue;

}
return this.returnToParent(val);
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,2,true);
return this;
}
var arg;
while(true){
if(!this.remainingX.length){
this.for_in_obj=undefined;
return this.returnToParent(val);
}
arg=this.remainingX.shift();
if(arg in this.for_in_obj)break;

}
val=this.ndata[1](this.fenv,arg);

}
}
}
};

function I_forin(ndata,fenv){return cont(new EF_ForIn(ndata,fenv),0);

}


exports.ForIn=function(...args){return {exec:I_forin,ndata:args,__oni_dis:token_dis};





};














function mergeExceptions(new_exception,original_exception){if((new_exception!==null&&typeof (new_exception)==='object'&&new_exception.__oni_cfx)){


if(!(original_exception!==null&&typeof (original_exception)==='object'&&original_exception.__oni_cfx)){
return new_exception;
}


if(new_exception.type!=='t')return original_exception;
if(console){

var msg;
if(original_exception.type==='t')msg="Multiple exceptions from sub-strata. Swallowing "+original_exception.val;else msg="Swallowing control-flow exception of type '"+original_exception.type+"' because it is overridden by a true exception";



if(console.error)console.error(msg);else console.log(msg);

}
return new_exception;
}else{

return original_exception;
}
}


function EF_Par(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Par.prototype={});

EF_Par.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,idx);
}else{

if(idx==-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<this.ndata.length;++i){
val=execIN(this.ndata[i],this.fenv);
if(this.inner_aborted){


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingCFE=mergeExceptions(val,this.pendingCFE);
return this.pendingCFE;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

++this.pending;

this.setChildFrame(val,i);
if(i<this.ndata.length-1){
exports.current_dyn_vars=parent_dyn_vars;
}
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){


this.pendingCFE=val;
this.quench();
return this.abortInner();
}
}





this.ndata=UNDEF;
}else{


--this.pending;
if(this.children[idx]){

this.children[idx].parent=UNDEF;
this.children[idx]=UNDEF;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&!this.inner_aborted){

this.pendingCFE=val;
this.quench();
return this.returnToParent(this.abortInner());
}
}
if(this.pending<2){
if(this.pendingCFE===undefined){


if(this.pending===0)return this.returnToParent(val);


var return_child;
for(var i=0;i<this.children.length;++i)if((return_child=this.children[i])){




exports.current_dyn_vars=root_dyn_vars;
return this.returnToParent(return_child);
}
return this.returnToParent(new CFException("i","invalid state in Par"));
}else{





this.pendingCFE=mergeExceptions(val,this.pendingCFE);

if(this.pending===0)return this.returnToParent(this.pendingCFE);

}
}
exports.current_dyn_vars=root_dyn_vars;
this.async=true;
return this;
}
};

EF_Par.prototype.quench=quenchPar;

EF_Par.prototype.abort=function(pseudo_abort){if(this.aborted){









exports.current_dyn_vars=root_dyn_vars;
return this;

}else this.pseudo_abort=pseudo_abort;


this.aborted=true;
return this.abortInner();
};

EF_Par.prototype.abortInner=function(){this.inner_aborted=true;






for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF))this.setChildFrame(val,i);else{


this.pendingCFE=mergeExceptions(val,this.pendingCFE);





--this.pending;
this.children[i]=UNDEF;
}
}

if(!this.pending)return this.pendingCFE;



exports.current_dyn_vars=root_dyn_vars;
this.async=true;
return this;
};


EF_Par.prototype.setChildFrame=setChildFramePar;

function I_par(ndata,fenv){return cont(new EF_Par(ndata,fenv),-1);

}


exports.Par=function(...args){return {exec:I_par,ndata:args,__oni_dis:token_dis};





};













function EF_Alt(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;

this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Alt.prototype={});

EF_Alt.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,idx);
}else{

if(idx==-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<this.ndata.length;++i){


var fenv=copyFEnv(this.fenv);
fenv.fold=this;
fenv.branch=i;
val=execIN(this.ndata[i],fenv);

if(this.inner_aborted){


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingRV=mergeExceptions(val,this.pendingRV);
return this.pendingRV;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

++this.pending;
this.setChildFrame(val,i);
if(i<this.ndata.length-1){
exports.current_dyn_vars=parent_dyn_vars;
}
}else{


this.pendingRV=val;
this.quench();
return this.abortInner();
}
if(this.collapsed)break;
}
this.ndata=UNDEF;
}else{


--this.pending;
this.children[idx]=UNDEF;
this.pendingRV=mergeExceptions(val,this.pendingRV);

if(this.collapsing){


if(this.pending==1){

var cf=this.collapsing.cf;
this.collapsing=UNDEF;
cont(cf,1);
}
return;
}else{




if(!this.inner_aborted){
if(this.pendingRV===undefined)this.pendingRV=val;

this.quench();
return this.returnToParent(this.abortInner());
}
if(this.pending==0)return this.returnToParent(this.pendingRV);

}
}
this.async=true;
exports.current_dyn_vars=root_dyn_vars;
return this;
}
};

EF_Alt.prototype.quench=function(except){if(this.collapsing){








this.children[this.collapsing.branch].quench();
}else{


for(var i=0;i<this.children.length;++i){
if(i!==except&&this.children[i])this.children[i].quench();

}
}
};

EF_Alt.prototype.abort=function(pseudo_abort){if(this.aborted){





exports.current_dyn_vars=root_dyn_vars;
return this;
}

this.pseudo_abort=pseudo_abort;
this.aborted=true;
var rv;
if(!this.inner_aborted){
rv=this.abortInner();
}else if(this.pending){

exports.current_dyn_vars=root_dyn_vars;
rv=this;
}

this.pendingRV=this.pendingRV;
if(rv!==this&&!(rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))rv=this.pendingRV;
return rv;
};

EF_Alt.prototype.abortInner=function(){this.inner_aborted=true;




if(this.collapsing){

var branch=this.collapsing.branch;
this.collapsing=UNDEF;
var val=this.children[branch].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF))this.setChildFrame(val,branch);else{


--this.pending;
this.children[branch]=UNDEF;
}
}else{


for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF))this.setChildFrame(val,i);else{


this.pendingRV=mergeExceptions(val,this.pendingRV);
--this.pending;
this.children[i]=UNDEF;
}
}
}
if(!this.pending)return this.pendingRV;


exports.current_dyn_vars=root_dyn_vars;

this.async=true;
return this;
};


EF_Alt.prototype.setChildFrame=setChildFramePar;

EF_Alt.prototype.docollapse=function(branch,cf){this.collapsed=true;

var have_async_branch_retract=false;

this.quench(branch);
for(var i=0;i<this.children.length;++i){
if(i==branch)continue;
if(this.children[i]){
var val=this.children[i].abort();
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
have_async_branch_retract=true;
this.setChildFrame(val,i);
}else{

--this.pending;
this.children[i]=UNDEF;
}
}
}
if(!have_async_branch_retract){

return true;
}



this.collapsing={branch:branch,cf:cf};
return false;
};

function I_alt(ndata,fenv){return cont(new EF_Alt(ndata,fenv),-1);

}


exports.Alt=function(...args){return {exec:I_alt,ndata:args,__oni_dis:token_dis};





};











function EF_WfW(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
this.pending=0;
this.children=new Array(2);
}
setEFProto(EF_WfW.prototype={});

EF_WfW.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){



this.setChildFrame(val,idx);
}else{

if(idx===-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<2;++i){
val=execIN(this.ndata[i],this.fenv);
if(this.inner_aborted){
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){



++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingCFE=mergeExceptions(val,this.pendingCFE);
return this.pendingCFE;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

++this.pending;
this.setChildFrame(val,i);
if(i===0){
exports.current_dyn_vars=parent_dyn_vars;
}
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)||i===1){



this.pendingCFE=val;
this.quench();
return this.abortInner();
}
}
this.ndata=UNDEF;
}else{



--this.pending;

if(this.children[idx]){

this.children[idx].parent=UNDEF;
this.children[idx]=UNDEF;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&!this.inner_aborted){

this.pendingCFE=val;
this.quench();
return this.returnToParent(this.abortInner());
}
}

if(this.pending===1){
if(this.pendingCFE===undefined&&this.children[1]){

exports.current_dyn_vars=root_dyn_vars;
return this.returnToParent(this.children[1]);
}else if(this.children[0]){


this.quench();
return this.returnToParent(this.abortInner());
}
}
if(this.pending===0){

return this.returnToParent(mergeExceptions(val,this.pendingCFE));
}
this.async=true;
return this;
}
};

EF_WfW.prototype.quench=function(){if(this.children[1])this.children[1].quench()};

EF_WfW.prototype.abort=function(pseudo_abort){if(this.aborted){









exports.current_dyn_vars=root_dyn_vars;
return this;

}else this.pseudo_abort=pseudo_abort;


this.pendingCFE=this.pendingCFE;
this.aborted=true;
return this.abortInner();
};

EF_WfW.prototype.abortInner=function(){this.inner_aborted=true;





if(this.children[1]){
var val=this.children[1].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.async=true;
return this;
}else{

this.pendingCFE=mergeExceptions(val,this.pendingCFE);



--this.pending;
this.children[1]=UNDEF;
}
}
if(this.children[0]){
this.children[0].quench();
var val=this.children[0].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.async=true;

return this;
}else{

this.pendingCFE=mergeExceptions(val,this.pendingCFE);



--this.pending;
this.children[0]=UNDEF;
}
}

return this.pendingCFE;
};

EF_WfW.prototype.setChildFrame=setChildFramePar;

function I_wfw(ndata,fenv){return cont(new EF_WfW(ndata,fenv),-1);

}
exports.WfW=function(...args){return {exec:I_wfw,ndata:args,__oni_dis:token_dis};



};





















function EF_Suspend(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
}
setEFProto(EF_Suspend.prototype={});

EF_Suspend.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,idx);
}else{

switch(idx){case 0:

try{
var ef=this;
this.dyn_vars=exports.current_dyn_vars;

var resumefunc=function(...args){if(ef.returning){


return;
}
try{
var caller_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=ef.dyn_vars;
cont(ef,2,args);
}catch(e){

hold0(function(){throw e});
}finally{

ef.dyn_vars=undefined;
exports.current_dyn_vars=caller_dyn_vars;
}
};






val=this.ndata[0](this.fenv,resumefunc);
}catch(e){


val=new CFException("t",e);
}



if(this.returning){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){


this.setChildFrame(val,0);
this.quench();
val=val.abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,3);

this.async=true;
return this;
}

}
return cont(this,3,val);
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){
this.setChildFrame(val,1);
return this;
}
case 1:

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
this.returning=true;
break;
}
this.suspendCompleted=true;

this.async=true;

exports.current_dyn_vars=root_dyn_vars;
return this;
case 2:



if(this.returning){

return;
}
this.returning=true;
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){


val=new CFException("i","Suspend: Resume function threw ("+val.toString()+")");
break;
}
this.retvals=val;
if(!this.suspendCompleted){

if(!this.child_frame){



this.returning=true;
return;
}else{

this.quench();
val=this.child_frame.abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===ONI_EF)){

this.setChildFrame(val,3);
return this;
}


}
}
case 3:

try{
this.ndata[1].apply(this.fenv,this.retvals);
if(!(val!==null&&typeof (val)==='object'&&val.__oni_cfx))val=UNDEF;
}catch(e){

val=new CFException("i","Suspend: Return function threw ("+e+")");
}
break;
case 4:


break;
default:
val=new CFException("i","Invalid state in Suspend ("+idx+")");
}
return this.returnToParent(val);
}
};

EF_Suspend.prototype.quench=function(){this.returning=true;

if(!this.suspendCompleted)this.child_frame.quench();

};

EF_Suspend.prototype.abort=function(pseudo_abort){exports.current_dyn_vars=this.dyn_vars;


this.returning=true;
this.aborted=true;
this.pseudo_abort=pseudo_abort;
if(!this.suspendCompleted){
var abort_val=this.child_frame.abort(pseudo_abort);
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===ONI_EF)){
this.setChildFrame(abort_val,4);
return this;
}else{

return abort_val;
}
}
return UNDEF;
};

function I_sus(ndata,fenv){return cont(new EF_Suspend(ndata,fenv),0);

}


exports.Suspend=function(...args){return {exec:I_sus,ndata:args,__oni_dis:token_dis};





};










function EF_Collapse(ndata,fenv){this.ndata=ndata;

this.fenv=fenv;
}
setEFProto(EF_Collapse.prototype={});


EF_Collapse.prototype.__oni_collapse=true;

EF_Collapse.prototype.cont=function(idx,val){if(idx==0){


var fold=this.fenv.fold;
if(!fold)return new CFException("t",new Error("Unexpected collapse statement"),this.ndata,this.fenv.file);


this.restore_dynvars=exports.current_dyn_vars;
if(fold.docollapse(this.fenv.branch,this)){
exports.current_dyn_vars=this.restore_dynvars;
return true;
}

this.async=true;

return this;
}else if(idx==1){

exports.current_dyn_vars=this.restore_dynvars;
return this.returnToParent(true);
}else return this.returnToParent(new CFException("t","Internal error in SJS runtime (collapse)",this.ndata,this.fenv.file));



};


EF_Collapse.prototype.quench=dummy;
EF_Collapse.prototype.abort=function(){this.aborted=true;

exports.current_dyn_vars=this.restore_dynvars;
return UNDEF;
};

function I_collapse(ndata,fenv){return cont(new EF_Collapse(ndata,fenv),0);

}


exports.Collapse=function(line){return {exec:I_collapse,ndata:line,__oni_dis:token_dis};





};






var hold0,clear0;



if(exports.G.setImmediate){
hold0=exports.G.setImmediate;
clear0=exports.G.clearImmediate;
}else if(exports.G.postMessage&&!exports.G.importScripts){








var postMessageIsAsync=true;
var oldOnMessage=exports.G.onmessage;
exports.G.onmessage=function(){postMessageIsAsync=false;

};
exports.G.postMessage("","*");
exports.G.onmessage=oldOnMessage;
if(postMessageIsAsync){


var MESSAGE_PREFIX="com.onilabs.hold0"+Math.random();

var tasks={};

function onGlobalMessage(event){if(event.source===exports.G&&typeof event.data==='string'&&event.data.indexOf(MESSAGE_PREFIX)===0){



var id=event.data.substring(MESSAGE_PREFIX.length);
var f;
if((f=tasks[id])){
delete tasks[id];
f();
}
}
}

if(exports.G.addEventListener){
exports.G.addEventListener("message",onGlobalMessage,false);
}else{

exports.G.attachEvent("onmessage",onGlobalMessage);
}

var id_counter=1;

var hold0=function(f){var id=id_counter++ ;

tasks[id]=f;
exports.G.postMessage(MESSAGE_PREFIX+id,"*");
return id;
};

var clear0=function(id){delete tasks[id];

};
}
}

if(!hold0){
hold0=function(co){return setTimeout(co,0)};
clear0=clearTimeout;
}

exports.Hold=function(duration_ms){var dyn_vars=exports.current_dyn_vars;


exports.current_dyn_vars=root_dyn_vars;

function abort(){exports.current_dyn_vars=dyn_vars;



return UNDEF;
}

if(duration_ms===UNDEF)return {__oni_ef:ONI_EF,wait:function(){


exports.current_dyn_vars=root_dyn_vars;

return this;
},quench:dummy,abort:abort};




if(duration_ms===0){
var sus={__oni_ef:ONI_EF,wait:function(){

exports.current_dyn_vars=root_dyn_vars;

return this;
},abort:abort,quench:function(){

sus=null;clear0(this.co)},co:hold0(function(){
if(sus&&sus.parent){


exports.current_dyn_vars=dyn_vars;
cont(sus.parent,sus.parent_idx,UNDEF);



exports.current_dyn_vars=root_dyn_vars;
}
})};

return sus;
}else{

var sus={__oni_ef:ONI_EF,wait:function(){

exports.current_dyn_vars=root_dyn_vars;

return this;
},abort:abort,quench:function(){

sus=null;clearTimeout(this.co)}};

sus.co=setTimeout(function(){
if(sus&&sus.parent){


exports.current_dyn_vars=dyn_vars;

cont(sus.parent,sus.parent_idx,UNDEF);








exports.current_dyn_vars=root_dyn_vars;
}
},duration_ms);


return sus;
}
};

exports.Throw=function(exp,line,file){return new CFException("t",exp,line,file)};

exports.Arr=function(...args){return args};

exports.ArrS=function(spreads,...args){var rv=[];

for(var i=0;i<args.length;++i){
if(spreads[0]===i){
if(!Array.isArray(args[i]))throw new Error("Cannot spread non-array.");
rv=rv.concat(args[i]);
spreads.shift();
}else rv.push(args[i]);


}
return rv;
};

exports.Obj=function(...args){var obj=new Object();



for(var i=0;i<args[0].length;++i)obj[args[0][i]]=args[i+1];

return obj;
};

function QuasiProto(parts){this.parts=parts}
exports.QuasiProto=QuasiProto;

exports.Quasi=function(...args){return new QuasiProto(args);

};

exports.Return=function(exp){return new CFException("r",exp);

};

exports.Break=function(lbl){return new CFException("b",lbl);

};

exports.Cont=function(lbl){return new CFException("c",lbl);

};

exports.With=function(exp,bodyf){return bodyf(this,exp);

};

exports.join_str=function(...args){var rv='';

for(var i=0,l=args.length;i<l;++i)rv+=args[i];

return rv;
};

exports.infix={'+':function(a,b){
return a+b},'-':function(a,b){
return a-b},'*':function(a,b){
return a*b},'/':function(a,b){
return a/b},'%':function(a,b){
return a%b},'<<':function(a,b){
return a<<b},'>>':function(a,b){
return a>>b},'>>>':function(a,b){
return a>>>b},'<':function(a,b){
return a<b},'>':function(a,b){
return a>b},'<=':function(a,b){
return a<=b},'>=':function(a,b){
return a>=b},'==':function(a,b){
return a==b},'!=':function(a,b){
return a!=b},'===':function(a,b){
return a===b},'!==':function(a,b){
return a!==b},'&':function(a,b){
return a&b},'^':function(a,b){
return a^b},'|':function(a,b){
return a|b},',':function(a,b){
return a,b},'instanceof':function(a,b){

return a instanceof b},'in':function(a,b){
return a in b}};







exports.destructRestProperty=function(obj,idx){if(!Array.isArray(obj))throw new Error("Cannot obtain rest property for non-array in destructuring pattern");



return obj.slice(idx);
};

var UA="nodejs";
exports.hostenv="nodejs";
exports.UA=UA;


exports.modules={};exports.modsrc={};})(__oni_rt);(function(exports){function push_decl_scope(pctx,bl){


























































































































































































































































































































































pctx.decl_scopes.push({vars:[],funs:"",fscoped_ctx:0,bl:bl,is_strict:false,continue_scope:0,break_scope:0});



if(bl){
var prev=pctx.decl_scopes[pctx.decl_scopes.length-2];
prev.notail=true;
}
}

function collect_decls(decls){var rv="";

if(decls.is_strict)rv+="'use strict';";

if(decls.vars.length)rv+="var "+decls.vars.join(",")+";";

rv+=decls.funs;
return rv;
}

function ensure_unique_name(candidate,names){if(names.has(candidate))throw "Non-unique name '"+candidate+"'";


names.add(candidate);
}

function top_decl_scope(pctx){return pctx.decl_scopes[pctx.decl_scopes.length-1];

}

function push_stmt_scope(pctx){pctx.stmt_scopes.push({seq:[]});

}
function pop_stmt_scope(pctx,pre,post){var seq=pctx.stmt_scopes.pop().seq;

var rv="";
if(seq.length){
if(pctx.js_ctx==0){
if(pre)rv+=pre;

for(var i=0;i<seq.length;++i){
var v=seq[i].v();

if(v.length){
if(i||pre)rv+=",";
rv+=v;
}
}
if(post)rv+=post;

}else{


for(var i=0;i<seq.length;++i)rv+=seq[i].nb();

}
}
return rv;
}

function top_stmt_scope(pctx){return pctx.stmt_scopes[pctx.stmt_scopes.length-1];

}










var COMPILED_SRC_TAG_REGEX=/^\/\*\__oni_compiled_sjs_1\*\//;

function begin_script(pctx){if(COMPILED_SRC_TAG_REGEX.exec(pctx.src))throw new Error("This SJS code is already compiled - in general re-compilation will yield invalid code");



switch(pctx.mode){case "debug":

pctx.allow_nblock=false;
pctx.full_nblock=false;
break;
case "optimize":
pctx.allow_nblock=true;
pctx.full_nblock=true;
break;
case "normal":
default:
pctx.allow_nblock=true;
pctx.full_nblock=false;
}

if(typeof pctx.scopes!=='undefined')throw new Error("Internal parser error: Nested script");


pctx.decl_scopes=[];



pctx.stmt_scopes=[];

pctx.js_ctx=0;

push_decl_scope(pctx);
push_stmt_scope(pctx);
}



function add_stmt(stmt,pctx){if(stmt==ph_empty_stmt)return;

if(stmt.is_compound_stmt){

for(var i=0;i<stmt.stmts.length;++i)add_stmt(stmt.stmts[i],pctx);

return;
}else if(stmt.is_var_decl){

stmt.collect_var_decls(top_decl_scope(pctx).vars);
if(stmt.is_empty)return;


}else if(stmt.is_fun_decl){

top_decl_scope(pctx).funs+=stmt.fun_decl();
return;
}


var seq=top_stmt_scope(pctx).seq;






if(stmt.exp&&typeof (stmt.exp.value)==='string'&&(stmt.exp.value==='"use strict"'||stmt.exp.value==="'use strict'")&&seq.length===0&&top_decl_scope(pctx).funs===''&&top_decl_scope(pctx).vars.length===0){




top_decl_scope(pctx).is_strict=true;
}else if(stmt.is_nblock&&pctx.js_ctx==0){


var last=seq.length?seq[seq.length-1]:null;
if(!last||!last.is_nblock_seq){
last=new ph_nblock_seq(pctx);
seq.push(last);
}
last.pushStmt(stmt);
}else seq.push(stmt);


}


function end_script(pctx){var decls=pctx.decl_scopes.pop();

var rv=collect_decls(decls)+pop_stmt_scope(pctx,(pctx.globalReturn?"return ":"")+"__oni_rt.exseq(this ? this.arguments : undefined,this,"+pctx.filename+",["+(16|8),"])");




return rv;
}







function pop_block(pctx){switch(top_stmt_scope(pctx).seq.length){case 1:


var stmt=pctx.stmt_scopes.pop().seq[0];

stmt.is_var_decl=false;
return stmt;
case 0:
pctx.stmt_scopes.pop();
return ph_empty_stmt;
default:
return new ph_block(pop_stmt_scope(pctx));
}
}









function nblock_val_to_val(v,r,l){var rv="__oni_rt.Nb(function(){";

if(r)rv+="return ";
return rv+v+"},"+(l||0)+")";
}

function ph(){}

ph.prototype={is_nblock:false,v:function(accept_list){


if(this.is_nblock&&this.nblock_val)return nblock_val_to_val(this.nblock_val(),this.is_value,this.line);else return this.val(accept_list);




},nb:function(){

if(this.nblock_val)return this.nblock_val();else throw new Error("Illegal statement in __js block");






}};





function ph_block(seq){this.seq=seq;

}
ph_block.prototype=new ph();
ph_block.prototype.nblock_val=function(){return this.seq;

};
ph_block.prototype.val=function(accept_list){return this.seq.length?(accept_list?this.seq:"__oni_rt.Seq("+0+","+this.seq+")"):"0";




};




function ph_switch(exp,clauses){this.exp=exp;

this.clauses=clauses;
}
ph_switch.prototype=new ph();
ph_switch.prototype.nblock_val=function(){var rv="switch("+this.exp.nb()+"){";


for(var i=0,l=this.clauses.length;i<l;++i){
var clause=this.clauses[i];
rv+=(clause[0]?"case "+clause[0].nb()+":":"default:")+clause[1].nb();
}
return rv+"}";
};
ph_switch.prototype.val=function(){var clauses="[";


for(var i=0,l=this.clauses.length;i<l;++i){
var clause=this.clauses[i];
if(i)clauses+=",";
clauses+="["+(clause[0]?clause[0].v():"__oni_rt.Default")+","+clause[1].v()+"]";
}
clauses+="]";
return "__oni_rt.Switch("+this.exp.v()+","+clauses+")";
};







function ph_fun_exp(fname,pars,body,pctx){this.is_nblock=pctx.allow_nblock;

















this.code="function "+fname+gen_function_header(pars,pctx)+body+"}";
}
ph_fun_exp.prototype=new ph();

ph_fun_exp.prototype.v=function(){return this.code;

};
ph_fun_exp.prototype.nblock_val=function(){return this.code};

function gen_fun_decl(fname,pars,body,pctx){if(top_decl_scope(pctx).fscoped_ctx){



return gen_var_decl([[new ph_identifier(fname,pctx),new ph_fun_exp("",pars,body,pctx)]],pctx);
}else return new ph_fun_decl(fname,pars,body,pctx);


}

function ph_fun_decl(fname,pars,body,pctx){this.code="function "+fname+gen_function_header(pars,pctx)+body+"}";

}
ph_fun_decl.prototype=new ph();
ph_fun_decl.prototype.is_fun_decl=true;

ph_fun_decl.prototype.fun_decl=function(){return this.code};






function ph_nblock_seq(){this.stmts=[];

}
ph_nblock_seq.prototype=new ph();
ph_nblock_seq.prototype.is_nblock=true;
ph_nblock_seq.prototype.is_nblock_seq=true;
ph_nblock_seq.prototype.pushStmt=function(stmt){this.stmts.push(stmt);

if(typeof this.line==='undefined')this.line=this.stmts[0].line;
};














ph_nblock_seq.prototype.nblock_val=function(){var rv="";

for(var i=0;i<this.stmts.length-1;++i){
rv+=this.stmts[i].nb();
}
if(this.stmts[i].is_value)rv+="return ";

rv+=this.stmts[i].nb();
return rv;
};


function ph_compound_stmt(pctx){this.stmts=[];

this.pctx=pctx;
}
ph_compound_stmt.prototype=new ph();
ph_compound_stmt.prototype.is_compound_stmt=true;
ph_compound_stmt.prototype.toBlock=function(){push_stmt_scope(this.pctx);

add_stmt(this,this.pctx);
return pop_block(this.pctx);
};

function ph_exp_stmt(exp,pctx){this.exp=exp;

this.line=this.exp.line;
this.is_nblock=exp.is_nblock;
}
ph_exp_stmt.prototype=new ph();
ph_exp_stmt.prototype.is_value=true;
ph_exp_stmt.prototype.nblock_val=function(){return this.exp.nb()+";"};
ph_exp_stmt.prototype.v=function(accept_list){return this.exp.v(accept_list)};


function gen_var_compound(decls,pctx){var rv=new ph_compound_stmt(pctx);

for(var i=0;i<decls.length;++i)rv.stmts.push(new ph_var_decl(decls[i],pctx));

return rv;
}

function gen_var_decl(decls,pctx){return gen_var_compound(decls,pctx).toBlock();

}

function ph_var_decl(d,pctx){this.d=d;

if(!this.d[0].is_id)this.is_dest=true;

this.is_empty=(d.length==1);
this.pctx=pctx;
this.line=pctx.line;
if(!this.is_empty)this.is_nblock=pctx.allow_nblock&&d[1].is_nblock&&!this.is_dest;


}
ph_var_decl.prototype=new ph();
ph_var_decl.prototype.is_var_decl=true;
ph_var_decl.prototype.collect_var_decls=function(vars){try{

this.d[0].collect_var_decls(vars);
}catch(e){

throw new Error("Invalid syntax in variable declaration");
}
};
ph_var_decl.prototype.nblock_val=function(){if(this.is_dest){


return '('+this.d[0].nb()+'='+this.d[1].nb()+');';
}
return this.d[0].name+"="+this.d[1].nb()+";";
};
ph_var_decl.prototype.val=function(){if(this.is_dest){



return (new ph_assign_op(this.d[0],'=',this.d[1],this.pctx)).val();
}else return "__oni_rt.Sc("+this.line+",function(_oniX){return "+this.d[0].name+"=_oniX;},"+this.d[1].v()+")";




};

function ph_if(t,c,a,pctx){this.t=t;

this.c=c;
this.a=a;
this.line=t.line;
this.file=pctx.filename;

this.is_nblock=pctx.full_nblock&&t.is_nblock&&c.is_nblock&&(!a||a.is_nblock);

}
ph_if.prototype=new ph();
ph_if.prototype.nblock_val=function(){var rv="if("+this.t.nb()+"){"+this.c.nb()+"}";

if(this.a)rv+="else{"+this.a.nb()+"}";

return rv;
};

ph_if.prototype.val=function(){var rv;

var c=this.c.v();
if(this.t.is_nblock){

rv="__oni_rt.Nb(function(){if("+this.t.nb()+")return __oni_rt.ex("+c+",this);";

if(this.a)rv+="else return __oni_rt.ex("+this.a.v()+",this);";

return rv+"},"+this.line+")";
}else{


rv="__oni_rt.If("+this.t.v()+","+c;
if(this.a)rv+=","+this.a.v();

return rv+")";
}
};





function ph_try(block,crf,pctx){this.block=block;

this.crf=crf;
this.file=pctx.filename;
}
ph_try.prototype=new ph();
ph_try.prototype.nblock_val=function(){var rv="try{"+this.block.nb()+"}";


if(this.crf[0]){
rv+="catch("+this.crf[0][0]+"){"+this.crf[0][1].nb()+"}";
}
if(this.crf[1])throw new Error("retract statement not allowed in __js block");
if(this.crf[2]){
if(this.crf[2][0]!==null)throw new Error("augmented finally clause not allowed in __js block");
rv+="finally{"+this.crf[2][1].nb()+"}";
}
return rv;
};
ph_try.prototype.val=function(){var tb=this.block.v();

var rv="__oni_rt.Try("+((this.crf[2]&&this.crf[2][0]!==null)?1:0);
rv+=","+tb;
if(this.crf[0]){
var cb=this.crf[0][1].v();
rv+=",function(__oni_env,"+this.crf[0][0]+"){";
if(cb.length)rv+="return __oni_rt.ex("+cb+",__oni_env)";

rv+="}";
}else rv+=",0";



if(this.crf[2]){
var fb=this.crf[2][1].v();
if(this.crf[2][0]===null){
rv+=","+fb;
}else{


rv+=",function(__oni_env,"+this.crf[2][0]+"){";
if(fb.length)rv+="return __oni_rt.ex("+fb+",__oni_env)";

rv+="}";
}
}else rv+=",0";



if(this.crf[1]){
var rb=this.crf[1].v();
rv+=","+rb;
}
return rv+")";
};

var ph_empty_stmt=new ph();
ph_empty_stmt.is_nblock=true;
ph_empty_stmt.nblock_val=function(){return ';'};
ph_empty_stmt.v=function(){return '0'};

function ph_throw(exp,pctx){this.exp=exp;

this.line=exp.line;
this.file=pctx.filename;
this.is_nblock=pctx.full_nblock&&exp.is_nblock;
}
ph_throw.prototype=new ph();
ph_throw.prototype.nblock_val=function(){return "throw "+this.exp.nb()+";";

};
ph_throw.prototype.val=function(){return "__oni_rt.Sc("+this.line+",__oni_rt.Throw,"+this.exp.v()+","+this.line+","+this.file+")";



};




function ph_return(exp,pctx){this.line=pctx.line-pctx.newline;


this.exp=exp;

this.js_ctx=pctx.js_ctx;
this.is_nblock=pctx.allow_nblock&&(exp?exp.is_nblock:true);
}
ph_return.prototype=new ph();
ph_return.prototype.nblock_val=function(){var rv;

if(this.js_ctx){

rv="return";
if(this.exp)rv+=" "+this.exp.nb();
rv+=";";
}else{


rv="return __oni_rt.Return(";
if(this.exp)rv+=this.exp.nb();
rv+=");";
}
return rv;
};
ph_return.prototype.val=function(){var v=this.exp?","+this.exp.v():"";

return "__oni_rt.Sc("+this.line+",__oni_rt.Return"+v+")";
};


function ph_pblr(exp,pctx){this.line=pctx.line-pctx.newline;


this.exp=exp;

this.js_ctx=pctx.js_ctx;
this.is_nblock=pctx.allow_nblock&&(exp?exp.is_nblock:true);
}
ph_pblr.prototype=new ph();
ph_pblr.prototype.nblock_val=function(){var rv;

if(this.js_ctx){
throw new Error("Blocklambdas cannot contain 'return' statements in __js{...} contexts");
}else{


rv="return __oni_rt.Return(";
if(this.exp)rv+=this.exp.nb();
rv+=");";
}
return rv;
};
ph_pblr.prototype.val=function(){var v=this.exp?","+this.exp.v():"";

return "__oni_rt.Sc("+this.line+",__oni_rt.Return"+v+")";
};



function ph_collapse(pctx){this.line=pctx.line;

}
ph_collapse.prototype=new ph();
ph_collapse.prototype.val=function(){return "__oni_rt.Collapse("+this.line+")";

};





function ph_pblb(pctx,lbl){this.lbl=lbl;

this.is_nblock=true;

this.js_ctx=pctx.js_ctx;
}
ph_pblb.prototype=new ph();
ph_pblb.prototype.nblock_val=function(){var rv;

if(this.js_ctx){
throw new Error("Blocklambdas cannot contain 'break' statements in __js{...} contexts");
}else{


rv="return __oni_rt.Break(";
if(this.lbl)rv+="'"+this.lbl+"'";
rv+=");";
}
return rv;
};


function ph_cfe(f,pctx,lbl){this.f=f;

this.lbl=lbl;
this.is_nblock=true;

this.js_ctx=pctx.js_ctx;
}
ph_cfe.prototype=new ph();
ph_cfe.prototype.nblock_val=function(){var rv;

if(this.js_ctx){


rv=(this.f=="b"?"break":"continue");
if(this.lbl)rv+=" "+this.lbl;
rv+=";";
}else{


rv="return __oni_rt."+(this.f=="b"?"Break":"Cont")+"(";
if(this.lbl)rv+="'"+this.lbl+"'";
rv+=");";
}
return rv;
};



function gen_for(init_exp,decls,test_exp,inc_exp,body,pctx){var rv;

if(init_exp||decls){
if(decls)rv=gen_var_compound(decls,pctx);else rv=new ph_compound_stmt(pctx);



if(init_exp)rv.stmts.push(new ph_exp_stmt(init_exp,pctx));

rv.stmts.push(new ph_loop(0,test_exp,body,inc_exp));

rv=rv.toBlock();
}else rv=new ph_loop(0,test_exp,body,inc_exp);


return rv;
}




function ph_loop(init_state,test_exp,body,inc_exp){this.init_state=init_state;

this.test_exp=test_exp;
this.inc_exp=inc_exp;
this.body=body;
}
ph_loop.prototype=new ph();
ph_loop.prototype.nblock_val=function(){if(this.init_state==2){



return "do{"+this.body.nb()+"}while("+this.test_exp.nb()+");";
}else if(this.test_exp&&this.inc_exp){

return "for(;"+this.test_exp.nb()+";"+this.inc_exp.nb()+"){"+this.body.nb()+"}";

}else if(this.test_exp){


return "while("+this.test_exp.nb()+"){"+this.body.nb()+"}";
}else return "while(1){"+this.body.nb()+"}";

};
ph_loop.prototype.val=function(){var test=this.test_exp?this.test_exp.v():"1";


var body=this.body.v(true);
return "__oni_rt.Loop("+this.init_state+","+test+","+(this.inc_exp?this.inc_exp.v():"0")+","+body+")";

};



function gen_for_in(lhs_exp,decl,obj_exp,body,pctx){var rv;

if(decl){
rv=gen_var_compound([decl],pctx);
rv.stmts.push(new ph_for_in(decl[0],obj_exp,body,pctx));


rv=rv.toBlock();
}else rv=new ph_for_in(lhs_exp,obj_exp,body,pctx);


return rv;
}

function ph_for_in(lhs,obj,body,pctx){this.lhs=lhs;

this.obj=obj;
this.body=body;
this.pctx=pctx;
}
ph_for_in.prototype=new ph();
ph_for_in.prototype.nblock_val=function(){return "for("+this.lhs.nb()+" in "+this.obj.nb()+"){"+this.body.nb()+"}";


};
ph_for_in.prototype.val=function(){var rv="__oni_rt.ForIn("+this.obj.v();

rv+=",function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq("+0+",";

rv+=(new ph_assign_op(this.lhs,"=",new ph_identifier("_oniY",this.pctx),this.pctx)).v();


if(this.body)rv+=","+this.body.v();

return rv+"), __oni_env)})";
};


function gen_for_of(lhs_exp,decl,obj_exp,body,pctx){var rv;

if(decl){
rv=gen_var_compound([decl],pctx);
rv.stmts.push(new ph_for_of(decl[0],obj_exp,body,pctx));

rv=rv.toBlock();
}else rv=new ph_for_of(lhs_exp,obj_exp,body,pctx);


return rv;
}

function ph_for_of(lhs,obj,body,pctx){this.lhs=lhs;

this.obj=obj;
this.body=body;
this.pctx=pctx;
}
ph_for_of.prototype=new ph();
ph_for_of.prototype.nblock_val=function(){return "for("+this.lhs.nb()+" of "+this.obj.nb()+"){"+this.body.nb()+"}";


};
ph_for_of.prototype.val=function(){throw new Error("for-of loops are currently only supported in __js blocks");

};


function ph_with(exp,body,pctx){this.exp=exp;

this.body=body;
this.line=this.exp.line;
this.file=pctx.filename;
this.is_nblock=pctx.allow_nblock&&exp.is_nblock&&body.is_nblock;
}
ph_with.prototype=new ph();
ph_with.prototype.nblock_val=function(){return "with("+this.exp.nb()+")"+this.body.nb()};
ph_with.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.With,"+this.exp.v()+",function(__oni_env,__oni_z){with(__oni_z) return __oni_rt.ex("+this.body.v()+",__oni_env)})";





return rv;
};





function ph_literal(value,pctx,type){this.value=value;

this.line=pctx.line;
}
ph_literal.prototype=new ph();
ph_literal.prototype.is_nblock=true;

ph_literal.prototype.v=function(){return this.value};
ph_literal.prototype.nblock_val=function(){return this.value};
ph_literal.prototype.destruct=function(){if(this.value!="")throw new Error("invalid pattern");return ""};
ph_literal.prototype.collect_par_decls=function(pars,names){if(this.value!=="")throw "Invalid in destructuring pattern: '"+this.value+"'";


pars.push('');
};
ph_literal.prototype.collect_var_decls=function(){};

function ph_infix_op(left,id,right,pctx){this.left=left;


this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock;
}
ph_infix_op.prototype=new ph();
ph_infix_op.prototype.is_value=true;

ph_infix_op.prototype.collect_pars=function(pars){if(this.id!=',')throw new Error("invalid parameter list syntax");

pars.push(this.left);
if(this.right.collect_pars)this.right.collect_pars(pars);else pars.push(this.right);



};

ph_infix_op.prototype.nblock_val=function(){return this.left.nb()+" "+this.id+" "+this.right.nb();

};
ph_infix_op.prototype.val=function(){if(this.is_nblock){



return nblock_val_to_val(this.nb(),true,this.line);
}else if(this.id=="||"){


return "__oni_rt.Seq("+2+","+this.left.v()+","+this.right.v()+")";
}else if(this.id=="&&"){


return "__oni_rt.Seq("+4+","+this.left.v()+","+this.right.v()+")";
}else return "__oni_rt.Sc("+this.line+",__oni_rt.infix['"+this.id+"'],"+this.left.v()+","+this.right.v()+")";


};


function ph_interpolating_str(parts,pctx){this.is_nblock=pctx.allow_nblock;

this.line=pctx.line;
this.parts=parts;
for(var i=0,l=parts.length;i<l;++i){
if(Array.isArray(parts[i])&&!parts[i][0].is_nblock){
this.is_nblock=false;
break;
}
}
}
ph_interpolating_str.prototype=new ph();
ph_interpolating_str.prototype.is_value=true;
ph_interpolating_str.prototype.nblock_val=function(){for(var i=0,l=this.parts.length;i<l;++i){

var p=this.parts[i];
if(Array.isArray(p)){
this.parts[i]="("+p[0].nb()+")";
}else{

this.parts[i]='"'+p+'"';
}
}
return '('+this.parts.join('+')+')';
};
ph_interpolating_str.prototype.val=function(){if(this.is_nblock)return nblock_val_to_val(this.nb(),true,this.line);

for(var i=0,l=this.parts.length;i<l;++i){
var p=this.parts[i];
if(Array.isArray(p)){
this.parts[i]=p[0].v();
}else{

this.parts[i]='"'+p+'"';
}
}
return '__oni_rt.Sc('+this.line+',__oni_rt.join_str,'+this.parts.join(',')+')';
};


function ph_quasi_template(parts,pctx){this.parts=parts;

this.line=pctx.line;
this.is_nblock=false;
}
ph_quasi_template.prototype=new ph();
ph_quasi_template.prototype.is_value=true;
ph_quasi_template.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Quasi";

for(var i=0;i<this.parts.length;++i){
if(i%2)rv+=","+this.parts[i].v();else rv+=',"'+this.parts[i].replace(/\"/g,'\\"')+'"';



}
return rv+")";
};
ph_quasi_template.prototype.nblock_val=function(){var rv="__oni_rt.Quasi(";

for(var i=0;i<this.parts.length;++i){
if(i>0)rv+=",";
if(i%2)rv+=this.parts[i].nb();else rv+='"'+this.parts[i].replace(/\"/g,'\\"')+'"';



}
return rv+")";
};

function ph_assign_op(left,id,right,pctx){if(!left.is_ref&&!left.is_id){


this.is_dest=true;
if(id!="=")throw new Error("Invalid operator in destructuring assignment");
}
this.left=left;
this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock&&!this.is_dest;

}
ph_assign_op.prototype=new ph();
ph_assign_op.prototype.is_value=true;
ph_assign_op.prototype.nblock_val=function(){var right=this.right.nb();

if(this.left.name==='__oni_altns')right='Object.create('+right+')';
return this.left.nb()+this.id+right;
};
ph_assign_op.prototype.val=function(){var rv;

if(this.is_nblock){
rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.is_dest){

rv="__oni_rt.Sc("+this.line+",function(_oniX";
try{
var drefs=[],body=this.left.destruct("_oniX",drefs);
for(var i=1;i<=drefs.length;++i)rv+=",_oniX"+i;

rv+="){"+body+"return _oniX;},"+this.right.v();
for(var i=0;i<drefs.length;++i)rv+=","+drefs[i];

rv+=")";
}catch(e){

throw {mes:"Invalid left side in destructuring assignment ("+e+")",line:this.line};

}
}else if(!this.left.is_ref||this.left.is_nblock){



var arg='_oniX';
if(this.left.name==='__oni_altns')arg='Object.create('+arg+')';
rv="__oni_rt.Sc("+this.line+",function(_oniX){return "+this.left.nb()+this.id+arg+";},"+this.right.v()+")";


}else{


rv="__oni_rt.Sc("+this.line+",(l,r)=>l[0][l[1]]"+this.id+"r,"+this.left.ref()+","+this.right.v()+")";
}
return rv;
};

function gen_spread(right){right.spread=true;

return right;
}

function ph_rest(right){this.right=right;

this.is_rest=true;
}
ph_rest.prototype=new ph();
ph_rest.prototype.val=function(){throw new Error("Unexpected '...'")};
ph_rest.prototype.collect_var_decls=function(vars){return this.right.collect_var_decls(vars);

};
ph_rest.prototype.collect_par_decls=function(pars,names){var sub=[];

this.right.collect_par_decls(sub,names);
pars.push("..."+sub[0]);
};

ph_rest.prototype.destruct=function(dpath,drefs){throw new Error("Invalid location of rest property (should be caught in c1.js.in - not here)");

};
ph_rest.prototype.destructRest=function(dpath,location,drefs){return this.right.destruct("__oni_rt.destructRestProperty("+dpath+","+location+")",drefs);

};


function ph_prefix_op(id,right,pctx){this.id=id;

this.right=right;
this.line=pctx.line;
this.is_nblock=(pctx.allow_nblock&&right.is_nblock);
}
ph_prefix_op.prototype=new ph();
ph_prefix_op.prototype.is_value=true;
ph_prefix_op.prototype.nblock_val=function(){return this.id+" "+this.right.nb();

};
ph_prefix_op.prototype.val=function(){var rv;

if(this.right.is_nblock){



rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.right.is_ref){
rv="__oni_rt.Sc("+this.line+",(r)=>"+this.id+" r[0][r[1]],"+this.right.ref()+")";

}else{


rv="__oni_rt.Sc("+this.line+",(r)=>"+this.id+" r,"+this.right.v()+")";

}
return rv;
};

function ph_postfix_op(left,id,pctx){if(!left.is_ref&&!left.is_id)throw new Error("Invalid argument for postfix op '"+id+"'");

this.left=left;
this.id=id;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock;
}
ph_postfix_op.prototype=new ph();
ph_postfix_op.prototype.is_value=true;
ph_postfix_op.prototype.nblock_val=function(){return this.left.nb()+this.id+" "};
ph_postfix_op.prototype.val=function(){var rv;

if(this.left.is_nblock){

rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.left.is_ref){

rv="__oni_rt.Sc("+this.line+",(l)=>l[0][l[1]]"+this.id+","+this.left.ref()+")";

}
return rv;
};



function gen_function_header(pars,pctx){if(!pars.length)return "(){";








var param_list=[];

try{
for(var i=0;i<pars.length;++i){
pars[i].collect_par_decls(param_list,new Set());
}
return "("+param_list.join(",")+"){";
}catch(e){
var mes="Invalid syntax in parameter list";
if(typeof e==='string')mes+=" ("+e+")";

throw {mes:mes,line:pars.line};
}

}




function ph_arrow(pars_exp,body,pctx,bound){this.is_nblock=pctx.allow_nblock;

this.js_ctx=pctx.js_ctx;
this.line=pctx.line;
this.bound=bound;

this.code='function';

var pars=[];
if(pars_exp){
if(pars_exp.collect_pars)pars_exp.collect_pars(pars);else pars.push(pars_exp);



}

this.code+=gen_function_header(pars,pctx);

if(pctx.js_ctx){
this.code+="return "+body.nb()+"}";
}else{

this.code+='return __oni_rt.exseq(arguments,this,'+pctx.filename+',['+(1+32)+','+body.v()+'])}';



}
}
ph_arrow.prototype=new ph();

ph_arrow.prototype.v=function(){if(this.bound)return nblock_val_to_val(this.nb(),true,this.line);else return this.code;




};

ph_arrow.prototype.nb=function(){if(this.bound)return '('+this.code+').bind('+(this.js_ctx?'this':'this.tobj')+')';else return this.code;




};



function gen_doubledot_call(l,r,pctx){if(r.is_fun_call){




r.args.unshift(l);


if(!r.is_nblock)r.nblock_form=false;
}else r=new ph_fun_call(r,[l],pctx);



r.is_doubledot=true;
return r;
}



function gen_doublecolon_call(l,r,pctx){if(l.is_doubledot){






var target=l;
while(target.args[0].is_doubledot){
target=target.args[0];
}
if(target.args[0].is_fun_call){
target.args[0].args.unshift(r);
if(!target.args[0].is_nblock)target.args[0].nblock_form=false;
}else{

target.args[0]=new ph_fun_call(target.args[0],[r],pctx);
if(!target.is_nblock)target.nblock_form=false;
}
return l;
}else if(l.is_fun_call){

l.args.unshift(r);


if(!l.is_nblock)l.nblock_form=false;
return l;
}else return new ph_fun_call(l,[r],pctx);


}





function gen_identifier(name,pctx){if(name=="hold"){




var rv=new ph_literal('__oni_rt.Hold',pctx);
rv.is_id=true;
return rv;
}else if(name=="arguments"){

return new ph_envobj('arguments','aobj',pctx);
}else if(name==="reifiedStratum"){



var scope_id=pctx.decl_scopes.length,found=false;
while(--scope_id>=0){
if(!pctx.decl_scopes[scope_id].bl){
found=true;
pctx.decl_scopes[scope_id].reify=true;
break;
}
}
if(!found)throw new Error("reifiedStratum must appear in a function context.");

return new ph_reified_stratum(pctx);
}

return new ph_identifier(name,pctx);
}

function ph_identifier(name,pctx){this.name=name;

this.line=pctx.line;
}
ph_identifier.prototype=new ph();
ph_identifier.prototype.is_nblock=true;
ph_identifier.prototype.is_id=true;
ph_identifier.prototype.is_value=true;
ph_identifier.prototype.nblock_val=function(){return this.name};
ph_identifier.prototype.destruct=function(dpath){if(this.name==='__oni_altns')dpath='Object.create('+dpath+')';

return this.name+"="+dpath+";";
};
ph_identifier.prototype.collect_par_decls=function(pars,names){ensure_unique_name(this.name,names);

pars.push(this.name);
};
ph_identifier.prototype.collect_var_decls=function(vars){vars.push(this.name);

};

function ph_envobj(name,ename,pctx){this.js_ctx=pctx.js_ctx;

this.line=pctx.line;
this.name=name;
this.ename=ename;
}
ph_envobj.prototype=new ph();
ph_envobj.prototype.is_nblock=true;
ph_envobj.prototype.is_id=true;
ph_envobj.prototype.is_value=true;
ph_envobj.prototype.nblock_val=function(){if(this.js_ctx)return this.name;else return "this."+this.ename;




};
ph_envobj.prototype.destruct=ph_envobj.prototype.collect_var_decls=function(){
throw new Error("'"+this.name+"' not allowed in destructuring pattern");

};

function ph_reified_stratum(pctx){this.is_nblock=false;

this.js_ctx=pctx.js_ctx;
}
ph_reified_stratum.prototype=new ph();
ph_reified_stratum.prototype.val=function(){if(this.js_ctx)throw new Error("'reifiedStratum' not allowed in __js{...} contexts");

var rv="__oni_rt.Reify()";
return rv;
};






function is_nblock_arr(arr){for(var i=0;i<arr.length;++i)if(!arr[i].is_nblock)return false;


return true;
}

function ph_fun_call(l,args,pctx){this.l=l;

this.args=args;
this.nblock_form=l.is_nblock&&is_nblock_arr(args);
this.line=pctx.line;
}
ph_fun_call.prototype=new ph();
ph_fun_call.prototype.is_value=true;
ph_fun_call.prototype.is_fun_call=true;
ph_fun_call.prototype.nblock_val=function(){var rv=this.l.nb()+"(";



for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
if(this.args[i].spread)rv+='...';
rv+=this.args[i].nb();
}
return rv+")";
};
ph_fun_call.prototype.val=function(){var rv;

if(this.nblock_form){
rv=this.l.nb()+"(";
for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
if(this.args[i].spread)rv+='...';
rv+=this.args[i].nb();
}
return "__oni_rt.C(function(){return "+rv+")},"+this.line+")";
}else{

var args='',spreads=[],blocklambda_args=false;
for(var i=0;i<this.args.length;++i){
if(this.args[i].spread)spreads.push(i);
if(this.args[i].has_blocklambda)blocklambda_args=true;
args+=","+this.args[i].v();
}

var flags=0;

if(blocklambda_args)rv="__oni_rt.FAcall(";else rv="__oni_rt.Fcall(";




if(spreads.length){
flags|=4;
args+=",["+spreads+"]";
}

if(this.l.is_ref){
flags|=1;
rv+=flags+","+this.line+","+this.l.ref();
}else{




rv+=flags+","+this.line+","+this.l.v();
}

rv+=args+")";
return rv;
}
};

function ph_dot_accessor(l,name,pctx){this.l=l;

this.name=name;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&l.is_nblock;
}
ph_dot_accessor.prototype=new ph();
ph_dot_accessor.prototype.is_ref=true;
ph_dot_accessor.prototype.is_value=true;
ph_dot_accessor.prototype.nblock_val=function(){return this.l.nb()+"."+this.name};
ph_dot_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",(l)=>l."+this.name+","+this.l.v()+")";


};
ph_dot_accessor.prototype.ref=function(){if(this.is_nblock){

return "__oni_rt.Nb(function() { return ["+this.l.nb()+",'"+this.name+"']},"+this.line+")";
}else return "__oni_rt.Sc("+this.line+",(l)=>[l,'"+this.name+"'],"+this.l.v()+")";



};
ph_dot_accessor.prototype.destruct=function(dpath,drefs){drefs.push(this.ref());

var v="_oniX"+drefs.length;
return v+"[0]["+v+"[1]]="+dpath+";";
};
ph_dot_accessor.prototype.collect_var_decls=function(vars){if(this.l instanceof (ph_identifier)&&this.l.name==='__oni_altns')return;


throw new Error("var declaration must not contain property accessor as lvalue");
};

function ph_idx_accessor(l,idxexp,pctx){this.l=l;

this.idxexp=idxexp;
this.line=pctx.line;

this.is_nblock=pctx.allow_nblock&&l.is_nblock&&idxexp.is_nblock;
}
ph_idx_accessor.prototype=new ph();
ph_idx_accessor.prototype.is_ref=true;
ph_idx_accessor.prototype.is_value=true;
ph_idx_accessor.prototype.nblock_val=function(){return this.l.nb()+"["+this.idxexp.nb()+"]";

};
ph_idx_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",(l, idx)=>l[idx],"+this.l.v()+","+this.idxexp.v()+")";


};
ph_idx_accessor.prototype.ref=function(){if(this.is_nblock)return "__oni_rt.Nb(function(){return ["+this.l.nb()+","+this.idxexp.nb()+"]},"+this.line+")";else return "__oni_rt.Sc("+this.line+",function(l, idx){return [l, idx];},"+this.l.v()+","+this.idxexp.v()+")";






};


function ph_group(e,pctx){this.e=e;

this.is_nblock=pctx.allow_nblock&&e.is_nblock;
}
ph_group.prototype=new ph();
ph_group.prototype.is_value=true;
ph_group.prototype.nblock_val=function(){return "("+this.e.nb()+")"};
ph_group.prototype.v=function(accept_list){return this.e.v(accept_list)};
ph_group.prototype.destruct=function(dpath,drefs){return this.e.destruct(dpath,drefs)};
ph_group.prototype.collect_var_decls=function(vars){return this.e.collect_var_decls(vars)};
ph_group.prototype.collect_pars=function(pars){if(this.e.collect_pars)this.e.collect_pars(pars);else pars.push(this.e);




};

function ph_arr_lit(elements,pctx){this.elements=elements;

this.line=pctx.line;

var elems_nblock=true;
var elems_blocklambda=false;
for(var i=0;i<elements.length;++i){
if(!elements[i].is_nblock)elems_nblock=false;
if(elements[i].has_blocklambda)elems_blocklambda=true;
}

this.is_nblock=pctx.allow_nblock&&elems_nblock;
this.has_blocklambda=elems_blocklambda;

}
ph_arr_lit.prototype=new ph();
ph_arr_lit.prototype.is_value=true;
ph_arr_lit.prototype.nblock_val=function(){var rv="[";

for(var i=0;i<this.elements.length;++i){
if(i)rv+=",";
rv+=(this.elements[i].spread?'...':'')+this.elements[i].nb();
}
return rv+"]";
};
ph_arr_lit.prototype.val=function(){var spreads=[];

for(var i=0;i<this.elements.length;++i){
if(this.elements[i].spread){
spreads.push(i);
}
}
var rv="__oni_rt.Sc("+this.line+",__oni_rt.Arr";
if(spreads.length){
rv+='S,['+spreads+']';
}
for(var i=0;i<this.elements.length;++i){
rv+=","+this.elements[i].v();
}
return rv+")";
};
ph_arr_lit.prototype.destruct=function(dpath,drefs){var rv="",i=0;

for(;i<this.elements.length-1;++i){
rv+=this.elements[i].destruct(dpath+"["+i+"]",drefs);
}
if(i<this.elements.length){
if(this.elements[i].is_rest){
rv+=this.elements[i].destructRest(dpath,i,drefs);
}else rv+=this.elements[i].destruct(dpath+"["+i+"]",drefs);


}

return rv;
};
ph_arr_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.elements.length;++i)this.elements[i].collect_var_decls(vars);


};
ph_arr_lit.prototype.collect_par_decls=function(pars,names){var sub=[];

for(var i=0;i<this.elements.length;++i)this.elements[i].collect_par_decls(sub,names);

pars.push("["+sub.join(",")+"]");
};


function ph_obj_lit(props,pctx){this.props=props;

this.line=pctx.line;

var props_nblock=true;
var props_blocklambda=false;

for(var i=0;i<props.length;++i){

if(!props[i][2].is_nblock)props_nblock=false;
if(props[i][2].has_blocklambda)props_blocklambda=true;
}

this.is_nblock=pctx.allow_nblock&&props_nblock;
this.has_blocklambda=props_blocklambda;


}
ph_obj_lit.prototype=new ph();
ph_obj_lit.prototype.is_value=true;
ph_obj_lit.prototype.nblock_val=function(){var rv="{";

for(var i=0;i<this.props.length;++i){
if(i!=0)rv+=",";



rv+=this.props[i][1];
if(this.props[i][0]!=='pat')rv+=":"+this.props[i][2].nb();

}
return rv+"}";
};

function quotedName(name){if(name.charAt(0)=="'"||name.charAt(0)=='"')return name;


return '"'+name+'"';
}

ph_obj_lit.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Obj, [";




for(var i=0;i<this.props.length;++i){
if(i)rv+=",";
if(this.props[i][0]=="pat")throw {mes:"Missing initializer for object property "+quotedName(this.props[i][1]),line:this.props[i][2]};


rv+=quotedName(this.props[i][1]);
}
rv+="]";
for(var i=0;i<this.props.length;++i){
rv+=","+this.props[i][2].v();
}
return rv+")";
};
ph_obj_lit.prototype.destruct=function(dpath,drefs){var rv="";

for(var i=0;i<this.props.length;++i){
var p=this.props[i];
var prop=p[1];
var altns;
if(altns=p[1].charAt(0)==='@'){
prop=p[1].slice(1);
}

if(p[0]=="pat"){
var dest=p[1];
if(altns)dest='__oni_altns.'+prop;
rv+=dest+"="+dpath+"."+prop+";";
}else rv+=p[2].destruct(dpath+"["+quotedName(prop)+"]",drefs);


}
return rv;
};
ph_obj_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.props.length;++i){

var p=this.props[i];
if(p[0]=="pat"){
if(p[1].charAt(0)==='@')continue;
vars.push(p[1]);
}else p[2].collect_var_decls(vars);

}
};
ph_obj_lit.prototype.collect_par_decls=function(pars,names){var sub=[];

for(var i=0;i<this.props.length;++i){
var p=this.props[i];
if(p[0]==="pat"){
if(p[1].charAt(0)==='@')throw new Error("Invalid '"+p[1]+"' in parameter list");
ensure_unique_name(p[1],names);
sub.push(p[1]);
}else if(p[0]==='prop'){

var destr=[];
p[2].collect_par_decls(destr,names);
if(destr.length!==1)throw new Error("Invalid destructuring pattern in parameter list");
sub.push(p[1]+":"+destr[0]);
}else throw new Error("Invalid syntax in parameter list");


}
pars.push("{"+sub.join(",")+"}");
};


function ph_conditional(t,c,a,pctx){this.t=t;

this.c=c;
this.a=a;
this.line=t.line;
this.is_nblock=pctx.allow_nblock&&t.is_nblock&&c.is_nblock&&(a===undefined||a.is_nblock);
}
ph_conditional.prototype=new ph();
ph_conditional.prototype.is_value=true;
ph_conditional.prototype.nblock_val=function(){return this.t.nb()+"?"+this.c.nb()+":"+(this.a?this.a.nb():"undefined");

};
ph_conditional.prototype.val=function(){return "__oni_rt.If("+this.t.v()+","+this.c.v()+","+(this.a?this.a.v():"undefined")+")";

};

function ph_new(exp,args){this.exp=exp;

this.args=args;
this.line=exp.line;
}
ph_new.prototype=new ph();
ph_new.prototype.is_value=true;
ph_new.prototype.nblock_val=function(){var rv="new "+this.exp.nb()+"(";


for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
if(this.args[i].spread)rv+='...';
rv+=this.args[i].nb();
}
return rv+")";
};

ph_new.prototype.val=function(){var args='',spreads=[];

for(var i=0;i<this.args.length;++i){
if(this.args[i].spread)spreads.push(i);
args+=","+this.args[i].v();
}
var flags=2;
if(spreads.length){
flags|=4;
args+=",["+spreads+"]";
}
var rv="__oni_rt.Fcall("+flags+","+this.line+","+this.exp.v();
rv+=args+")";
return rv;
};









function gen_waitfor_andorwhile(op,blocks,crf,pctx){if(crf[0]||crf[1]||crf[2])return new ph_try(new ph_par_alt(op,blocks),crf,pctx);else return new ph_par_alt(op,blocks);




}

function ph_par_alt(op,blocks){this.op=op;

this.blocks=blocks;
}
ph_par_alt.prototype=new ph();
ph_par_alt.prototype.is_nblock=false;
ph_par_alt.prototype.val=function(){var rv="__oni_rt.";

if(this.op==="and")rv+="Par(";else if(this.op==="while")rv+="WfW(";else rv+="Alt(";





for(var i=0;i<this.blocks.length;++i){
var b=this.blocks[i].v();
if(i)rv+=",";
rv+=b;
}
return rv+")";
};

function gen_suspend(has_var,decls,block,crf,pctx){var rv;

if(has_var){
rv=gen_var_compound(decls,pctx);
rv.stmts.push(gen_suspend_inner(decls,block,crf,pctx));

rv=rv.toBlock();
}else rv=gen_suspend_inner(decls,block,crf,pctx);


return rv;
}

function gen_suspend_inner(decls,block,crf,pctx){var wrapped=(crf[0]||crf[1]||crf[2]);



var rv=new ph_suspend(decls,block,wrapped,pctx);
if(wrapped)rv=new ph_suspend_wrapper((new ph_try(rv,crf,pctx)).v(),pctx);

return rv;
}

function ph_suspend(decls,block,wrapped,pctx){this.decls=decls;

this.block=block;
this.wrapped=wrapped;
this.file=pctx.filename;
}
ph_suspend.prototype=new ph();
ph_suspend.prototype.val=function(){var rv="__oni_rt.Suspend(function(__oni_env,";

if(this.wrapped)rv+="_oniX){resume=_oniX;";else rv+="resume){";



var b=this.block.v();
if(b.length)rv+="return __oni_rt.ex("+b+",__oni_env)";

rv+="}, function() {";
for(var i=0;i<this.decls.length;++i){
var name=this.decls[i][0].name;
if(name=="arguments")throw new Error("Cannot use 'arguments' as variable name in waitfor()");
rv+=name+"=arguments["+i+"];";
}
rv+="})";
return rv;
};


function ph_suspend_wrapper(code,pctx){this.code=code;

this.line=pctx.line;
this.file=pctx.filename;
}
ph_suspend_wrapper.prototype=new ph();
ph_suspend_wrapper.prototype.val=function(){return "__oni_rt.Nb(function(){var resume;"+"return __oni_rt.ex("+this.code+",this)},"+this.line+")";


};


function ph_raw(raw){this.raw=raw;

}
ph_raw.prototype=new ph();
ph_raw.prototype.is_fun_decl=true;
ph_raw.prototype.fun_decl=function(){return this.raw};






function ph_blocklambda(pars,body,pctx){this.has_blocklambda=true;

this.code="function"+gen_function_header(pars,pctx)+body+"}";
}
ph_blocklambda.prototype=new ph();
ph_blocklambda.prototype.val=function(){return "__oni_rt.Bl("+this.code+")"};
ph_blocklambda.prototype.nblock_val=function(){return this.code;


};


function ph_lbl_stmt(lbl,stmt){this.lbl=lbl;

this.stmt=stmt;
}
ph_lbl_stmt.prototype=new ph();
ph_lbl_stmt.prototype.nblock_val=function(){return this.lbl+": "+this.stmt.nb();


};
ph_lbl_stmt.prototype.val=function(){throw new Error("labeled statements not implemented yet");


};








function Hash(){}
Hash.prototype={lookup:function(key){
return this["$"+key]},put:function(key,val){
this["$"+key]=val},del:function(key){
delete this["$"+key]}};




























var TOKENIZER_RAW_UNTIL_END_TOKEN=/[ \t]*([^ \t\n]+)[ \t]*\n/g;

var TOKENIZER_SA=/(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|((?:0[xX][\da-fA-F]+)|(?:0[oO][0-7]+)|(?:0[bB][0-1]+)|(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))|(\/(?:\\.|\[(?:\\[^\r\n]|[^\n\r\]])*\]|[^\[\/\r\n])+\/[gimy]*)|(__raw_until)|(\.\.\.|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+)|('(?:\\[^\r\n]|[^\\\'\r\n])*')|('(?:\\(?:(?:[^\r\n]|(?:\r\n|\n|\r)))|[^\\\'])*')|(\S+))/g;


var TOKENIZER_OP=/(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|(>>>=|===|!==|>>>|<<=|>>=|\.\.\.|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+))/g;



var TOKENIZER_IS=/((?:\\[^\r\n]|\#(?!\{)|[^#\\\"\r\n])+)|(\\(?:\r\n|\n|\r))|((?:\r\n|\n|\r))|(\"|\#\{)/g;


var TOKENIZER_QUASI=/((?:\\[^\r\n]|\$(?![\{a-zA-Z_$@])|[^$\\\`\r\n])+)|(\\(?:\r\n|\n|\r))|((?:\r\n|\n|\r))|(\`|\$\{|\$(?=[a-zA-Z_$@]))/g;









function SemanticToken(){}
SemanticToken.prototype={exsf:function(pctx){




throw new Error("Unexpected '"+this+"'")},excbp:0,excf:function(left,pctx){




throw new Error("Unexpected '"+this+"'")},stmtf:null,tokenizer:TOKENIZER_SA,toString:function(){









return "'"+this.id+"'"},exs:function(f){




this.exsf=f;

return this;
},exc:function(bp,f){
this.excbp=bp;

if(f)this.excf=f;
return this;
},stmt:function(f){
this.stmtf=f;

return this;
},ifx:function(bp,right_assoc){

this.excbp=bp;

if(right_assoc)bp-=.5;
this.excf=function(left,pctx){var right=parseExp(pctx,bp);



return new ph_infix_op(left,this.id,right,pctx);
};
return this;
},asg:function(bp,right_assoc){

this.excbp=bp;

if(right_assoc)bp-=.5;
this.excf=function(left,pctx){var right=parseExp(pctx,bp,undefined,this.id==='='?2:0);



return new ph_assign_op(left,this.id,right,pctx);
};
return this;
},pre:function(bp){

return this.exs(function(pctx){
var right=parseExp(pctx,bp);




return new ph_prefix_op(this.id,right,pctx);
});
},pst:function(bp){

return this.exc(bp,function(left,pctx){
return new ph_postfix_op(left,this.id,pctx);




});
}};



function Literal(type,value,length){this.id=type;

this.value=value;
}
Literal.prototype=new SemanticToken();
Literal.prototype.tokenizer=TOKENIZER_OP;
Literal.prototype.toString=function(){return "literal '"+this.value+"'"};
Literal.prototype.exsf=function(pctx){return new ph_literal(this.value,pctx,this.id);


};

function RawLiteral(value){this.value=value;

this.length=value.length;
}
RawLiteral.prototype=new SemanticToken();
RawLiteral.prototype.toString=function(){return "raw '"+this.value+"'"};
RawLiteral.prototype.stmtf=function(pctx){return new ph_raw(this.value);


};



function Identifier(value){if(value.charAt(0)==='@'){

this.alternate=true;
this.id="<@id>";
this.value=value.substr(1);
}else this.value=value;


}
Identifier.prototype=new Literal("<id>");
Identifier.prototype.exsf=function(pctx){if(this.alternate===true){

if(this.value.length){

return new ph_dot_accessor(new ph_identifier("__oni_altns",pctx),this.value,pctx);
}else{


return new ph_identifier("__oni_altns",pctx);
}
}else{


return gen_identifier(this.value,pctx);
}
};



var ST=new Hash();
function S(id,tokenizer){var t=new SemanticToken();

t.id=id;
if(tokenizer)t.tokenizer=tokenizer;

ST.put(id,t);


return t;
}













































































S("[").exs(function(pctx,exs_flags){

var elements=[];


while(pctx.token.id!="]"){
if(elements.length)scan(pctx,",");
if(pctx.token.id==","){
elements.push((function(pctx){return new ph_literal("",pctx)})(pctx));
}else if(pctx.token.id=="]")break;else elements.push(parseExp(pctx,110,undefined,exs_flags));




}
scan(pctx,"]");

return new ph_arr_lit(elements,pctx);
}).exc(270,function(l,pctx){

var idxexp=parseExp(pctx);



scan(pctx,"]");

return new ph_idx_accessor(l,idxexp,pctx);
});




var VALID_IDENTIFIER_NAME=/^[a-z]+$/;

S(".").exc(270,function(l,pctx){var name;


if(pctx.token.id=="<id>")name=pctx.token.value;else if(VALID_IDENTIFIER_NAME.test(pctx.token.id))name=pctx.token.id;else throw new Error("Expected an identifier, found '"+pctx.token+"' instead");






scan(pctx);

return new ph_dot_accessor(l,name,pctx);
});


function is_arrow(id){return id==='=>'||id==='->'}


S("...").exs(function(pctx,exs_flags){if((exs_flags&2)){







var right=parseExp(pctx,119,undefined,2);


return gen_spread(right);
}else if(pctx.token.id=="<id>"||pctx.token.id=='['||pctx.token.id=='<@id>'){




var right=parseExp(pctx,119);


if(pctx.token.id==',')throw new Error("Invalid location of rest ('...') property");
return new ph_rest(right);
}else throw new Error("Unexpected '...'");

});

S("new").exs(function(pctx){var exp=parseExp(pctx,260);


var args=[];
if(pctx.token.id=="("){
scan(pctx);
while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110,undefined,2));
}

scan(pctx,")");
}

return new ph_new(exp,args);
});

S("(").exs(function(pctx,exs_flags){

if(pctx.token.id==')'){


var op=scan(pctx,')');
if(op.id!='->'&&op.id!='=>')throw new Error("Was expecting '->' or '=>' after empty parameter list, but saw '"+pctx.token.id+"'");


scan(pctx);
return op.exsf(pctx);
}

var e=parseExp(pctx,0,undefined,exs_flags&~2);
scan(pctx,")");

return new ph_group(e,pctx);
}).exc(260,function(l,pctx){

var line=pctx.line;


var args=[];
while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110,undefined,1|2));
}

scan(pctx,")");


if(pctx.token.id=='{'){

TOKENIZER_SA.lastIndex=pctx.lastIndex;
while(1){
var matches=TOKENIZER_SA.exec(pctx.src);
if(matches&&(matches[5]=='|'||matches[5]=='||')){



args.push(parseBlockLambda(scan(pctx).id,pctx));
}else if(matches&&matches[1]){

continue;
}
break;
}
}


return new ph_fun_call(l,args,Object.assign({},pctx,{line:line}));
});

S("..").exc(255,function(l,pctx){var r=parseExp(pctx,255);



return gen_doubledot_call(l,r,pctx);
});

S("++").pre(240).pst(250).asi_restricted=true;
S("--").pre(240).pst(250).asi_restricted=true;

S("delete").pre(240);
S("void").pre(240);
S("typeof").pre(240);
S("+").pre(240).ifx(220);
S("-").pre(240).ifx(220);
S("~").pre(240);
S("!").pre(240);

S("*").ifx(230);
S("/").ifx(230);
S("%").ifx(230);



S("<<").ifx(210);
S(">>").ifx(210);
S(">>>").ifx(210);

S("::").exc(205,function(l,pctx){var r=parseExp(pctx,110);



return gen_doublecolon_call(l,r,pctx);
});


S("<").ifx(200);
S(">").ifx(200);
S("<=").ifx(200);
S(">=").ifx(200);
S("instanceof").ifx(200);

S("in").ifx(200);
S("of").ifx(200);

S("==").ifx(190);
S("!=").ifx(190);
S("===").ifx(190);
S("!==").ifx(190);

S("&").ifx(180);
S("^").ifx(170);
S("|").ifx(160);
S("&&").ifx(150);
S("||").ifx(140);

S("?").exc(130,function(test,pctx){var consequent=parseExp(pctx,110);


if(pctx.token.id==":"){
scan(pctx,":");
var alternative=parseExp(pctx,110);
}

return new ph_conditional(test,consequent,alternative,pctx);
});

S("=").asg(120,true);
S("*=").asg(120,true);
S("/=").asg(120,true);
S("%=").asg(120,true);
S("+=").asg(120,true);
S("-=").asg(120,true);
S("<<=").asg(120,true);
S(">>=").asg(120,true);
S(">>>=").asg(120,true);
S("&=").asg(120,true);
S("^=").asg(120,true);
S("|=").asg(120,true);

S("->").exs(function(pctx){

var body=parseExp(pctx,119.5,undefined,2);



return new ph_arrow(undefined,body,pctx);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5,undefined,2);



return new ph_arrow(left,body,pctx);
});
S("=>").exs(function(pctx){

var body=parseExp(pctx,119.5,undefined,2);



return new ph_arrow(undefined,body,pctx,true);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5,undefined,2);



return new ph_arrow(left,body,pctx,true);
});

S(",").ifx(110,true);


function parsePropertyName(token,pctx){var id=token.id;

if(id=="<@id>")return '@'+token.value;

if(id=="<id>"||id=="<string>"||id=="<number>")return token.value;


if(id=='"'){
if((token=scan(pctx)).id!="<string>"||scan(pctx,undefined,TOKENIZER_IS).id!='istr-"')throw new Error("Non-literal strings can't be used as property names ("+token+")");


return '"'+token.value+'"';
}
if(VALID_IDENTIFIER_NAME.test(token.id))return token.id;

throw new Error("Invalid object literal syntax; property name expected, but saw "+token);
}

function parseBlock(pctx){push_stmt_scope(pctx);



while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}

scan(pctx,"}");

return pop_block(pctx);
}

function parseBlockLambdaBody(pctx){push_decl_scope(pctx,true);


push_stmt_scope(pctx);
while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);;
}
scan(pctx,"}");

var decls=pctx.decl_scopes.pop();var flags=1;if(decls.notail)flags+=8;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exbl(this,["+flags,"])");
}
function parseBlockLambda(start,pctx){var pars;



if(start=='||'){
pars=[];
scan(pctx);
}else{
pars=parseFunctionParams(pctx,'|','|');
}

var body=parseBlockLambdaBody(pctx);

return new ph_blocklambda(pars,body,pctx);
}

S("{").exs(function(pctx,exs_flags){
var start=pctx.token.id;

if(start=="|"||start=="||"){

if(exs_flags&1)return parseBlockLambda(start,pctx);else throw new Error("Blocklambdas are only allowed in function calls");


}else{


var props=[];

while(pctx.token.id!="}"){
if(props.length)scan(pctx,",");
var prop=pctx.token;
if(prop.id=="}")break;

prop=parsePropertyName(prop,pctx);
scan(pctx);
if(pctx.token.id==":"){

scan(pctx);
var exp=parseExp(pctx,110,undefined,exs_flags);
props.push(["prop",prop,exp]);
}else if(pctx.token.id=="}"||pctx.token.id==","){

if(prop.charAt(0)=="'"||prop.charAt(0)=='"')throw new Error("Quoted identifiers not allowed in destructuring patterns ("+prop+")");

props.push(["pat",prop,pctx.line]);
}else throw new Error("Unexpected token '"+pctx.token+"'");


}
scan(pctx,"}",TOKENIZER_OP);

return new ph_obj_lit(props,pctx);
}
}).exc(260,function(l,pctx){

var line=pctx.line;


var start=pctx.token.id;
if(start!="|"&&start!="||")throw new Error("Unexpected token '"+pctx.token+"' - was expecting '|' or '||'");

var args=[parseBlockLambda(start,pctx)];

return new ph_fun_call(l,args,Object.assign({},pctx,{line:line}));
}).stmt(parseBlock);




S(";").stmt(function(pctx){return ph_empty_stmt});
S(")",TOKENIZER_OP);
S("]",TOKENIZER_OP);
S("}");
S(":");

S("<eof>").exs(function(pctx){
throw new Error("Unexpected end of input (exs)")}).stmt(function(pctx){
throw new Error("Unexpected end of input (stmt)")});




function parseFunctionBody(pctx){push_decl_scope(pctx);

push_stmt_scope(pctx);

scan(pctx,"{");
while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}

scan(pctx,"}");

var decls=pctx.decl_scopes.pop();var flags=1;if(decls.notail)flags+=8;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.ex"+(decls.reify?"r":"")+"seq(arguments,this,"+pctx.filename+",["+flags,"])");
}

function parseFunctionParam(pctx){var t=pctx.token;



scan(pctx);
var left=t.exsf(pctx);
while(pctx.token.id!='|'&&pctx.token.excbp>110){
t=pctx.token;
scan(pctx);
left=t.excf(left,pctx);
}
return left;
}

function parseFunctionParams(pctx,starttok,endtok){if(!starttok){


starttok='(';endtok=')'}
var pars=[];
var have_rest=false;
scan(pctx,starttok);
pars.line=pctx.line;
while(pctx.token.id!=endtok){
if(have_rest)throw new Error("Rest parameter must be last formal parameter");
if(pars.length)scan(pctx,",");

switch(pctx.token.id){case "{":

case "[":
pars.push(parseFunctionParam(pctx));
break;
case "...":
have_rest=true;
scan(pctx);
if(pctx.token.id!=="<id>")scan(pctx,"<id>");

pctx.token.value="..."+pctx.token.value;

case "<id>":
pars.push(pctx.token.exsf(pctx));
scan(pctx);
break;
default:
throw new Error("Expected function parameter but found '"+pctx.token+"'");
}
}
scan(pctx,endtok);
return pars;
}

S("function").exs(function(pctx){

var fname="";


if(pctx.token.id=="<id>"){
fname=pctx.token.value;
scan(pctx);
}
var pars=parseFunctionParams(pctx);
var body=parseFunctionBody(pctx);


return new ph_fun_exp(fname,pars,body,pctx);
}).stmt(function(pctx){

if(pctx.token.id!="<id>")throw new Error("Malformed function declaration");


var fname=pctx.token.value;
scan(pctx);
var pars=parseFunctionParams(pctx);
var body=parseFunctionBody(pctx);


return gen_fun_decl(fname,pars,body,pctx);
});

S("this",TOKENIZER_OP).exs(function(pctx){return new ph_envobj('this','tobj',pctx)});
S("true",TOKENIZER_OP).exs(function(pctx){return new ph_literal('true',pctx)});
S("false",TOKENIZER_OP).exs(function(pctx){return new ph_literal('false',pctx)});
S("null",TOKENIZER_OP).exs(function(pctx){return new ph_literal('null',pctx)});

S("collapse",TOKENIZER_OP).exs(function(pctx){return new ph_collapse(pctx)});

S('"',TOKENIZER_IS).exs(function(pctx){var parts=[],last=-1;

while(pctx.token.id!='istr-"'){
switch(pctx.token.id){case "<string>":





if(last!=-1&&typeof parts[last]=='string'){
parts[last]+=pctx.token.value;
}else{

parts.push(pctx.token.value);
++last;
}
break;
case 'istr-#{':
scan(pctx);




parts.push([parseExp(pctx)]);
++last;
break;
case "<eof>":
throw new Error("Unterminated string");
break;
default:
throw new Error("Internal parser error: Unknown token in string ("+pctx.token+")");
}

scan(pctx,undefined,TOKENIZER_IS);
}

if(last==-1){

parts.push('');
last=0;
}

scan(pctx);

if(last==0&&typeof parts[0]=='string'){
var val='"'+parts[0]+'"';
return new ph_literal(val,pctx,'<string>');
}
return new ph_interpolating_str(parts,pctx);
});

S('istr-#{',TOKENIZER_SA);
S('istr-"',TOKENIZER_OP);

S('`',TOKENIZER_QUASI).exs(function(pctx){var parts=[],current=0;


while(pctx.token.id!='quasi-`'){
switch(pctx.token.id){case '<string>':





if(current%2)parts[current-1]+=pctx.token.value;else{


parts.push(pctx.token.value);
++current;
}
break;
case 'quasi-${':
scan(pctx);


if((current%2)==0){
parts.push('');
++current;
}
parts.push(parseExp(pctx));
++current;
break;
case 'quasi-$':


if((current%2)==0){
parts.push('');
++current;
}
parts.push(parseQuasiInlineEscape(pctx));
++current;
break;

case '<eof>':
throw new Error('Unterminated string');
break;
default:
throw new Error('Internal parser error: Unknown token in string ('+pctx.token+')');
}

scan(pctx,undefined,TOKENIZER_QUASI);
}
scan(pctx);


if(current==0){
parts.push('');
}

return new ph_quasi_template(parts,pctx);;
});

function parseQuasiInlineEscape(pctx){var identifier=scan(pctx);


var line;
if(pctx.token.id!=="<id>"&&pctx.token.id!=="<@id>")throw new Error("Unexpected "+pctx.token+" in quasi template");
if(pctx.src.charAt(pctx.lastIndex)!='('){

return identifier.exsf(pctx);
}else{


scan(pctx);
scan(pctx,'(');
line=pctx.line;

var args=[];
while(pctx.token.id!=')'){
if(args.length)scan(pctx,',');
args.push(parseExp(pctx,110));
}
return new ph_fun_call(identifier.exsf(pctx),args,Object.assign({},pctx,{line:line}));
}
}

S('quasi-${',TOKENIZER_SA);
S('quasi-$',TOKENIZER_SA);
S('quasi-`',TOKENIZER_OP);

function isStmtTermination(token){return token.id==";"||token.id=="}"||token.id=="<eof>";

}

function parseStmtTermination(pctx){if(pctx.token.id!="}"&&pctx.token.id!="<eof>"&&!pctx.newline){


scan(pctx,";");
}
}

function parseVarDecls(pctx,noInOf){var decls=[];

var parse=noInOf?parseExpNoInOf:parseExp;
do {
if(decls.length)scan(pctx,",");

var id_or_pattern=parse(pctx,120);
if(pctx.token.id=="="){
scan(pctx);
var initialiser=parse(pctx,110,undefined,2);

decls.push([id_or_pattern,initialiser]);
}else decls.push([id_or_pattern]);


}while(pctx.token.id==",");

return decls;
}

S("var").stmt(function(pctx){var decls=parseVarDecls(pctx);


parseStmtTermination(pctx);

return gen_var_decl(decls,pctx);
});

S("else");

S("if").stmt(function(pctx){scan(pctx,"(");


var test=parseExp(pctx);
scan(pctx,")");
var consequent=parseStmt(pctx);
var alternative=null;
if(pctx.token.id=="else"){
scan(pctx);
alternative=parseStmt(pctx);
}

return new ph_if(test,consequent,alternative,pctx);
});

S("while").stmt(function(pctx){scan(pctx,"(");


var test=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;

return new ph_loop(0,test,body);
});

S("do").stmt(function(pctx){++top_decl_scope(pctx).break_scope;

++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
scan(pctx,"while");
scan(pctx,"(");
var test=parseExp(pctx);

scan(pctx,")");
parseStmtTermination(pctx);

return new ph_loop(2,test,body);
});

S("for").stmt(function(pctx){scan(pctx,"(");


var start_exp=null;
var decls=null;
if(pctx.token.id=="var"){

scan(pctx);
decls=parseVarDecls(pctx,true);
}else{

if(pctx.token.id!=';')start_exp=parseExpNoInOf(pctx);

}

if(pctx.token.id==";"){
scan(pctx);
var test_exp=null;
if(pctx.token.id!=";")test_exp=parseExp(pctx);

scan(pctx,";");
var inc_exp=null;
if(pctx.token.id!=")")inc_exp=parseExp(pctx);

scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;

return gen_for(start_exp,decls,test_exp,inc_exp,body,pctx);
}else if(pctx.token.id=="in"){

scan(pctx);

if(decls&&decls.length>1)throw new Error("More than one variable declaration in for-in loop");

var obj_exp=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
var decl=decls?decls[0]:null;

return gen_for_in(start_exp,decl,obj_exp,body,pctx);
}else if(pctx.token.id=="of"){

scan(pctx);

if(decls&&decls.length>1)throw new Error("More than one variable declaration in for-of loop");

var obj_exp=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
var decl=decls?decls[0]:null;

return gen_for_of(start_exp,decl,obj_exp,body,pctx);
}else throw new Error("Unexpected token '"+pctx.token+"' in for-statement");


});

S("continue").stmt(function(pctx){var label=null;


if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;

scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).continue_scope)return new ph_cfe("c",pctx,label);else if(top_decl_scope(pctx).bl){if(pctx.js_ctx)return new ph_return(undefined,pctx);else return new ph_cfe("c",pctx,label)}else throw new Error("Unexpected 'continue' statement");
});

S("break").stmt(function(pctx){var label=null;


if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;

scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).break_scope)return new ph_cfe("b",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_pblb(pctx,label);else throw new Error("Unexpected 'break' statement");
});

S("return").stmt(function(pctx){var exp=null;


if(!isStmtTermination(pctx.token)&&!pctx.newline){
exp=parseExp(pctx);

}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).bl)return new ph_pblr(exp,pctx);else return new ph_return(exp,pctx);
});

S("with").stmt(function(pctx){scan(pctx,"(");


var exp=parseExp(pctx);
scan(pctx,")");
var body=parseStmt(pctx);


return new ph_with(exp,body,pctx);
});

S("case");
S("default");

S("switch").stmt(function(pctx){scan(pctx,"(");


var exp=parseExp(pctx);
scan(pctx,")");
scan(pctx,"{");
++top_decl_scope(pctx).break_scope;
var clauses=[];
while(pctx.token.id!="}"){
var clause_exp=null;

if(pctx.token.id=="case"){
scan(pctx);
clause_exp=parseExp(pctx);
}else if(pctx.token.id=="default"){

scan(pctx);
}else throw new Error("Invalid token '"+pctx.token+"' in switch statement");


scan(pctx,":");


push_stmt_scope(pctx);top_stmt_scope(pctx).exp=clause_exp;
while(pctx.token.id!="case"&&pctx.token.id!="default"&&pctx.token.id!="}"){
var stmt=parseStmt(pctx);


add_stmt(stmt,pctx);
}
clauses.push((function(pctx){return [top_stmt_scope(pctx).exp,pop_block(pctx)];


})(pctx));
}
--top_decl_scope(pctx).break_scope;

scan(pctx,"}");

return new ph_switch(exp,clauses);(exp,clauses,pctx,null);
});

S("throw").stmt(function(pctx){if(pctx.newline)throw new Error("Illegal newline after throw");


var exp=parseExp(pctx);

parseStmtTermination(pctx);

return new ph_throw(exp,pctx);;
});

S("catch");
S("finally");





function parseCRF(pctx,allow_augmented_finally){var rv=[];

var a=null;
if(pctx.token.id=="catch"){
a=[];
scan(pctx);
a.push(scan(pctx,"(").value);
scan(pctx,"<id>");
scan(pctx,")");
scan(pctx,"{");
a.push(parseBlock(pctx));
}
rv.push(a);
if(pctx.token.value=="retract"){
scan(pctx);
scan(pctx,"{");
rv.push(parseBlock(pctx));
}else rv.push(null);


if(pctx.token.id=="finally"){
scan(pctx);

a=[];

if(allow_augmented_finally&&pctx.token.id==='('){
a.push(scan(pctx).value);
scan(pctx,"<id>");
scan(pctx,")");
}else a.push(null);



scan(pctx,"{");
a.push(parseBlock(pctx));
rv.push(a);
}else rv.push(null);


return rv;
}

S("try").stmt(function(pctx){scan(pctx,"{");


var block=parseBlock(pctx);
var op=pctx.token.value;
if(op!="and"&&op!="or"){

var crf=parseCRF(pctx,true);
if(!crf[0]&&!crf[1]&&!crf[2])throw new Error("Missing 'catch', 'finally' or 'retract' after 'try'");


return new ph_try(block,crf,pctx);
}else{


var blocks=[block];
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value==op);
var crf=parseCRF(pctx,false);

return gen_waitfor_andorwhile(op,blocks,crf,pctx);
}
});

S("waitfor").stmt(function(pctx){if(pctx.token.id=="{"){



scan(pctx,"{");
var blocks=[parseBlock(pctx)];
var op=pctx.token.value||pctx.token.id;
if(op!=="and"&&op!=="or"&&op!=='while')throw new Error("Missing 'and', 'or', or 'while' after 'waitfor' block");
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value===op);
var crf=parseCRF(pctx,true);

return gen_waitfor_andorwhile(op,blocks,crf,pctx);
}else{


scan(pctx,"(");
var has_var=(pctx.token.id=="var");
if(has_var)scan(pctx);
var decls=[];
if(pctx.token.id==")"){
if(has_var)throw new Error("Missing variables in waitfor(var)");
}else decls=parseVarDecls(pctx);


scan(pctx,")");
scan(pctx,"{");

++top_decl_scope(pctx).fscoped_ctx;
var block=parseBlock(pctx);
var crf=parseCRF(pctx,true);

--top_decl_scope(pctx).fscoped_ctx;

return gen_suspend(has_var,decls,block,crf,pctx);
}
});


S("__js").stmt(function(pctx){if(pctx.allow_nblock)++pctx.js_ctx;



var body=parseStmt(pctx);

if(pctx.allow_nblock)--pctx.js_ctx;

body.is_nblock=pctx.allow_nblock;return body;
}).exs(function(pctx){
if(pctx.allow_nblock)++pctx.js_ctx;


var right=parseExp(pctx,112);
if(pctx.allow_nblock)--pctx.js_ctx;


right.is_nblock=pctx.allow_nblock;return right;
});


S("abstract");
S("boolean");
S("byte");
S("char");
S("class");
S("const");
S("debugger");
S("double");
S("enum");
S("export");
S("extends");
S("final");
S("float");
S("goto");
S("implements");
S("import");
S("int");
S("interface");
S("long");
S("native");
S("package");
S("private");
S("protected");
S("public");
S("short");
S("static");
S("super");
S("synchronized");
S("throws");
S("transient");
S("volatile");




function makeParserContext(src,settings){var ctx={src:src,line:1,lastIndex:0,token:null};







if(settings)for(var a in settings)ctx[a]=settings[a];



return ctx;
}


function compile(src,settings){var pctx=makeParserContext(src+"\n",settings);









try{
return parseScript(pctx);
}catch(e){

var mes=e.mes||e;
var line=e.line||pctx.line;
var exception=new Error("SJS syntax error "+(pctx.filename&&pctx.filename!=='__onimodulename'?"in "+pctx.filename+",":"at")+" line "+line+": "+mes);
exception.compileError={message:mes,line:line};
throw exception;
}
}
exports.compile=exports.parse=compile;

function parseScript(pctx){begin_script(pctx);

scan(pctx);
while(pctx.token.id!="<eof>"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);;
}
return end_script(pctx);
}

function parseStmt(pctx){var t=pctx.token;



scan(pctx);
if(t.stmtf){

var rv=t.stmtf(pctx);
return rv;
}else if(t.id=="<id>"&&pctx.token.id==":"){


scan(pctx);

var stmt=parseStmt(pctx);


return new ph_lbl_stmt(t.value,stmt);
}else{


var exp=parseExp(pctx,0,t);

parseStmtTermination(pctx);


return new ph_exp_stmt(exp,pctx);
}
}


function parseExp(pctx,bp,t,exs_flags){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}


var left=t.exsf(pctx,exs_flags);
while(bp<pctx.token.excbp){

if(pctx.newline&&t.asi_restricted)break;

t=pctx.token;

scan(pctx);
left=t.excf(left,pctx);

}
return left;
}


function parseExpNoInOf(pctx,bp,t){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}


var left=t.exsf(pctx);
while(bp<pctx.token.excbp&&pctx.token.id!='in'&&pctx.token.id!='of'){
t=pctx.token;

if(pctx.newline&&t.asi_restricted)return left;

scan(pctx);
left=t.excf(left,pctx);
}
return left;
}


function scan(pctx,id,tokenizer){if(!tokenizer){

if(pctx.token)tokenizer=pctx.token.tokenizer;else tokenizer=TOKENIZER_SA;



}

if(id&&(!pctx.token||pctx.token.id!=id))throw new Error("Unexpected "+pctx.token+", looking for "+id+" on "+pctx.line);

pctx.token=null;
pctx.newline=0;
while(!pctx.token){
tokenizer.lastIndex=pctx.lastIndex;
var matches=tokenizer.exec(pctx.src);
if(!matches){
pctx.token=ST.lookup("<eof>");
break;
}
pctx.lastIndex=tokenizer.lastIndex;

if(tokenizer==TOKENIZER_SA){
if(matches[5]){
pctx.token=ST.lookup(matches[5]);
if(!pctx.token){
pctx.token=new Identifier(matches[5]);
}
}else if(matches[1]){

var m=matches[1].match(/(?:\r\n|\n|\r)/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else if(matches[6]){

pctx.token=new Literal("<string>",matches[6]);
}else if(matches[4]){


TOKENIZER_RAW_UNTIL_END_TOKEN.lastIndex=pctx.lastIndex;
var matches=TOKENIZER_RAW_UNTIL_END_TOKEN.exec(pctx.src);
if(!matches){
throw new Error("Missing end token for __raw_until");
}else if(matches.index!==pctx.lastIndex){

throw new Error("Malformed end token for __raw_until");
}


var end_token_i=pctx.src.indexOf(matches[1],TOKENIZER_RAW_UNTIL_END_TOKEN.lastIndex);
if(end_token_i===-1)throw new Error("__raw_until: end token '"+matches[1]+"' not found");


var val=pctx.src.substring(TOKENIZER_RAW_UNTIL_END_TOKEN.lastIndex,end_token_i);
pctx.lastIndex=end_token_i+matches[1].length;

var m=val.match(/(?:\r\n|\n|\r)/g);
pctx.line+=m.length+1;
pctx.newline+=m.length+1;


pctx.token=new RawLiteral(val);
}else if(matches[7]){

var val=matches[7];
var m=val.match(/(?:\r\n|\n|\r)/g);
pctx.line+=m.length;
pctx.newline+=m.length;
var lit=val.replace(/\\(?:\r\n|\n|\r)/g,"").replace(/(?:\r\n|\n|\r)/g,"\\n");
pctx.token=new Literal("<string>",lit);

}else if(matches[2])pctx.token=new Literal("<number>",matches[2]);else if(matches[3])pctx.token=new Literal("<regex>",matches[3]);else if(matches[8])throw new Error("Unexpected characters: '"+matches[8]+"'");else throw new Error("Internal scanner error");









}else if(tokenizer==TOKENIZER_OP){

if(matches[2]){
pctx.token=ST.lookup(matches[2]);
if(!pctx.token){
pctx.token=new Identifier(matches[2]);
}
}else if(matches[1]){

var m=matches[1].match(/(?:\r\n|\n|\r)/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else{




tokenizer=TOKENIZER_SA;

}

}else if(tokenizer==TOKENIZER_IS){


if(matches[1]){
pctx.token=new Literal("<string>",matches[1]);
}else if(matches[2]){
++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n',1);
}else if(matches[4]){

pctx.token=ST.lookup("istr-"+matches[4]);
}
}else if(tokenizer==TOKENIZER_QUASI){


if(matches[1]){
pctx.token=new Literal("<string>",matches[1]);
pctx.token.inner='`';
}else if(matches[2]){
++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n');
}else if(matches[4]){

pctx.token=ST.lookup("quasi-"+matches[4]);
}
}else throw new Error("Internal scanner error: no tokenizer");


}
return pctx.token;
}


})(__oni_rt.c1={});__oni_rt.modsrc['builtin:apollo-sys-common.sjs']="__js __oni_rt.sys=exports;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar UNDEF;\n\n\n\n\n\n__js if(!(__oni_rt.G.__oni_rt_bundle)){\n__oni_rt.G.__oni_rt_bundle={};\n}\n\n\n\n\n\n\n\n\n\n__js exports.hostenv=__oni_rt.hostenv;\n\n\n\n\n\n__js exports.getGlobal=function(){return __oni_rt.G};\n\n\n\n\n\n\n\nexports.withDynVarContext=function(...args){__js var old_dyn_vars=__oni_rt.current_dyn_vars;\n\n\nvar proto_context,block;\nif(args.length===1){\n__js proto_context=old_dyn_vars;\nblock=args[0];\n}else{\n\nproto_context=args[0];\nblock=args[1];\n}\n\ntry{\n__js __oni_rt.current_dyn_vars=__oni_rt.createDynVarContext(proto_context);\nblock();\n}finally{\n\n__js __oni_rt.current_dyn_vars=old_dyn_vars;\n}\n};\n\n\n\n\n\n__js exports.getCurrentDynVarContext=function(){return __oni_rt.current_dyn_vars;\n\n};\n\n\n\n\n\n\n\n__js exports.setDynVar=function(name,value){if(Object.hasOwnProperty(__oni_rt.current_dyn_vars,\'root\'))throw new Error(\"Cannot set dynamic variable without context\");\n\nif(__oni_rt.current_dyn_vars===null)throw new Error(\"No dynamic variable context to retrieve #{name}\");\n\nvar key=\'$\'+name;\n__oni_rt.current_dyn_vars[key]=value;\n};\n\n\n\n\n\n\n__js exports.clearDynVar=function(name){if(__oni_rt.current_dyn_vars===null)throw new Error(\"No dynamic variable context to clear #{name}\");\n\n\nvar key=\'$\'+name;\ndelete __oni_rt.current_dyn_vars[key];\n};\n\n\n\n\n\n\n\n__js exports.getDynVar=function(name,default_val){var key=\'$\'+name;\n\nif(__oni_rt.current_dyn_vars===null){\nif(arguments.length>1)return default_val;else throw new Error(\"Dynamic Variable \'#{name}\' does not exist (no dynamic variable context)\");\n\n\n\n}\nif(!(key in __oni_rt.current_dyn_vars)){\nif(arguments.length>1)return default_val;else throw new Error(\"Dynamic Variable \'#{name}\' does not exist\");\n\n\n\n}\nreturn __oni_rt.current_dyn_vars[key];\n};\n\n\n\n\n\n\n\n\n__js var arrayCtors=[],arrayCtorNames=[\'Uint8Array\',\'Uint16Array\',\'Uint32Array\',\'Int8Array\',\'Int16Array\',\'Int32Array\',\'Float32Array\',\'Float64Array\',\'NodeList\',\'HTMLCollection\',\'FileList\',\'StaticNodeList\',\'DataTransferItemList\'];\n\n\n\n\n\n\n\n__js for(var i=0;i<arrayCtorNames.length;i++ ){\nvar c=__oni_rt.G[arrayCtorNames[i]];\nif(c)arrayCtors.push(c);\n}\n__js exports.isArrayLike=function(obj){if(Array.isArray(obj)||!!(obj&&Object.prototype.hasOwnProperty.call(obj,\'callee\')))return true;\n\nfor(var i=0;i<arrayCtors.length;i++ )if(obj instanceof arrayCtors[i])return true;\nreturn false;\n};\n\n\n\n\n\n\n\n\n\n\n\n__js {\nvar _flatten=function(arr,rv){var l=arr.length;\n\nfor(var i=0;i<l;++i){\nvar elem=arr[i];\nif(exports.isArrayLike(elem))_flatten(elem,rv);else rv.push(elem);\n\n\n\n}\n};\n\nexports.flatten=function(arr){var rv=[];\n\nif(arr.length===UNDEF)throw new Error(\"flatten() called on non-array\");\n_flatten(arr,rv);\nreturn rv;\n};\n}\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js exports.expandSingleArgument=function(args){if(args.length==1&&exports.isArrayLike(args[0]))args=args[0];\n\n\nreturn args;\n};\n\n\n\n\n\n\n\n\n\n__js exports.isReifiedStratum=function(obj){return (obj!==null&&typeof (obj)===\'object\'&&!!obj.__oni_stratum);\n\n};\n\n\n\n\n\n\n\n\n\n__js exports.isQuasi=function(obj){return (obj instanceof __oni_rt.QuasiProto);\n\n};\n\n\n\n\n\n\n__js exports.Quasi=function(arr){return __oni_rt.Quasi.apply(__oni_rt,arr)};\n\n\n\n\n\n\n__js exports.mergeObjects=function(){var sources=exports.expandSingleArgument(arguments);\n\nreturn Object.assign({},...sources);\n};\n\n\n\n\n\n__js exports.extendObject=function(dest,source){return Object.assign(dest,source);\n\n};\n\n\n\n\n\n__js exports.overrideObject=function(dest,...sources){var sources=exports.flatten(sources);\n\n\nfor(var h=sources.length-1;h>=0;--h){\nif(sources[h]==null)sources.splice(h,1);\n\n}\nvar hl=sources.length;\nif(hl){\n\nfor(var o in dest){\nfor(var h=hl-1;h>=0;--h){\nvar source=sources[h];\nif(o in source){\ndest[o]=source[o];\nbreak;\n}\n}\n}\n}\nreturn dest;\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js {\nfunction URI(){}\nURI.prototype={toString:function(){\nreturn \"#{this.protocol}://#{this.authority}#{this.relative}\";\n\n}};\n\nURI.prototype.params=function(){if(!this._params){\n\nvar rv={};\nthis.query.replace(parseURLOptions.qsParser,function(_,k,v){if(k)rv[decodeURIComponent(k)]=decodeURIComponent(v);\n\n});\nthis._params=rv;\n}\nreturn this._params;\n};\n\nvar parseURLOptions={key:[\"source\",\"protocol\",\"authority\",\"userInfo\",\"user\",\"password\",\"host\",\"port\",\"relative\",\"path\",\"directory\",\"file\",\"query\",\"anchor\"],qsParser:/(?:^|&)([^&=]*)=?([^&]*)/g,parser:/^(?:([^:\\/?#]+):)?(?:\\/\\/((?:(([^:\\/@]*)(?::([^:\\/@]*))?)?@)?([^:\\/?#]*)(?::(\\d*))?))?((((?:[^?#\\/]*\\/)*)([^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/};\n\n\n\n\n\n\nexports.parseURL=function(str){str=String(str);\n\n\n\nvar src=str;\nvar b=str.indexOf(\'[\');\nvar e=(b!==-1)?str.indexOf(\']\'):-1;\n\nif(e!==-1){\nstr=str.substring(0,b)+str.substring(b,e).replace(/:/g,\';\')+str.substring(e,str.length);\n}\n\nvar o=parseURLOptions,m=o.parser.exec(str),uri=new URI(),i=14;\n\n\n\nwhile(i-- )uri[o.key[i]]=m[i]||\"\";\n\nif(e!==-1){\nuri.source=src;\nuri.host=uri.host.substring(1,uri.host.length-1).replace(/;/g,\':\');\nuri.authority=uri.authority.replace(/;/g,\':\');\nuri.ipv6=true;\n}else uri.ipv6=false;\n\n\n\nreturn uri;\n};\n}\n\n\n\n\n\n\n\n\n__js exports.encodeURIComponentRFC3986=function(str){return encodeURIComponent(str).replace(/[!\'()*]/g,function(c){\nreturn \'%\'+c.charCodeAt(0).toString(16);\n\n});\n};\n\n\n\n\n\n\n\n\n\n__js exports.constructQueryString=function(){var hashes=exports.flatten(arguments);\n\nvar hl=hashes.length;\nvar parts=[];\nfor(var h=0;h<hl;++h){\nvar hash=hashes[h];\nfor(var q in hash){\nvar l=encodeURIComponent(q)+\"=\";\nvar val=hash[q];\nif(!exports.isArrayLike(val))parts.push(l+encodeURIComponent(val));else{\n\n\nfor(var i=0;i<val.length;++i)parts.push(l+encodeURIComponent(val[i]));\n\n}\n}\n}\nreturn parts.join(\"&\");\n};\n\n\n\n\n\n\n\n\n__js exports.constructURL=function(){var url_spec=exports.flatten(arguments);\n\nvar l=url_spec.length;\nvar rv;\n\n\nfor(var i=0;i<l;++i){\nvar comp=url_spec[i];\nif(exports.isQuasi(comp)){\ncomp=comp.parts.slice();\nfor(var k=1;k<comp.length;k+=2)comp[k]=exports.encodeURIComponentRFC3986(comp[k]);\n\ncomp=comp.join(\'\');\n}else if(typeof comp!=\"string\")break;\n\nif(rv!==undefined){\nif(rv.charAt(rv.length-1)!=\"/\")rv+=\"/\";\nrv+=comp.charAt(0)==\"/\"?comp.substr(1):comp;\n}else rv=comp;\n\n\n}\n\n\nvar qparts=[];\nfor(;i<l;++i){\nvar part=exports.constructQueryString(url_spec[i]);\nif(part.length)qparts.push(part);\n\n}\nvar query=qparts.join(\"&\");\nif(query.length){\nif(rv.indexOf(\"?\")!=-1)rv+=\"&\";else rv+=\"?\";\n\n\n\nrv+=query;\n}\nreturn rv;\n};\n\n\n\n\n\n\n\n__js exports.isSameOrigin=function(url1,url2){var a1=exports.parseURL(url1).authority;\n\nif(!a1)return true;\nvar a2=exports.parseURL(url2).authority;\nreturn !a2||(a1==a2);\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js exports.normalizeURL=function(url,base){if(__oni_rt.hostenv==\"nodejs\"&&__oni_rt.G.process.platform==\'win32\'){\n\n\n\nurl=url.replace(/\\\\/g,\"/\");\nbase=base.replace(/\\\\/g,\"/\");\n}\n\nvar a=exports.parseURL(url);\n\n\nif(base&&(base=exports.parseURL(base))&&(!a.protocol||a.protocol==base.protocol)){\n\nif(!a.directory&&!a.protocol){\na.directory=base.directory;\nif(!a.path&&(a.query||a.anchor))a.file=base.file;\n\n}else if(a.directory&&a.directory.charAt(0)!=\'/\'){\n\n\na.directory=(base.directory||\"/\")+a.directory;\n}\nif(!a.protocol){\na.protocol=base.protocol;\nif(!a.authority)a.authority=base.authority;\n\n}\n}\n\n\na.directory=a.directory.replace(/\\/\\/+/g,\'/\');\n\n\nvar pin=a.directory.split(\"/\");\nvar l=pin.length;\nvar pout=[];\nfor(var i=0;i<l;++i){\nvar c=pin[i];\nif(c==\".\")continue;\nif(c==\"..\"){\nif(pout.length>1)pout.pop();\n\n\n}else{\n\npout.push(c);\n}\n}\n\nif(a.file===\'.\')a.file=\'\';else if(a.file===\'..\'){\n\n\nif(pout.length>2){\npout.splice(-2,1);\n}\n\na.file=\'\';\n}\n\na.directory=pout.join(\"/\");\n\n\nvar rv=\"\";\nif(a.protocol)rv+=a.protocol+\":\";\nif(a.authority)rv+=\"//\"+a.authority;else if(a.protocol==\"file\")rv+=\"//\";\n\n\n\nrv+=a.directory+a.file;\nif(a.query)rv+=\"?\"+a.query;\nif(a.anchor)rv+=\"#\"+a.anchor;\nreturn rv;\n};\n\n\n\n\n\n\n\n\n\n\n\n__js exports.jsonp=jsonp_hostenv;\n\n\n\n\n\n\n\n__js exports.getXDomainCaps=getXDomainCaps_hostenv;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js exports.request=request_hostenv;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js if(console){\nfunction filter_console_args(args){var rv=[];\n\nfor(var i=0;i<args.length;++i){\nvar arg=args[i];\n\nif(arg&&arg._oniE){\narg=String(arg);\n}\nrv.push(arg);\n}\nreturn rv;\n}\n\nvar orig_console_log=console.log;\nvar orig_console_info=console.info;\nvar orig_console_warn=console.warn;\nvar orig_console_error=console.error;\n\nconsole.log=function(){return orig_console_log.apply(console,filter_console_args(arguments))};\nconsole.info=function(){return orig_console_info.apply(console,filter_console_args(arguments))};\nconsole.warn=function(){return orig_console_warn.apply(console,filter_console_args(arguments))};\nconsole.error=function(){return orig_console_error.apply(console,filter_console_args(arguments))};\n\n}\n\n\n\n\n\n\n\n\n__js exports.eval=eval_hostenv;\n\n\n\n\n__js var pendingLoads={};\n\n\n\n\nfunction makeRequire(parent){var rf=function(module,settings){\n\n__js var opts=exports.extendObject({},settings);\n\nif(opts.callback){\ntry{\nvar rv=exports.isArrayLike(module)?requireInnerMultiple(module,rf,parent,opts):requireInner(module,rf,parent,opts);\n}catch(e){\nopts.callback(e);return;\n}\nopts.callback(UNDEF,rv);\nreturn;\n}else return exports.isArrayLike(module)?requireInnerMultiple(module,rf,parent,opts):requireInner(module,rf,parent,opts);\n\n\n};\n\n__js {\n\nrf.resolve=function(module,settings){var opts=exports.extendObject({},settings);\n\nreturn resolve(module,rf,parent,opts);\n};\n\nrf.path=\"\";\nrf.alias={};\n\n\nif(exports.require){\nrf.hubs=exports.require.hubs;\nrf.modules=exports.require.modules;\nrf.extensions=exports.require.extensions;\n}else{\n\n\nrf.hubs=augmentHubs(getHubs_hostenv());\nrf.modules={};\n\nrf.extensions=getExtensions_hostenv();\n}\n\n}\n\n\nrf.url=function(relative){return resolve(relative,rf,parent).path;\n\n};\n\nreturn rf;\n}\n__js exports._makeRequire=makeRequire;\n\n__js function augmentHubs(hubs){hubs.addDefault=function(hub){\n\nif(!this.defined(hub[0])){\n\nthis.unshift(hub);\nreturn true;\n}\nreturn false;\n};\nhubs.defined=function(prefix){for(var i=0;i<this.length;i++ ){\n\nvar h=this[i][0];\nvar l=Math.min(h.length,prefix.length);\nif(h.substr(0,l)==prefix.substr(0,l))return true;\n}\nreturn false;\n};\nreturn hubs;\n}\n\n__js function html_sjs_extractor(html,descriptor){var re=/<script (?:[^>]+ )?(?:type=[\'\"]text\\/sjs[\'\"]|main=[\'\"]([^\'\"]+)[\'\"])[^>]*>((.|[\\r\\n])*?)<\\/script>/mg;\n\nvar match;\nvar src=\'\';\nwhile(match=re.exec(html)){\nif(match[1])src+=\'require(\"\'+match[1]+\'\")\';else src+=match[2];\n\nsrc+=\';\';\n}\nif(!src)throw new Error(\"No sjs found in HTML file\");\nreturn default_compiler(src,descriptor);\n}\n\n\n__js function resolveAliases(module,aliases){var ALIAS_REST=/^([^:]+):(.*)$/;\n\nvar alias_rest,alias;\nvar rv=module;\nvar level=10;\nwhile((alias_rest=ALIAS_REST.exec(rv))&&(alias=aliases[alias_rest[1]])){\n\nif(--level==0)throw new Error(\"Too much aliasing in modulename \'\"+module+\"\'\");\n\nrv=alias+alias_rest[2];\n}\nreturn rv;\n}\n\n\n__js function resolveHubs(module,hubs,require_obj,parent,opts){var path=module;\n\nvar loader=opts.loader||default_loader;\nvar src=opts.src||default_src_loader;\nvar resolve=default_resolver;\n\n\nif(path.indexOf(\":\")==-1)path=resolveSchemelessURL_hostenv(path,require_obj,parent);\n\n\nvar level=10;\nfor(var i=0,hub;hub=hubs[i++ ];){\nvar match_prefix=typeof hub[0]===\'string\';\nif((match_prefix&&path.indexOf(hub[0])===0)||(!match_prefix&&hub[0].test(path))){\n\n\nif(typeof hub[1]==\"string\"){\nif(match_prefix)path=hub[1]+path.substring(hub[0].length);else path=path.replace(hub[0],hub[1]);\n\n\n\n\ni=0;\n\nif(path.indexOf(\":\")==-1)path=resolveSchemelessURL_hostenv(path,require_obj,parent);\n\nif(--level==0)throw new Error(\"Too much indirection in hub resolution for module \'\"+module+\"\'\");\n\n}else if(typeof hub[1]==\"object\"){\n\nif(hub[1].src)src=hub[1].src;\nif(hub[1].loader)loader=hub[1].loader;\nresolve=hub[1].resolve||loader.resolve||resolve;\n\nbreak;\n}else throw new Error(\"Unexpected value for require.hubs element \'\"+hub[0]+\"\'\");\n\n\n}\n}\n\nreturn {path:path,loader:loader,src:src,resolve:resolve};\n}\n\n\n__js function default_src_loader(path){throw new Error(\"Don\'t know how to load module at \"+path);\n\n}\n\n\nvar compiled_src_tag=/^\\/\\*\\__oni_compiled_sjs_1\\*\\//;\nfunction default_compiler(src,descriptor){try{\n\nvar f;\nif(typeof (src)===\'function\'){\n\nf=src;\n}else{\n\nif(!compiled_src_tag.exec(src)){\nvar filename=\"#{descriptor.id}\";\nfilename=\"\'#{filename.replace(/\\\'/g,\'\\\\\\\'\')}\'\";\nsrc=__oni_rt.c1.compile(src,{filename:filename,mode:\'normal\',globalReturn:true});\n\n\n}\n\n\nf=new Function(\"module\",\"exports\",\"require\",\"__onimodulename\",\"__oni_altns\",src);\n}\nf(descriptor,descriptor.exports,descriptor.require,\"#{descriptor.id}\",{});\n\n}catch(e){\n\n\n\nif(e instanceof SyntaxError){\nthrow new Error(\"In module #{descriptor.id}: #{e.message}\");\n}else{\n\nthrow e;\n\n}\n}\n}\n\n__js default_compiler.module_args=[\'module\',\'exports\',\'require\',\'__onimodulename\',\'__oni_altns\'];\n\n__js var canonical_id_to_module={};\n\n\n__js {\n\n\n\n\n\n\nfunction checkForDependencyCycles(root_node,target_node){if(!root_node.waiting_on)return false;\n\nfor(var name in root_node.waiting_on){\nif(root_node.waiting_on[name]===target_node){\nreturn [root_node.id];\n}\nvar deeper_cycle=checkForDependencyCycles(root_node.waiting_on[name],target_node);\nif(deeper_cycle)return [root_node.id].concat(deeper_cycle);\n\n}\n\nreturn false;\n}\n\n}\n\nfunction default_loader(path,parent,src_loader,opts,spec){__js var compile=exports.require.extensions[spec.type];\n\n\n\nif(!compile)throw new Error(\"Unknown type \'\"+spec.type+\"\'\");\n\n\n__js var descriptor=exports.require.modules[path];\n__js var pendingHook=pendingLoads[path];\n\nif((!descriptor&&!pendingHook)||opts.reload){\n\n\n\n__js descriptor={id:path,exports:{},loaded_by:parent,required_by:{}};\n\n\n\n\n\n\nexports.spawn(function(S){pendingHook=pendingLoads[path]=S;\n\ntry{\n__js var src,loaded_from;\nif(typeof src_loader===\"string\"){\n__js {\nsrc=src_loader;\nloaded_from=\"[src string]\";\n}\n}else if(path in __oni_rt.modsrc){\n\n__js {\n\nloaded_from=\"[builtin]\";\nsrc=__oni_rt.modsrc[path];\ndelete __oni_rt.modsrc[path];\n\n}\n}else{\n\n({src,loaded_from})=src_loader(path);\n}\n__js {\ndescriptor.loaded_from=loaded_from;\n\ndescriptor.require=makeRequire(descriptor);\n\nvar canonical_id=null;\n\ndescriptor.getCanonicalId=function(){return canonical_id;\n\n};\n\ndescriptor.setCanonicalId=function(id){if(id==null){\n\nthrow new Error(\"Canonical ID cannot be null\");\n}\n\nif(canonical_id!==null){\nthrow new Error(\"Canonical ID is already defined for module \"+path);\n}\n\nvar canonical=canonical_id_to_module[id];\nif(canonical!=null){\nthrow new Error(\"Canonical ID \"+id+\" is already defined in module \"+canonical.id);\n}\n\ncanonical_id=id;\ncanonical_id_to_module[id]=descriptor;\n};\n\nif(opts.main)descriptor.require.main=descriptor;\nexports.require.modules[path]=descriptor;\n}\ntry{\ncompile(src,descriptor);\nreturn;\n}catch(e){\n__js delete exports.require.modules[path];\nthrow e;\n}retract{\n__js delete exports.require.modules[path];\n}\n}catch(e){\n\npendingHook.error=e;\n}\n});\n\npendingHook.pending_descriptor=descriptor;\npendingHook.waiting=0;\n}else if(!descriptor){\n\ndescriptor=pendingHook.pending_descriptor;\n}\n\nif(pendingHook){\n\n\ntry{\n++pendingHook.waiting;\n\n__js {\nif(!parent.waiting_on)parent.waiting_on={};\n\nparent.waiting_on[path]=descriptor;\n}\n\n__js var dep_cycle=checkForDependencyCycles(descriptor,parent);\nif(dep_cycle)throw new Error(\"Cyclic require() dependency: #{parent.id} -> \"+dep_cycle.join(\' -> \'));\n\n\npendingHook.wait();\nif(pendingHook.error)throw pendingHook.error;\n\n__js {\n\n\n\n\n\n\ndelete parent.waiting_on[path];\n}\n}finally{\n\n\nif(--pendingHook.waiting===0){\ndelete pendingLoads[path];\nif(pendingHook.running){\npendingHook.abort().wait();\nif(pendingHook.error)throw pendingHook.error;\n}\n}\n}\n}\n\n__js if(!descriptor.required_by[parent.id])descriptor.required_by[parent.id]=1;else ++descriptor.required_by[parent.id];\n\n\n\n\nreturn descriptor.exports;\n}\n\n__js function default_resolver(spec){if(!spec.ext&&spec.path.charAt(spec.path.length-1)!==\'/\')spec.path+=\".\"+spec.type;\n\n\n};\n\n\nfunction http_src_loader(path){return {src:request_hostenv([path,{format:\'compiled\'}],{mime:\'text/plain\'}),loaded_from:path};\n\n\n\n\n}\nexports.http_src_loader=http_src_loader;\n\n\n\n\n\n__js var github_api=\"https://api.github.com/\";\n__js var github_opts={cbfield:\"callback\"};\nfunction github_src_loader(path){var user,repo,tag;\n\ntry{\n[ ,user,repo,tag,path]=/github:\\/([^\\/]+)\\/([^\\/]+)\\/([^\\/]+)\\/(.+)/.exec(path);\n}catch(e){throw new Error(\"Malformed module id \'\"+path+\"\'\")}\n\nvar url=exports.constructURL(github_api,\'repos\',user,repo,\"contents\",path,{ref:tag});\n\nwaitfor{\nvar data=jsonp_hostenv(url,github_opts).data;\n}or{\n\nhold(10000);\nthrow new Error(\"Github timeout\");\n}\nif(data.message&&!data.content)throw new Error(data.message);\n\n\n\nvar str=exports.require(\'sjs:string\');\n\nreturn {src:str.utf8ToUtf16(str.base64ToOctets(data.content)),loaded_from:url};\n\n\n\n}\n\n\nfunction resolve(module,require_obj,parent,opts){var path=resolveAliases(module,require_obj.alias);\n\n\n\nvar hubs=exports.require.hubs;\n\nvar resolveSpec=resolveHubs(path,hubs,require_obj,parent,opts||{});\n\n\n__js resolveSpec.path=exports.normalizeURL(resolveSpec.path,parent.id);\n\n\n\n__js var ext,extMatch=/.+\\.([^\\.\\/]+)$/.exec(resolveSpec.path);\n__js if(extMatch){\next=extMatch[1].toLowerCase();\nresolveSpec.ext=ext;\nif(!exports.require.extensions[ext])ext=null;\n}\n__js if(!ext){\n\nif(parent.id.substr(-3)===\'.js\')resolveSpec.type=\'js\';else resolveSpec.type=\'sjs\';\n\n\n\n}else resolveSpec.type=ext;\n\n\n\nresolveSpec.resolve(resolveSpec,parent);\n\n__js {\n\nvar preload=__oni_rt.G.__oni_rt_bundle;\nvar pendingHubs=false;\nif(preload.h){\n\nvar deleteHubs=[];\nfor(var k in preload.h){\nif(!Object.prototype.hasOwnProperty.call(preload.h,k))continue;\nvar entries=preload.h[k];\nvar parent=getTopReqParent_hostenv();\nvar resolved=resolveHubs(k,hubs,exports.require,parent,{});\nif(resolved.path===k){\n\npendingHubs=true;\ncontinue;\n}\n\nfor(var i=0;i<entries.length;i++ ){\nvar ent=entries[i];\npreload.m[resolved.path+ent[0]]=ent[1];\n}\ndeleteHubs.push(k);\n}\n\nif(!pendingHubs)delete preload.h;else{\n\n\nfor(var i=0;i<deleteHubs.length;i++ )delete preload.h[deleteHubs[i]];\n\n}\n}\n\nif(module in __oni_rt.modsrc){\n\n\nif(!preload.m)preload.m={};\npreload.m[resolveSpec.path]=__oni_rt.modsrc[module];\ndelete __oni_rt.modsrc[module];\n}\n\nif(preload.m){\nvar path=resolveSpec.path;\n\nif(path.indexOf(\'!sjs\',path.length-4)!==-1)path=path.slice(0,-4);\n\nvar contents=preload.m[path];\nif(contents!==undefined){\nresolveSpec.src=function(){delete preload.m[path];\n\n\nreturn {src:contents,loaded_from:path+\"#bundle\"};\n};\n}\n}\n\n}\nreturn resolveSpec;\n}\n\n\n\n\n\n__js exports.resolve=function(url,require_obj,parent,opts){require_obj=require_obj||exports.require;\n\nparent=parent||getTopReqParent_hostenv();\nopts=opts||{};\nreturn resolve(url,require_obj,parent,opts);\n};\n\n\nfunction requireInner(module,require_obj,parent,opts){var resolveSpec=resolve(module,require_obj,parent,opts);\n\n\n\n\nmodule=resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts,resolveSpec);\n\nreturn module;\n}\n\n\nfunction requireInnerMultiple(modules,require_obj,parent,opts){var rv={};\n\n\n\n\nfunction inner(i,l){if(l===1){\n\nvar descriptor=modules[i];\nvar id,exclude,include,name;\n__js if(typeof descriptor===\'string\'){\nid=descriptor;\nexclude=[];\ninclude=null;\nname=null;\n}else{\n\nid=descriptor.id;\nexclude=descriptor.exclude||[];\ninclude=descriptor.include||null;\nname=descriptor.name||null;\n}\n\nvar module=requireInner(id,require_obj,parent,opts);\n\n\n__js {\nvar addSym=function(k,v){if(rv[k]!==undefined){\n\nif(rv[k]===v)return;\nthrow new Error(\"require([.]) name clash while merging module \'#{id}\': Symbol \'#{k}\' defined in multiple modules\");\n}\nrv[k]=v;\n};\n\nif(name){\naddSym(name,module);\n}else if(include){\nfor(var i=0;i<include.length;i++ ){\nvar o=include[i];\nif(!(o in module))throw new Error(\"require([.]) module #{id} has no symbol #{o}\");\naddSym(o,module[o]);\n}\n}else{\nfor(var o in module){\n\n\n\nif(exclude.indexOf(o)!==-1)continue;\naddSym(o,module[o]);\n}\n}\n}\n}else{\n\nvar split=Math.floor(l/2);\nwaitfor{\ninner(i,split);\n}and{\n\ninner(i+split,l-split);\n}\n}\n}\n\n\nif(modules.length!==0)inner(0,modules.length);\nreturn rv;\n}\n\n\n__js exports.require=makeRequire(getTopReqParent_hostenv());\n\n__js exports.require.modules[\'builtin:apollo-sys.sjs\']={id:\'builtin:apollo-sys.sjs\',exports:exports,loaded_from:\"[builtin]\",required_by:{\"[system]\":1}};\n\n\n\n\n\n\nexports.init=function(cb){init_hostenv();\n\ncb();\n};\n\n\n\n\n\n\n\n\nfunction runGlobalStratum(r){r.stratum=reifiedStratum;\n\ntry{hold()}finally{\n\n\nhold(0);\n}\n}\n\nexports.spawn=function(f){var r={};\n\n\nvar dynvars=__oni_rt.current_dyn_vars;\n__oni_rt.current_dyn_vars=__oni_rt.root_dyn_vars;\n__js runGlobalStratum(r),null;\n\n\n__oni_rt.current_dyn_vars=dynvars;\nreturn r.stratum.spawn(f);\n};\n\n\n\n\nexports.captureStratum=function(S){reifiedStratum.adopt(S);\n\nreifiedStratum.join();\n};\n\n";__oni_rt.modsrc['builtin:apollo-sys-nodejs.sjs']="var isWindows=process.platform===\'win32\';\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js var pathMod=(function(){var np=__oni_rt.nodejs_require(\'path\');\n\nvar sep=np.sep||(isWindows?\'\\\\\':\'/\');\nreturn {join:np.join,resolve:function(p){\n\nvar result=np.resolve.apply(this,arguments);\n\n\nif(/[\\\\\\/]$/.test(p))result+=sep;\nreturn result;\n}};\n\n})();\n\n__js var pathToFileUrl=exports.pathToFileUrl=function(path){var initialPath=path;\n\nvar prefix=\'file://\';\npath=pathMod.resolve(path);\nif(isWindows){\npath=path.replace(/\\\\/g,\'/\');\nif(path.lastIndexOf(\'//\',0)===0)prefix=\'file:\';else prefix=\'file:///\';\n\n\n\n\n}\n\n\nreturn prefix+encodeURIComponent(path).replace(/%(2f|3a)/gi,unescape);\n};\n\n__js var fileUrlToPath=exports.fileUrlToPath=function(url){var parsed=exports.parseURL(url);\n\nif(parsed.protocol.toLowerCase()!=\'file\'){\nthrow new Error(\"Not a file:// URL: #{url}\");\n}\nvar path=parsed.path;\n\nif(parsed.host===\'localhost\')parsed.host=\'\';\nif(isWindows){\npath=path.replace(/\\//g,\'\\\\\');\nif(parsed.host){\n\npath=\'\\\\\\\\\'+pathMod.join(parsed.host,path);\n}else{\n\n\npath=path.replace(/^\\\\/,\'\');\n}\n}else{\nif(parsed.host){\n\npath=pathMod.join(parsed.host,path);\n}\n}\nreturn decodeURIComponent(path);\n};\n\n__js var coerceToURL=exports.coerceToURL=function(path){if(path.indexOf(\':\',2)!==-1)return path;\n\n\n\n\nreturn pathToFileUrl(path);\n};\n\n\n\n\n\n\n\n\n\n\n\n\nfunction jsonp_hostenv(url,settings){var opts=exports.mergeObjects({cbfield:\"callback\",forcecb:\"jsonp\"},settings);\n\n\n\n\n\n\n\nvar query={};\nquery[opts.cbfield]=opts.forcecb;\n\nvar parser=/^[^{]*({[^]+})[^}]*$/;\nvar data=parser.exec(request_hostenv([url,opts.query,query]));\n\n\n\n\ndata[1]=data[1].replace(/([^\\\\])\\\\x/g,\"$1\\\\u00\");\n\ntry{\nreturn JSON.parse(data[1]);\n}catch(e){\n\nthrow new Error(\"Invalid jsonp response from \"+exports.constructURL(url)+\" (\"+e+\")\");\n}\n}\n\n\n\n\n\n\nfunction getXDomainCaps_hostenv(){return \"*\";\n\n}\n\n\n\n\n\nvar req_base_descr;\nfunction getTopReqParent_hostenv(){if(!req_base_descr){\n\nvar base=pathToFileUrl(process.mainModule.filename);\nreq_base_descr={id:base,loaded_from:base,required_by:{\"[system]\":1}};\n\n\n\n\n}\nreturn req_base_descr;\n}\n\n\n\n\n\n\n\n\n\nfunction resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(/^\\.\\.?\\//.test(url_string))return exports.normalizeURL(url_string,parent.id);else if(!isWindows&&/^\\//.test(url_string))throw new Error(\"Absolute path passed to require.resolve: #{url_string}\");\n\n\n\n\n\n\n\nreturn \"nodejs:\"+url_string;\n}\n\n\n\n\n\n\nvar streamContents=exports.streamContents=function(stream,fn){var rv;\n\nvar chunk=null;\nvar ended=false;\nvar emitting=false;\nif(!fn){\nrv=[];\nfn=rv.push.bind(rv);\n}\nif(stream.readable===false)return rv;\n\n\nstream.pause();\n\nwaitfor{\nwaitfor(var exception){\nstream.on(\'error\',resume);\nstream.on(\'end\',resume);\n}finally{\n\nstream.removeListener(\'error\',resume);\nstream.removeListener(\'end\',resume);\n}\nif(exception)throw exception;\nif(emitting){\n\n\nended=true;\nhold();\n}\n}or{\nwhile(1){\nif(chunk===null){\nif(ended)break;\n\nwaitfor(){\nstream.on(\'readable\',resume);\n}finally{\n\nstream.removeListener(\'readable\',resume);\n}\n}\n__js chunk=stream.read();\nif(chunk===null){\ncontinue;\n}\nemitting=true;\nfn(chunk);\nemitting=false;\n}\n}\nreturn rv;\n};\n\n\n\n\n\nfunction request_hostenv(url,settings){__js {\n\nvar opts=exports.mergeObjects({method:\"GET\",headers:{},throwing:true,max_redirects:5},settings);\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar pop=function(k){var rv=opts[k];\n\ndelete opts[k];\nreturn rv;\n};\nvar responseMode=pop(\'response\')||\'string\';\nvar body=pop(\'body\');\nvar throwing=pop(\'throwing\');\nvar max_redirects=pop(\'max_redirects\');\nvar username=pop(\'username\');\nvar password=pop(\'password\');\nvar query=pop(\'query\');\n\nvar url_string=exports.constructURL(url,query);\n\n\n\nvar url=exports.parseURL(url_string);\nvar protocol=url.protocol;\n\nif(url.host==\'unix\'){\n\nvar unix_parts=url.relative.split(\':\');\nopts.socketPath=unix_parts[0];\nopts.path=unix_parts[1];\n}else{\n\nopts.host=url.host;\nopts.port=url.port||(protocol===\'https\'?443:80);\nopts.path=url.relative||\'/\';\n}\n\nif(!opts.headers[\'Host\'])opts.headers.Host=url.authority;\n\n\nif(!opts.headers[\'User-Agent\'])opts.headers[\'User-Agent\']=\"Oni Labs StratifiedJS engine\";\n\n\nif(body&&!opts.headers[\'Transfer-Encoding\']){\n\n\n\nbody=Buffer.from(body);\nopts.headers[\'Content-Length\']=body.length;\n}else{\n\nopts.headers[\'Content-Length\']=0;\n}\nif(username!=null&&password!=null)opts.auth=username+\":\"+password;\n\n\n}\n\nif(!(protocol===\'http\'||protocol===\'https\')){\nthrow new Error(\'Unsupported protocol: \'+protocol);\n}\n\nvar request=__oni_rt.nodejs_require(protocol).request(opts);\nrequest.end(body);\n\nwaitfor{\nwaitfor(var err){\nrequest.on(\'error\',resume);\n}finally{\n\nrequest.removeListener(\'error\',resume);\n}\nif(throwing){\nerr.request=request;\nerr.response=null;\nerr.status=0;\nthrow new Error(err);\n}else if(responseMode===\'string\'){\n\nreturn \'\';\n}else if(responseMode===\'full\'){\n\nreturn {status:0,content:\'\'};\n\n\n\n}else if(responseMode===\'arraybuffer\'){\n\nreturn {status:0,content:new ArrayBuffer()};\n\n\n\n}else{\n\n\n\nreturn {readable:false,statusCode:0,error:String(err)};\n\n\n\n\n}\n}or{\n\nwaitfor(var response){\nrequest.on(\'response\',resume);\n}finally{\n\nrequest.removeListener(\'response\',resume);\n}\n}retract{\n\n\n\nrequest.on(\'error\',function(){});\nrequest.abort();\n}\n\nif(response.statusCode<200||response.statusCode>=300){\nswitch(response.statusCode){case 300:\ncase 301:case 302:case 303:case 307:\nif(max_redirects>0){\nresponse.socket.end();\n\n\n\n\nvar redirect_url=exports.normalizeURL(response.headers[\'location\'],url_string);\n\nif(url.host==\'unix\'){\n\n\nredirect_url=redirect_url.replace(\'unix:\',\'unix:\'+opts.socketPath+\':\');\n}\n\nopts=exports.mergeObjects(settings,{headers:exports.mergeObjects(settings,{host:null}),max_redirects:max_redirects-1});\n\n\n\n\nreturn request_hostenv(redirect_url,opts);\n\n\n}\n\ndefault:\nif(throwing){\nvar txt=\"Failed \"+opts.method+\" request to \'\"+url_string+\"\'\";\ntxt+=\" (\"+response.statusCode+\")\";\nvar err=new Error(txt);\n\nerr.status=response.statusCode;\nerr.request=request;\nerr.response=response;\n\nresponse.setEncoding(\'utf8\');\nresponse.data=streamContents(response).join(\'\');\nerr.data=response.data;\nthrow err;\n}else if(responseMode===\'string\'){\n\nresponse.resume();\nreturn \"\";\n}\n\n}\n}\n\nif(responseMode===\'raw\'){\n\n\n\nrequest.on(\'error\',function(){});\nreturn response;\n}else if(responseMode===\'arraybuffer\'){\n\n\n\nvar buf=Buffer.concat(streamContents(response));\n\n\n__js {\nvar array_buf=new ArrayBuffer(buf.length);\nvar view=new Uint8Array(array_buf);\nfor(var i=0,l=buf.length;i<l;++i){\nview[i]=buf[i];\n}\n}\n\nreturn {status:response.statusCode,content:array_buf,getHeader:name->response.headers[name.toLowerCase()]};\n\n\n\n\n}else{\n\n\nresponse.setEncoding(\'utf8\');\nresponse.data=streamContents(response).join(\'\');\n\nif(responseMode===\'string\')return response.data;else{\n\n\n\nreturn {status:response.statusCode,content:response.data,getHeader:name->response.headers[name.toLowerCase()]};\n\n\n\n\n}\n}\n};\n\nfunction file_src_loader(path){waitfor(var err,data){\n\n\n__oni_rt.nodejs_require(\'fs\').readFile(fileUrlToPath(path),resume);\n}\nif(err)throw err;\nreturn {src:data.toString(),loaded_from:path};\n}\n\nfunction resolve_file_url(spec){if(!spec.ext){\n\nvar ext=\".\"+spec.type;\nvar path=fileUrlToPath(spec.path);\n\nwaitfor(var err){\n__oni_rt.nodejs_require(\'fs\').lstat(path+ext,resume);\n}\nif(!err)spec.path+=ext;\n}\n}\n\n\nfunction nodejs_loader(path,parent,dummy_src,opts,spec){if(spec.type==\'js\'){\n\nreturn __oni_rt.nodejs_require(path);\n}\nreturn default_loader(pathToFileUrl(path),parent,file_src_loader,opts,spec);\n}\n\n__js nodejs_loader.resolve=function resolve_nodejs(spec,parent){var module_path=spec.path.substr(7);\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar resolve_base=(parent||getTopReqParent_hostenv()).id..fileUrlToPath;\n\nfunction tryResolve(module_path){try{\n\nvar resolved=__oni_rt.nodejs_require.resolve(module_path,{paths:[resolve_base]});\nspec.path=resolved;\nreturn true;\n}catch(e){\nreturn false;\n}\n};\n\nvar ok=tryResolve(module_path);\nif(!spec.ext){\nif(ok){\nspec.type=\'js\';\n}else{\n\nok=tryResolve(module_path+\".\"+spec.type);\n}\n}\n\nif(!ok)throw new Error(\"nodejs module at \'\"+module_path+\"\' not found\");\n};\n\n\nfunction getHubs_hostenv(){return [[\"sjs:\",pathToFileUrl(__oni_rt.nodejs_sjs_lib_dir)],[\"github:\",{src:github_src_loader}],[\"http:\",{src:http_src_loader}],[\"https:\",{src:http_src_loader}],[\"file:\",{src:file_src_loader,resolve:resolve_file_url}],[\"nodejs:\",{loader:nodejs_loader}]];\n\n\n\n\n\n\n\n\n}\n\nfunction js_loader(src,descriptor){var ctx=Object.create(global);\n\n\nctx.module=descriptor;\nctx.exports=descriptor.exports;\nctx.require=descriptor.require;\nvar vm=__oni_rt.nodejs_require(\"vm\");\nctx=vm.createContext(ctx);\nvm.runInContext(src,ctx,descriptor.id);\n};\n\nfunction getExtensions_hostenv(){return {\'sjs\':default_compiler,\'api\':default_compiler,\'mho\':default_compiler,\'js\':js_loader,\'html\':html_sjs_extractor};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n}\n\n\n\n\nfunction eval_hostenv(code,settings){var filename=(settings&&settings.filename)||\"sjs_eval_code\";\n\nfilename=\"\'#{filename.replace(/\\\'/g,\'\\\\\\\'\')}\'\";\nvar mode=(settings&&settings.mode)||\"normal\";\nvar js=__oni_rt.c1.compile(code,{filename:filename,mode:mode});\nreturn __oni_rt.G.eval(js);\n}\n\n\n\n\n\nvar _sjs_initialized=false;\nfunction init_hostenv(){if(_sjs_initialized)return;\n\n\n_sjs_initialized=true;\n\nvar init_path=process.env[\'SJS_INIT\'];\nif(init_path){\nvar node_fs=__oni_rt.nodejs_require(\'fs\');\nvar files=init_path.split(isWindows?\';\':\':\');\nfor(var i=0;i<files.length;i++ ){\nvar path=files[i];\nif(!path)continue;\ntry{\nexports.require(pathToFileUrl(path));\n}catch(e){\nconsole.error(\"Error loading init script at \"+path+\": \"+e);\nthrow e;\n}\n}\n}\n};\n\nexports.runMainExpression=function(ef){if(!__oni_rt.is_ef(ef))return ef;\n\n\n\n\nvar sig,signame;\n\n\n\n\n\n\nvar dummy_handler,noop;\nif(process.platform===\'win32\'){\nnoop=function(){};\ndummy_handler=function(){console.error(\'[SIGBREAK caught; killing process immediately due to libuv bug]\');\n\nprocess.exit(1);\n};\n}\n\nvar await=function(evt){waitfor(){\n\nprocess.on(evt,resume);\n}finally{\nprocess.removeListener(evt,resume);\nif(dummy_handler&&evt.lastIndexOf(\'SIG\',0)===0){\nprocess.on(\"SIGBREAK\",dummy_handler);\ndummy_handler=noop;\n}\n}\n};\n\nwaitfor{\ntry{\nef.wait();\n}catch(e){\ne=String(e).replace(/^Error: Cannot load module/,\"Error executing\");\ne=e.replace(/\\(in apollo-sys-common.sjs:\\d+\\)$/,\"\");\nconsole.error(e);\nprocess.exit(1);\n}\n}or{\nawait(\'SIGINT\');\nsig=2;\nsigname=\'SIGINT\';\n}or{\nawait(\'SIGHUP\');\nsig=1;\nsigname=\'SIGHUP\';\n}or{\nawait(\'SIGTERM\');\nsig=15;\nsigname=\'SIGTERM\';\n}or{\n\nawait(\'exit\');\n}\n\nif(sig){\nprocess.kill(process.pid,signame);\n\nhold(0);\n\n\n\n\n\nprocess.exit(128+sig);\n}\n};\n\n";var rt=global.__oni_rt;








































var path=require('path');
var fs=require('fs');

global.__oni_rt.nodejs_require=require;
global.__oni_rt.nodejs_sjs_lib_dir=path.join(path.dirname(fs.realpathSync(__filename)),'modules/');

var sys=rt.G.eval("(function(exports) {"+rt.c1.compile(rt.modsrc['builtin:apollo-sys-'+rt.hostenv+'.sjs'],{filename:"'apollo-sys-"+rt.hostenv+".sjs'"})+"\n"+rt.c1.compile(rt.modsrc['builtin:apollo-sys-common.sjs'],{filename:"'apollo-sys-common.sjs'"})+"\n"+"})");









sys(exports);

delete rt.modsrc['builtin:apollo-sys-common.sjs'];
delete rt.modsrc['builtin:apollo-sys-'+rt.hostenv+'.sjs'];


exports.run=function(url){exports.init(function(){
url=exports.coerceToURL(url);

var main=exports.require(url,{main:true});
exports.runMainExpression(main);
});
};




process.on('uncaughtException',function(error){console.error('Uncaught: '+error.toString());

if(error.stack){
console.log(error.stack);
}
if(process.listeners('uncaughtException').length==1){

process.kill(process.pid,'SIGINT');
}
});


