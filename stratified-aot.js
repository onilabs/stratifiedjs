/*
 * Oni StratifiedJS Runtime
 * Client-side Cross-Browser implementation
 *
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2010-2022 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
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
var __oni_rt={};(function(exports){var UNDEF;

























































function dummy(){}





var random64;
exports.G=window;
exports.VMID="X";
var bytes=new Uint8Array(8);
window.crypto.getRandomValues(bytes);
random64=window.btoa(String.fromCharCode(...bytes));
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







if(uncaught&&this.val!=null&&this.val.__oni_stack){
var handler=window.onerror;
var handled=false;
var msg=this.val.toString();

if(handler){


handled=handler.call(window,msg,"",0,0,this.val);





}
if(!handled){
if(console){
if(console.error)console.error(msg);else console.log(msg);

}
}
}else throw this.val;


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
}else if((UA!=="msie")&&!testIsFunction(this.l[0][this.l[1]])){













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
}else if((UA!=="msie")&&!testIsFunction(this.l[0][this.l[1]])){













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

exports.DFunc=function(code,context){var bound=exports.sys.DFuncThunk.bind({code:code,context:context});

bound.code=code;
bound.context=context;
bound.__oni_is_dfunc=true;
return bound;
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



var UA=navigator.userAgent.toLowerCase();
if(UA.indexOf(" chrome/")>=0)UA="chrome";else if(UA.indexOf(" firefox/")>=0)UA="firefox";else if(UA.indexOf(" safari/")>=0)UA="safari";else if(UA.indexOf(" msie ")>=0)UA="msie";else UA="unknown";









exports.hostenv="xbrowser";
exports.UA=UA;


exports.modules={};exports.modsrc={};})(__oni_rt);if(!Array.isArray){

















































































Array.isArray=function(o){return Object.prototype.toString.call(o)==='[object Array]';

};
}


if(!Array.prototype.indexOf){
Array.prototype.indexOf=function(val){var len=this.length>>>0;

var i=Math.floor(arguments[1]||0);
if(i<0)i=Math.max(len-Math.abs(i),0);

for(;i<len;++i){
if(i in this&&this[i]===val)return i;

}
return -1;
};
}


if(!Array.prototype.lastIndexOf){
Array.prototype.lastIndexOf=function(val){var len=this.length>>>0;

var i=arguments[1]===undefined?len:Math.floor(arguments[1]);
if(i>=0)i=Math.min(i,len-1);else i+=len;




for(;i>=0;--i){
if(i in this&&this[i]===val)return i;

}
return -1;
};
}


if(!Object.create){


Object.create=function create(p){function Cls(){
};
Cls.prototype=p;
return new Cls();
};
}


if(!Object.keys){




Object.keys=function(o){var rv=[],p;

for(p in o)if(Object.prototype.hasOwnProperty.call(o,p))rv.push(p);


return rv;
};
}


if(!Object.getPrototypeOf){
Object.getPrototypeOf="".__proto__===String.prototype?function(object){
return object.__proto__;

}:function(object){
return object.constructor.prototype;


};
}


if(!Function.prototype.bind){




Function.prototype.bind=function(obj){var slice=[].slice,args=slice.call(arguments,1),self=this,nop=function(){



},bound=function(){
var subject=(obj||{});

try{
if(this instanceof nop)subject=this;
}catch(e){}
return self.apply(subject,args.concat(slice.call(arguments)));
};


nop.prototype=self.prototype;
bound.prototype=new nop();
return bound;
};
}


if(!String.prototype.trim){
String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,'');

};
}







(function(exports) {var UNDEF,arrayCtors,arrayCtorNames,c,i,_flatten,parseURLOptions,orig_console_log,orig_console_info,orig_console_warn,orig_console_error,pendingLoads,compiled_src_tag,canonical_id_to_module,github_api,github_opts;function URI(){}function filter_console_args(args){var rv,arg,i;rv=[];i=0;for(;i < args.length;++ i){arg=args[i];if(arg && arg._oniE){arg=String(arg);}rv.push(arg);}return rv;}function makeRequire(parent){var rf;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rf=function (module,settings){var opts,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){opts=exports.extendObject({},settings);},720),__oni_rt.Nb(function(){if(opts.callback)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Try(0,__oni_rt.Sc(723,function(_oniX){return rv=_oniX;},__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},722),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},722),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},722))),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return opts.callback(e)},724),__oni_rt.Nb(function(){return __oni_rt.Return();},724)),__oni_env)},0),__oni_rt.C(function(){return opts.callback(UNDEF,rv)},726),__oni_rt.Nb(function(){return __oni_rt.Return();},727)),this);else return __oni_rt.ex(__oni_rt.Sc(730,__oni_rt.Return,__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},730),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},730),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},730))),this);},720)])};rf.resolve=function (module,settings){var opts;opts=exports.extendObject({},settings);return resolve(module,rf,parent,opts);};rf.path="";rf.alias={};if(exports.require){rf.hubs=exports.require.hubs;rf.modules=exports.require.modules;rf.extensions=exports.require.extensions;}else{rf.hubs=augmentHubs(getHubs_hostenv());rf.modules={};rf.extensions=getExtensions_hostenv();}rf.url=function (relative){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(761,__oni_rt.Return,__oni_rt.Sc(761,(l)=>l.path,__oni_rt.C(function(){return resolve(relative,rf,parent)},761)))])};return __oni_rt.Return(rf);},733)])}function augmentHubs(hubs){hubs.addDefault=function (hub){if(! this.defined(hub[0])){this.unshift(hub);return true;}return false;};hubs.defined=function (prefix){var h,l,i;i=0;for(;i < this.length;i++ ){h=this[i][0];l=Math.min(h.length,prefix.length);if(h.substr(0,l) == prefix.substr(0,l)){return true;}}return false;};return hubs;}function html_sjs_extractor(html,descriptor){var re,match,src;re=/<script (?:[^>]+ )?(?:type=['"]text\/sjs['"]|main=['"]([^'"]+)['"])[^>]*>((.|[\r\n])*?)<\/script>/mg;src='';while(match=re.exec(html)){if(match[1]){src+='require("' + match[1] + '")';}else{src+=match[2];}src+=';';}if(! src){throw new Error("No sjs found in HTML file");}return default_compiler(src,descriptor);}function resolveAliases(module,aliases){var ALIAS_REST,alias_rest,alias,rv,level;ALIAS_REST=/^([^:]+):(.*)$/;rv=module;level=10;while((alias_rest=ALIAS_REST.exec(rv)) && (alias=aliases[alias_rest[1]])){if(-- level == 0){throw new Error("Too much aliasing in modulename '" + module + "'");}rv=alias + alias_rest[2];}return rv;}function resolveHubs(module,hubs,require_obj,parent,opts){var path,loader,src,resolve,level,match_prefix,i,hub;path=module;loader=opts.loader || default_loader;src=opts.src || default_src_loader;resolve=default_resolver;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}level=10;i=0;while(hub=hubs[i++ ]){match_prefix=typeof hub[0] === 'string';if((match_prefix && path.indexOf(hub[0]) === 0) || (! match_prefix && hub[0].test(path))){if(typeof hub[1] == "string"){if(match_prefix){path=hub[1] + path.substring(hub[0].length);}else{path=path.replace(hub[0],hub[1]);}i=0;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}if(-- level == 0){throw new Error("Too much indirection in hub resolution for module '" + module + "'");}}else{if(typeof hub[1] == "object"){if(hub[1].src){src=hub[1].src;}if(hub[1].loader){loader=hub[1].loader;}resolve=hub[1].resolve || loader.resolve || resolve;break;}else{throw new Error("Unexpected value for require.hubs element '" + hub[0] + "'");}}}}return {path:path,loader:loader,src:src,resolve:resolve};}function default_src_loader(path){throw new Error("Don't know how to load module at " + path);}function default_compiler(src,descriptor){var f,filename;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof (src) === 'function')return __oni_rt.ex(__oni_rt.Nb(function(){return f=src;},873),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.If(__oni_rt.Sc(876,(r)=>! r,__oni_rt.C(function(){return compiled_src_tag.exec(src)},876)),__oni_rt.Seq(0,__oni_rt.Nb(function(){filename=((descriptor.id));},878),__oni_rt.Sc(878,function(_oniX){return filename=_oniX;},__oni_rt.Sc(878,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},878),"'")),__oni_rt.Sc(881,function(_oniX){return src=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(src,{filename:filename,mode:'normal',globalReturn:true})},880)))),__oni_rt.Sc(885,function(_oniX){return f=_oniX;},__oni_rt.Fcall(2,885,__oni_rt.Nb(function(){return Function},885),"module","exports","require","__onimodulename","__oni_altns",__oni_rt.Nb(function(){return src},885)))),this);},871),__oni_rt.C(function(){return f(descriptor,descriptor.exports,descriptor.require,((descriptor.id)),{})},887)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Nb(function(){if(e instanceof SyntaxError)return __oni_rt.ex(__oni_rt.Sc(894,__oni_rt.Throw,__oni_rt.Fcall(2,894,__oni_rt.Nb(function(){return Error},894),__oni_rt.Nb(function(){return ("In module "+(descriptor.id)+": "+(e.message))},894)),894,'apollo-sys-common.sjs'),this);else return __oni_rt.ex(__oni_rt.Sc(897,__oni_rt.Throw,__oni_rt.Nb(function(){return e},897),897,'apollo-sys-common.sjs'),this);},893),__oni_env)},0)])}function checkForDependencyCycles(root_node,target_node){var deeper_cycle,name;if(! root_node.waiting_on){return false;}for(name in root_node.waiting_on){if(root_node.waiting_on[name] === target_node){return [root_node.id];}deeper_cycle=checkForDependencyCycles(root_node.waiting_on[name],target_node);if(deeper_cycle){return [root_node.id].concat(deeper_cycle);}}return false;}function default_loader(path,parent,src_loader,opts,spec){var compile,descriptor,pendingHook,dep_cycle;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){compile=exports.require.extensions[spec.type];},935),__oni_rt.Nb(function(){if(! compile)return __oni_rt.ex(__oni_rt.Sc(936,__oni_rt.Throw,__oni_rt.Fcall(2,936,__oni_rt.Nb(function(){return Error},936),__oni_rt.Nb(function(){return "Unknown type '" + spec.type + "'"},936)),936,'apollo-sys-common.sjs'),this);},935),__oni_rt.Nb(function(){descriptor=exports.require.modules[path];pendingHook=pendingLoads[path];},939),__oni_rt.Nb(function(){if((! descriptor && ! pendingHook) || opts.reload)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return descriptor={id:path,exports:{},loaded_by:parent,required_by:{}};},950),__oni_rt.C(function(){return exports.spawn(function (S){var src,loaded_from,canonical_id;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){return pendingHook=pendingLoads[path]=S;},953),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof src_loader === "string")return __oni_rt.ex(__oni_rt.Nb(function(){src=src_loader;loaded_from="[src string]";},0),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(path in __oni_rt.modsrc)return __oni_rt.ex(__oni_rt.Nb(function(){loaded_from="[builtin]";src=__oni_rt.modsrc[path];delete __oni_rt.modsrc[path];},0),this);else return __oni_rt.ex(__oni_rt.Sc(972,function(_oniX){src=_oniX.src;loaded_from=_oniX.loaded_from;return _oniX;},__oni_rt.C(function(){return src_loader(path)},972)),this);},962),this);},956),__oni_rt.Nb(function(){descriptor.loaded_from=loaded_from;descriptor.require=makeRequire(descriptor);canonical_id=null;descriptor.getCanonicalId=function (){return canonical_id;};descriptor.setCanonicalId=function (id){var canonical;if(id == null){throw new Error("Canonical ID cannot be null");}if(canonical_id !== null){throw new Error("Canonical ID is already defined for module " + path);}canonical=canonical_id_to_module[id];if(canonical != null){throw new Error("Canonical ID " + id + " is already defined in module " + canonical.id);}canonical_id=id;canonical_id_to_module[id]=descriptor;};if(opts.main){descriptor.require.main=descriptor;}exports.require.modules[path]=descriptor;},0),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.C(function(){return compile(src,descriptor)},1007),__oni_rt.Nb(function(){return __oni_rt.Return();},1008)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},1010),__oni_rt.Sc(1011,__oni_rt.Throw,__oni_rt.Nb(function(){return e},1011),1011,'apollo-sys-common.sjs')),__oni_env)},0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},1013))),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Nb(function(){return pendingHook.error=e;},1017),__oni_env)},0)])})},952),__oni_rt.Nb(function(){pendingHook.pending_descriptor=descriptor;return pendingHook.waiting=0;},1021)),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(! descriptor)return __oni_rt.ex(__oni_rt.Nb(function(){return descriptor=pendingHook.pending_descriptor;},1025),this);},1024),this);},941),__oni_rt.Nb(function(){if(pendingHook)return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){++ pendingHook.waiting;if(! parent.waiting_on){parent.waiting_on={};}parent.waiting_on[path]=descriptor;dep_cycle=checkForDependencyCycles(descriptor,parent);},1032),__oni_rt.Nb(function(){if(dep_cycle)return __oni_rt.ex(__oni_rt.Sc(1042,__oni_rt.Throw,__oni_rt.Fcall(2,1042,__oni_rt.Nb(function(){return Error},1042),__oni_rt.Sc(1042,__oni_rt.infix['+'],__oni_rt.Nb(function(){return ("Cyclic require() dependency: "+(parent.id)+" -> ")},1042),__oni_rt.C(function(){return dep_cycle.join(' -> ')},1042))),1042,'apollo-sys-common.sjs'),this);},1041),__oni_rt.C(function(){return pendingHook.wait()},1044),__oni_rt.Nb(function(){if(pendingHook.error)return __oni_rt.ex(__oni_rt.Sc(1045,__oni_rt.Throw,__oni_rt.Nb(function(){return pendingHook.error},1045),1045,'apollo-sys-common.sjs'),this);},1045),__oni_rt.Nb(function(){return delete parent.waiting_on[path];},1054)),0,__oni_rt.Nb(function(){if(-- pendingHook.waiting === 0)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return delete pendingLoads[path];},1060),__oni_rt.Nb(function(){if(pendingHook.running)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Fcall(1,1062,__oni_rt.Sc(1062,(l)=>[l,'wait'],__oni_rt.C(function(){return pendingHook.abort()},1062))),__oni_rt.Nb(function(){if(pendingHook.error)return __oni_rt.ex(__oni_rt.Sc(1063,__oni_rt.Throw,__oni_rt.Nb(function(){return pendingHook.error},1063),1063,'apollo-sys-common.sjs'),this);},1063)),this);},1061)),this);},1059)),this);},1028),__oni_rt.Nb(function(){if(! descriptor.required_by[parent.id]){descriptor.required_by[parent.id]=1;}else{++ descriptor.required_by[parent.id];}return __oni_rt.Return(descriptor.exports);},1069)])}function default_resolver(spec){if(! spec.ext && spec.path.charAt(spec.path.length - 1) !== '/'){spec.path+="." + spec.type;}}function http_src_loader(path){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1087,__oni_rt.Return,__oni_rt.Sc(1087,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.C(function(){return request_hostenv([path,{format:'compiled'}],{mime:'text/plain'})},1085),__oni_rt.Nb(function(){return path},1087)))])}function github_src_loader(path){var user,repo,tag,url,data,str;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Sc(1100,function(_oniX){user=_oniX[1];repo=_oniX[2];tag=_oniX[3];path=_oniX[4];return _oniX;},__oni_rt.C(function(){return /github:\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path)},1100)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Sc(1101,__oni_rt.Throw,__oni_rt.Fcall(2,1101,__oni_rt.Nb(function(){return Error},1101),__oni_rt.Nb(function(){return "Malformed module id '" + path + "'"},1101)),1101,'apollo-sys-common.sjs'),__oni_env)},0),__oni_rt.Sc(1105,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(github_api,'repos',user,repo,"contents",path,{ref:tag})},1103)),__oni_rt.Alt(__oni_rt.Sc(1107,function(_oniX){return data=_oniX;},__oni_rt.Sc(1106,(l)=>l.data,__oni_rt.C(function(){return jsonp_hostenv(url,github_opts)},1106))),__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(10000)},1109),__oni_rt.Sc(1110,__oni_rt.Throw,__oni_rt.Fcall(2,1110,__oni_rt.Nb(function(){return Error},1110),"Github timeout"),1110,'apollo-sys-common.sjs'))),__oni_rt.Nb(function(){if(data.message && ! data.content)return __oni_rt.ex(__oni_rt.Sc(1113,__oni_rt.Throw,__oni_rt.Fcall(2,1113,__oni_rt.Nb(function(){return Error},1113),__oni_rt.Nb(function(){return data.message},1113)),1113,'apollo-sys-common.sjs'),this);},1112),__oni_rt.Sc(1118,function(_oniX){return str=_oniX;},__oni_rt.C(function(){return exports.require('sjs:string')},1116)),__oni_rt.Sc(1121,__oni_rt.Return,__oni_rt.Sc(1121,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.Fcall(1,1119,__oni_rt.Nb(function() { return [str,'utf8ToUtf16']},1119),__oni_rt.C(function(){return str.base64ToOctets(data.content)},1119)),__oni_rt.Nb(function(){return url},1121)))])}function resolve(module,require_obj,parent,opts){var path,hubs,resolveSpec,ext,extMatch,preload,pendingHubs,deleteHubs,entries,parent,resolved,ent,i,k,i,path,contents;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1129,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveAliases(module,require_obj.alias)},1127)),__oni_rt.Nb(function(){hubs=exports.require.hubs;},1131),__oni_rt.Sc(1134,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolveHubs(path,hubs,require_obj,parent,opts || {})},1131)),__oni_rt.Nb(function(){resolveSpec.path=exports.normalizeURL(resolveSpec.path,parent.id);extMatch=/.+\.([^\.\/]+)$/.exec(resolveSpec.path);if(extMatch){ext=extMatch[1].toLowerCase();resolveSpec.ext=ext;if(! exports.require.extensions[ext]){ext=null;}}if(! ext){if(parent.id.substr(- 3) === '.js'){resolveSpec.type='js';}else{resolveSpec.type='sjs';}}else{resolveSpec.type=ext;}},1134),__oni_rt.C(function(){return resolveSpec.resolve(resolveSpec,parent)},1154),__oni_rt.Nb(function(){preload=__oni_rt.G.__oni_rt_bundle;pendingHubs=false;if(preload.h){deleteHubs=[];for(k in preload.h){if(! Object.prototype.hasOwnProperty.call(preload.h,k)){continue;}entries=preload.h[k];parent=getTopReqParent_hostenv();resolved=resolveHubs(k,hubs,exports.require,parent,{});if(resolved.path === k){pendingHubs=true;continue;}i=0;for(;i < entries.length;i++ ){ent=entries[i];preload.m[resolved.path + ent[0]]=ent[1];}deleteHubs.push(k);}if(! pendingHubs){delete preload.h;}else{i=0;for(;i < deleteHubs.length;i++ ){delete preload.h[deleteHubs[i]];}}}if(module in __oni_rt.modsrc){if(! preload.m){preload.m={};}preload.m[resolveSpec.path]=__oni_rt.modsrc[module];delete __oni_rt.modsrc[module];}if(preload.m){path=resolveSpec.path;if(path.indexOf('!sjs',path.length - 4) !== - 1){path=path.slice(0,- 4);}contents=preload.m[path];if(contents !== undefined){resolveSpec.src=function (){delete preload.m[path];return {src:contents,loaded_from:path + "#bundle"};};}}return __oni_rt.Return(resolveSpec);},0)])}function requireInner(module,require_obj,parent,opts){var resolveSpec;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1233,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolve(module,require_obj,parent,opts)},1230)),__oni_rt.Sc(1233,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts,resolveSpec)},1233)),__oni_rt.Nb(function(){return __oni_rt.Return(module);},1235)])}function requireInnerMultiple(modules,require_obj,parent,opts){var rv;function inner(i,l){var descriptor,id,exclude,include,name,module,addSym,o,i,o,split;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(l === 1)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor=modules[i];if(typeof descriptor === 'string'){id=descriptor;exclude=[];include=null;name=null;}else{id=descriptor.id;exclude=descriptor.exclude || [];include=descriptor.include || null;name=descriptor.name || null;}},1247),__oni_rt.Sc(1264,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return requireInner(id,require_obj,parent,opts)},1261)),__oni_rt.Nb(function(){addSym=function (k,v){if(rv[k] !== undefined){if(rv[k] === v){return;}throw new Error(("require([.]) name clash while merging module '"+(id)+"': Symbol '"+(k)+"' defined in multiple modules"));}rv[k]=v;};if(name){addSym(name,module);}else{if(include){i=0;for(;i < include.length;i++ ){o=include[i];if(! (o in module)){throw new Error(("require([.]) module "+(id)+" has no symbol "+(o)));}addSym(o,module[o]);}}else{for(o in module){if(exclude.indexOf(o) !== - 1){continue;}addSym(o,module[o]);}}}},0)),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(1294,function(_oniX){return split=_oniX;},__oni_rt.C(function(){return Math.floor(l / 2)},1293)),__oni_rt.Par(__oni_rt.C(function(){return inner(i,split)},1295),__oni_rt.C(function(){return inner(i + split,l - split)},1298))),this);},1245)])}return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rv={};},1244),__oni_rt.Nb(function(){if(modules.length !== 0)return __oni_rt.ex(__oni_rt.C(function(){return inner(0,modules.length)},1304),this);},1304),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},1305)])}function runGlobalStratum(r){return __oni_rt.exrseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1331,function(_oniX){return r.stratum=_oniX;},__oni_rt.Reify()),__oni_rt.Try(0,__oni_rt.C(function(){return __oni_rt.Hold()},1332),0,__oni_rt.C(function(){return __oni_rt.Hold(0)},1335))])}__oni_rt.exseq(this ? this.arguments : undefined,this,'apollo-sys-common.sjs',[24,__oni_rt.Nb(function(){__oni_rt.sys=exports;if(! (__oni_rt.G.__oni_rt_bundle)){__oni_rt.G.__oni_rt_bundle={};}exports.hostenv=__oni_rt.hostenv;exports.getGlobal=function (){return __oni_rt.G;};exports.withDynVarContext=function (...args){var old_dyn_vars,proto_context,block;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){old_dyn_vars=__oni_rt.current_dyn_vars;},94),__oni_rt.Nb(function(){if(args.length === 1)return __oni_rt.ex(__oni_rt.Nb(function(){proto_context=old_dyn_vars;return block=args[0];},96),this);else return __oni_rt.ex(__oni_rt.Nb(function(){proto_context=args[0];return block=args[1];},100),this);},95),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=__oni_rt.createDynVarContext(proto_context);},105),__oni_rt.C(function(){return block()},106)),0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=old_dyn_vars;},109))])};exports.getCurrentDynVarContext=function (){return __oni_rt.current_dyn_vars;};exports.setDynVar=function (name,value){var key;if(Object.hasOwnProperty(__oni_rt.current_dyn_vars,'root')){throw new Error("Cannot set dynamic variable without context");}if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to retrieve "+(name)));}key='$' + name;__oni_rt.current_dyn_vars[key]=value;};exports.clearDynVar=function (name){var key;if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to clear "+(name)));}key='$' + name;delete __oni_rt.current_dyn_vars[key];};exports.getDynVar=function (name,default_val){var key;key='$' + name;if(__oni_rt.current_dyn_vars === null){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist (no dynamic variable context)"));}}if(! (key in __oni_rt.current_dyn_vars)){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist"));}}return __oni_rt.current_dyn_vars[key];};arrayCtors=[];arrayCtorNames=['Uint8Array','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array','Float32Array','Float64Array','NodeList','HTMLCollection','FileList','StaticNodeList','DataTransferItemList'];i=0;for(;i < arrayCtorNames.length;i++ ){c=__oni_rt.G[arrayCtorNames[i]];if(c){arrayCtors.push(c);}}exports.isArrayLike=function (obj){var i;if(Array.isArray(obj) || ! ! (obj && Object.prototype.hasOwnProperty.call(obj,'callee'))){return true;}i=0;for(;i < arrayCtors.length;i++ ){if(obj instanceof arrayCtors[i]){return true;}}return false;};_flatten=function (arr,rv){var l,elem,i;l=arr.length;i=0;for(;i < l;++ i){elem=arr[i];if(exports.isArrayLike(elem)){_flatten(elem,rv);}else{rv.push(elem);}}};exports.flatten=function (arr){var rv;rv=[];if(arr.length === UNDEF){throw new Error("flatten() called on non-array");}_flatten(arr,rv);return rv;};exports.expandSingleArgument=function (args){if(args.length == 1 && exports.isArrayLike(args[0])){args=args[0];}return args;};exports.isReifiedStratum=function (obj){return (obj !== null && typeof (obj) === 'object' && ! ! obj.__oni_stratum);};exports.isQuasi=function (obj){return (obj instanceof __oni_rt.QuasiProto);};exports.Quasi=function (arr){return __oni_rt.Quasi.apply(__oni_rt,arr);};exports.DFuncThunk=function (...args){var f;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){f=this.tobj.f;},286),__oni_rt.Nb(function(){if(! f)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(289,function(_oniX){return f=_oniX;},__oni_rt.Sc(289,function(_oniX){return this.tobj.f=_oniX;},__oni_rt.Fcall(4,289,__oni_rt.Fcall(6,289,__oni_rt.Nb(function(){return Function},289),'require','__oni_altns',__oni_rt.Nb(function(){return this.tobj.code},289),[2]),__oni_rt.Nb(function(){return exports.require},289),__oni_rt.Nb(function(){return {}},289),__oni_rt.Nb(function(){return this.tobj.context},289),[2]))),__oni_rt.Nb(function(){if(typeof f !== 'function')return __oni_rt.ex(__oni_rt.Sc(290,__oni_rt.Throw,__oni_rt.Fcall(2,290,__oni_rt.Nb(function(){return Error},290),"dfunc code is not yielding a function"),290,'apollo-sys-common.sjs'),this);},290)),this);},286),__oni_rt.Sc(292,__oni_rt.Return,__oni_rt.C(function(){return f(...args)},292))])};exports.isDFunc=function (obj){return (obj !== null && typeof (obj) === 'function' && ! ! obj.__oni_is_dfunc);};exports.mergeObjects=function (){var sources;sources=exports.expandSingleArgument(arguments);return Object.assign({},...sources);};exports.extendObject=function (dest,source){return Object.assign(dest,source);};exports.overrideObject=function (dest,...sources){var sources,h,hl,source,h,o;sources=exports.flatten(sources);h=sources.length - 1;for(;h >= 0;-- h){if(sources[h] == null){sources.splice(h,1);}}hl=sources.length;if(hl){for(o in dest){h=hl - 1;for(;h >= 0;-- h){source=sources[h];if(o in source){dest[o]=source[o];break;}}}}return dest;};URI.prototype={toString:function (){return ((this.protocol)+"://"+(this.authority)+(this.relative));}};URI.prototype.params=function (){var rv;if(! this._params){rv={};this.query.replace(parseURLOptions.qsParser,function (_,k,v){if(k){rv[decodeURIComponent(k)]=decodeURIComponent(v);}});this._params=rv;}return this._params;};parseURLOptions={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],qsParser:/(?:^|&)([^&=]*)=?([^&]*)/g,parser:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:\/@]*)(?::([^:\/@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/};exports.parseURL=function (str){var src,b,e,o,m,uri,i;str=String(str);src=str;b=str.indexOf('[');e=(b !== - 1)?str.indexOf(']'):- 1;if(e !== - 1){str=str.substring(0,b) + str.substring(b,e).replace(/:/g,';') + str.substring(e,str.length);}o=parseURLOptions;m=o.parser.exec(str);uri=new URI();i=14;while(i-- ){uri[o.key[i]]=m[i] || "";}if(e !== - 1){uri.source=src;uri.host=uri.host.substring(1,uri.host.length - 1).replace(/;/g,':');uri.authority=uri.authority.replace(/;/g,':');uri.ipv6=true;}else{uri.ipv6=false;}return uri;};exports.encodeURIComponentRFC3986=function (str){return encodeURIComponent(str).replace(/[!'()*]/g,function (c){return '%' + c.charCodeAt(0).toString(16);});};exports.constructQueryString=function (){var hashes,hl,parts,hash,val,l,i,q,h;hashes=exports.flatten(arguments);hl=hashes.length;parts=[];h=0;for(;h < hl;++ h){hash=hashes[h];for(q in hash){val=hash[q];if(val === undefined){continue;}l=encodeURIComponent(q) + "=";if(! exports.isArrayLike(val)){parts.push(l + encodeURIComponent(val));}else{i=0;for(;i < val.length;++ i){parts.push(l + encodeURIComponent(val[i]));}}}}return parts.join("&");};exports.constructURL=function (){var url_spec,l,rv,comp,k,i,qparts,part,query;url_spec=exports.flatten(arguments);l=url_spec.length;i=0;for(;i < l;++ i){comp=url_spec[i];if(exports.isQuasi(comp)){comp=comp.parts.slice();k=1;for(;k < comp.length;k+=2){comp[k]=exports.encodeURIComponentRFC3986(comp[k]);}comp=comp.join('');}else{if(typeof comp != "string"){break;}}if(rv !== undefined){if(rv.charAt(rv.length - 1) != "/"){rv+="/";}rv+=comp.charAt(0) == "/"?comp.substr(1):comp;}else{rv=comp;}}qparts=[];for(;i < l;++ i){part=exports.constructQueryString(url_spec[i]);if(part.length){qparts.push(part);}}query=qparts.join("&");if(query.length){if(rv.indexOf("?") != - 1){rv+="&";}else{rv+="?";}rv+=query;}return rv;};exports.isSameOrigin=function (url1,url2){var a1,a2;a1=exports.parseURL(url1).authority;if(! a1){return true;}a2=exports.parseURL(url2).authority;return ! a2 || (a1 == a2);};exports.normalizeURL=function (url,base){var a,pin,l,pout,c,i,rv;if(__oni_rt.hostenv == "nodejs" && __oni_rt.G.process.platform == 'win32'){url=url.replace(/\\/g,"/");base=base.replace(/\\/g,"/");}a=exports.parseURL(url);if(base && (base=exports.parseURL(base)) && (! a.protocol || a.protocol == base.protocol)){if(! a.directory && ! a.protocol){a.directory=base.directory;if(! a.path && (a.query || a.anchor)){a.file=base.file;}}else{if(a.directory && a.directory.charAt(0) != '/'){a.directory=(base.directory || "/") + a.directory;}}if(! a.protocol){a.protocol=base.protocol;if(! a.authority){a.authority=base.authority;}}}a.directory=a.directory.replace(/\/\/+/g,'/');pin=a.directory.split("/");l=pin.length;pout=[];i=0;for(;i < l;++ i){c=pin[i];if(c == "."){continue;}if(c == ".."){if(pout.length > 1){pout.pop();}}else{pout.push(c);}}if(a.file === '.'){a.file='';}else{if(a.file === '..'){if(pout.length > 2){pout.splice(- 2,1);}a.file='';}}a.directory=pout.join("/");rv="";if(a.protocol){rv+=a.protocol + ":";}if(a.authority){rv+="//" + a.authority;}else{if(a.protocol == "file"){rv+="//";}}rv+=a.directory + a.file;if(a.query){rv+="?" + a.query;}if(a.anchor){rv+="#" + a.anchor;}return rv;};exports.jsonp=jsonp_hostenv;exports.getXDomainCaps=getXDomainCaps_hostenv;exports.request=request_hostenv;if(console){orig_console_log=console.log;orig_console_info=console.info;orig_console_warn=console.warn;orig_console_error=console.error;console.log=function (){return orig_console_log.apply(console,filter_console_args(arguments));};console.info=function (){return orig_console_info.apply(console,filter_console_args(arguments));};console.warn=function (){return orig_console_warn.apply(console,filter_console_args(arguments));};console.error=function (){return orig_console_error.apply(console,filter_console_args(arguments));};}exports.eval=eval_hostenv;pendingLoads={};exports._makeRequire=makeRequire;compiled_src_tag=/^\/\*\__oni_compiled_sjs_1\*\//;default_compiler.module_args=['module','exports','require','__onimodulename','__oni_altns'];canonical_id_to_module={};exports.http_src_loader=http_src_loader;github_api="https://api.github.com/";github_opts={cbfield:"callback"};exports.resolve=function (url,require_obj,parent,opts){require_obj=require_obj || exports.require;parent=parent || getTopReqParent_hostenv();opts=opts || {};return resolve(url,require_obj,parent,opts);};exports.require=makeRequire(getTopReqParent_hostenv());exports.require.modules['builtin:apollo-sys.sjs']={id:'builtin:apollo-sys.sjs',exports:exports,loaded_from:"[builtin]",required_by:{"[system]":1}};exports.init=function (cb){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.C(function(){return init_hostenv()},1319),__oni_rt.C(function(){return cb()},1320)])};exports.spawn=function (f){var r,dynvars;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){r={};dynvars=__oni_rt.current_dyn_vars;__oni_rt.current_dyn_vars=__oni_rt.root_dyn_vars;runGlobalStratum(r) , null;return __oni_rt.current_dyn_vars=dynvars;},1342),__oni_rt.Sc(1348,__oni_rt.Return,__oni_rt.C(function(){return r.stratum.spawn(f)},1348))])};return exports.captureStratum=function (S){return __oni_rt.exrseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Fcall(1,1355,__oni_rt.Sc(1355,(l)=>[l,'adopt'],__oni_rt.Reify()),__oni_rt.Nb(function(){return S},1355)),__oni_rt.Fcall(1,1356,__oni_rt.Sc(1356,(l)=>[l,'join'],__oni_rt.Reify()))])};},55)])
var location,jsonp_req_count,jsonp_cb_obj,XHR_caps,activex_xhr_ver;function determineLocation(){var scripts,matches,i;if(! location){location={};scripts=document.getElementsByTagName("script");i=0;for(;i < scripts.length;++ i){if((matches=/^(.*\/)(?:[^\/]*)stratified(?:[^\/]*)\.js(?:\?.*)?$/.exec(scripts[i].src))){location.location=exports.normalizeURL(matches[1] + "modules/",document.location.href);location.requirePrefix=scripts[i].getAttribute("require-prefix");location.req_base=scripts[i].getAttribute("req-base") || document.location.href;location.main=scripts[i].getAttribute("main");location.noInlineScripts=scripts[i].getAttribute("no-inline-scripts");location.waitForBundle=scripts[i].getAttribute("wait-for-bundle");break;}}if(! location.req_base){location.req_base=document.location.href;}}return location;}function jsonp_hostenv(url,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({iframe:false,cbfield:"callback"},settings);url=exports.constructURL(url,opts.query);},0),__oni_rt.Nb(function(){if(opts.iframe || opts.forcecb)return __oni_rt.ex(__oni_rt.Sc(112,__oni_rt.Return,__oni_rt.C(function(){return jsonp_iframe(url,opts)},112)),this);else return __oni_rt.ex(__oni_rt.Sc(114,__oni_rt.Return,__oni_rt.C(function(){return jsonp_indoc(url,opts)},114)),this);},111)])}function jsonp_indoc(url,opts){var cb,cb_query,elem,complete,readystatechange,error,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! window[jsonp_cb_obj]){window[jsonp_cb_obj]={};}cb="cb" + (jsonp_req_count++ );cb_query={};cb_query[opts.cbfield]=jsonp_cb_obj + "." + cb;url=exports.constructURL(url,cb_query);elem=document.createElement("script");elem.setAttribute("src",url);elem.setAttribute("async","async");elem.setAttribute("type","text/javascript");complete=false;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){window[jsonp_cb_obj][cb]=resume;return document.getElementsByTagName("head")[0].appendChild(elem);},136),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Nb(function(){if(elem.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.addEventListener("error",resume,false)},141),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){readystatechange=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(elem.readyState == 'loaded' && ! complete)return __oni_rt.ex(__oni_rt.Fcall(0,144,__oni_rt.Nb(function(){return resume},144),__oni_rt.Fcall(2,144,__oni_rt.Nb(function(){return Error},144),"script loaded but `complete` flag not set")),this);},144)])};},146),__oni_rt.C(function(){return elem.attachEvent("onreadystatechange",readystatechange)},146)),this);},140),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(elem.removeEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.removeEventListener("error",resume,false)},151),this);else return __oni_rt.ex(__oni_rt.C(function(){return elem.detachEvent("onreadystatechange",readystatechange)},153),this);},150)),this)},155),__oni_rt.Sc(155,__oni_rt.Throw,__oni_rt.Fcall(2,155,__oni_rt.Nb(function(){return Error},155),__oni_rt.Nb(function(){return "Could not complete JSONP request to '" + url + "'" + (error?"\n" + error.message:"")},155)),155,'apollo-sys-xbrowser.sjs')),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.Seq(0,__oni_rt.C(function(){return elem.parentNode.removeChild(elem)},158),__oni_rt.Nb(function(){return delete window[jsonp_cb_obj][cb];},159))),this)},161),__oni_rt.Nb(function(){complete=true;return __oni_rt.Return(rv);},161)])}function jsonp_iframe(url,opts){var cb,cb_query,iframe,doc,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){cb=opts.forcecb || "R";cb_query={};if(opts.cbfield){cb_query[opts.cbfield]=cb;}url=exports.constructURL(url,cb_query);iframe=document.createElement("iframe");document.getElementsByTagName("head")[0].appendChild(iframe);doc=iframe.contentWindow.document;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return doc.open()},178),__oni_rt.Nb(function(){return iframe.contentWindow[cb]=resume;},179),__oni_rt.C(function(){return __oni_rt.Hold(0)},182),__oni_rt.C(function(){return doc.write("\x3Cscript type='text/javascript' src=\"" + url + "\">\x3C/script>")},183),__oni_rt.C(function(){return doc.close()},184)),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.C(function(){return iframe.parentNode.removeChild(iframe)},187)),this)},191),__oni_rt.C(function(){return __oni_rt.Hold(0)},191),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},192)])}function getXHRCaps(){if(! XHR_caps){XHR_caps={};if(__oni_rt.G.XMLHttpRequest){XHR_caps.XHR_ctor=function (){return new XMLHttpRequest();};}else{XHR_caps.XHR_ctor=function (){var req,v;if(typeof activex_xhr_ver !== 'undefined'){return new ActiveXObject(activex_xhr_ver);}for(v in {"MSXML2.XMLHTTP.6.0":1,"MSXML2.XMLHTTP.3.0":1,"MSXML2.XMLHTTP":1}){try{req=new ActiveXObject(v);activex_xhr_ver=v;return req;}catch(e){;}}throw new Error("Browser does not support XMLHttpRequest");};}XHR_caps.XHR_CORS=("withCredentials" in XHR_caps.XHR_ctor());if(! XHR_caps.XHR_CORS){XHR_caps.XDR=(typeof __oni_rt.G.XDomainRequest !== 'undefined');}XHR_caps.CORS=(XHR_caps.XHR_CORS || XHR_caps.XDR)?"CORS":"none";}return XHR_caps;}function getXDomainCaps_hostenv(){return getXHRCaps().CORS;}function getTopReqParent_hostenv(){var base;base=determineLocation().req_base;return {id:base,loaded_from:base,required_by:{"[system]":1}};}function resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(req_obj.path && req_obj.path.length){url_string=exports.constructURL(req_obj.path,url_string);}return exports.normalizeURL(url_string,parent.id);}function request_hostenv(url,settings){var opts,caps,req,h,error,txt,err;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({method:"GET",body:null,response:'string',throwing:true},settings);url=exports.constructURL(url,opts.query);caps=getXHRCaps();if(! caps.XDR || exports.isSameOrigin(url,document.location)){req=caps.XHR_ctor();req.open(opts.method,url,true,opts.username || "",opts.password || "");}else{req=new XDomainRequest();req.open(opts.method,url);}},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume()},300)])};req.onerror=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},301)])};return req.onabort=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},302)])};},300),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=function (evt){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(req.readyState != 4)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return();},307),this);else return __oni_rt.ex(__oni_rt.C(function(){return resume()},309),this);},306)])};},310),this);},299),__oni_rt.Nb(function(){if(opts.headers && req.setRequestHeader){for(h in opts.headers){req.setRequestHeader(h,opts.headers[h]);}}if(opts.mime && req.overrideMimeType){req.overrideMimeType(opts.mime);}if(opts.response === 'arraybuffer'){req.responseType='arraybuffer';}req.send(opts.body);},0)),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=null;req.onerror=null;return req.onabort=null;},333),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=null},338),this);},332),__oni_rt.C(function(){return req.abort()},329)),this)},342),__oni_rt.If(__oni_rt.Seq(2,__oni_rt.Nb(function(){return error},342),__oni_rt.Seq(4,__oni_rt.Nb(function(){return typeof req.status !== 'undefined'},343),__oni_rt.Sc(344,(r)=>! r,__oni_rt.Sc(344,__oni_rt.infix['in'],__oni_rt.Fcall(1,344,__oni_rt.Sc(344,(l)=>[l,'charAt'],__oni_rt.C(function(){return req.status.toString()},344)),0),__oni_rt.Nb(function(){return {'0':1,'2':1}},344))))),__oni_rt.Seq(0,__oni_rt.Nb(function(){if(opts.throwing){txt="Failed " + opts.method + " request to '" + url + "'";if(req.statusText){txt+=": " + req.statusText;}if(req.status){txt+=" (" + req.status + ")";}err=new Error(txt);err.status=req.status;err.data=req.response;throw err;}},345),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return("");},356),this);},355))),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(req.responseText);},361),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(opts.response === 'arraybuffer')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.response,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},366)])}});},367),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.responseText,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},374)])}});},375),this);},362),this);},360)])}function getHubs_hostenv(){return [["sjs:",determineLocation().location || {src:function (path){throw new Error("Can't load module '" + path + "': The location of the StratifiedJS standard module lib is unknown - it can only be inferred automatically if you load stratified.js in the normal way through a <script> element.");}}],["github:",{src:github_src_loader}],["http:",{src:http_src_loader}],["https:",{src:http_src_loader}],["file:",{src:http_src_loader}],["x-wmapp1:",{src:http_src_loader}],["local:",{src:http_src_loader}]];}function getExtensions_hostenv(){return {'sjs':default_compiler,'js':function (src,descriptor){var f;try{f=new Function("module","exports","require",src + ("\n//# sourceURL="+(descriptor.id)));return f.apply(descriptor.exports,[descriptor,descriptor.exports,descriptor.require]);}catch(e){console.log(("Compilation of module "+(descriptor.id)+" threw:"),e);throw new Error(("In module "+(descriptor.id)+":"+(e.message)));}},'html':html_sjs_extractor};}function eval_hostenv(code,settings){var filename,mode,js;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},430),__oni_rt.Sc(430,function(_oniX){return filename=_oniX;},__oni_rt.Sc(430,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},430),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},432),__oni_rt.Sc(433,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(code,{filename:filename,mode:mode})},432)),__oni_rt.Sc(433,__oni_rt.Return,__oni_rt.C(function(){return __oni_rt.G.eval(js)},433))])}function init_hostenv(){}function runScripts(){var scripts,ss,s,i,s,m,content,descriptor,f,i,mainModule;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.If(__oni_rt.Sc(457,(l)=>l.waitForBundle,__oni_rt.C(function(){return determineLocation()},457)),__oni_rt.Nb(function(){if(__oni_rt_bundle.h === undefined)return __oni_rt.ex(__oni_rt.Nb(function(){__oni_rt_bundle_hook=runScripts;return __oni_rt.Return();},461),this);},459)),__oni_rt.If(__oni_rt.Sc(466,(r)=>! r[0][r[1]],__oni_rt.Sc(466,(l)=>[l,'noInlineScripts'],__oni_rt.C(function(){return determineLocation()},466))),__oni_rt.Seq(0,__oni_rt.Nb(function(){scripts=document.getElementsByTagName("script");ss=[];i=0;for(;i < scripts.length;++ i){s=scripts[i];if(s.getAttribute("type") == "text/sjs"){ss.push(s);}}},0),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},509),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < ss.length},486),__oni_rt.Nb(function(){return ++ i},486),__oni_rt.Nb(function(){s=ss[i];m=s.getAttribute("module");content=s.textContent || s.innerHTML;if(__oni_rt.UA == "msie"){content=content.replace(/\r\n/,"");}},0),__oni_rt.Nb(function(){if(m)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.modsrc[m]=content},498),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor={id:document.location.href + "_inline_sjs_" + (i + 1)};return __oni_rt.sys.require.main=descriptor;},503),__oni_rt.Sc(506,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module, __onimodulename){" + content + "\n})",{filename:("module "+(descriptor.id))})},504)),__oni_rt.C(function(){return f(descriptor)},506)),this);},497))))),__oni_rt.Nb(function(){mainModule=determineLocation().main;},511),__oni_rt.Nb(function(){if(mainModule)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.sys.require(mainModule,{main:true})},512),this);},511)])}__oni_rt.exseq(this ? this.arguments : undefined,this,'apollo-sys-xbrowser.sjs',[24,__oni_rt.Nb(function(){if(determineLocation().requirePrefix){__oni_rt.G[determineLocation().requirePrefix]={require:__oni_rt.sys.require};}else{__oni_rt.G.require=__oni_rt.sys.require;}jsonp_req_count=0;jsonp_cb_obj="_oni_jsonpcb";return window.onerror=function (a,b,c,d,e){if(e){console.error("Uncaught " + e.toString());return true;}};},78),__oni_rt.Nb(function(){if(! __oni_rt.G.__oni_rt_no_script_load)return __oni_rt.ex(__oni_rt.Nb(function(){if(document.readyState === "complete" || document.readyState === "interactive")return __oni_rt.ex(__oni_rt.C(function(){return runScripts()},517),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(__oni_rt.G.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.addEventListener("DOMContentLoaded",runScripts,true)},521),this);else return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.attachEvent("onload",runScripts)},523),this);},520),this);},516),this);},454)])})({})