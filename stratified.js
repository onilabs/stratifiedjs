/*
 * Oni StratifiedJS Runtime
 * Client-side Cross-Browser implementation
 *
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2010-2013 Oni Labs, http://onilabs.com
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


























































exports.G=window;



















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

var CFETypes={r:"return",b:"break",c:"continue",blb:"blocklambda break"};
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


}else if(!this.eid)throw new Error(this.toString());else throw this;




}};













function cloneAnnotatedCFX(obj){obj=new CFException('t',Object.create(obj.val));


obj.val.toString=CFException_toString;



Object.defineProperty(obj.val,'name',{get:function(){return this.__proto__.name}});
Object.defineProperty(obj.val,'message',{get:function(){return this.__proto__.message}});


obj.val.__oni_stack=[].concat(obj.val.__oni_stack);
return obj;
}










exports.current_dyn_vars=null;
















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

exports.is_ef=function(obj){return obj&&obj.__oni_ef;

};


function setEFProto(t){for(var p=null in EF_Proto)t[p]=EF_Proto[p]}




function mergeCallstacks(target_ef,src_ef){if(target_ef===src_ef)return;


if(target_ef.callstack){




target_ef.callstack=target_ef.callstack.concat(src_ef.callstack);
if(target_ef.callstack.length>20)target_ef.callstack.splice(20/2,target_ef.callstack.length-20+1,['    ...(frames omitted)']);



}else{


target_ef.callstack=src_ef.callstack;
}
}


var EF_Proto={toString:function(){
return "<suspended SJS>"},__oni_ef:true,wait:function(){


return this},setChildFrame:function(ef,idx,prevent_callstack_copy){


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


;

this.aborted=true;
this.pseudo_abort=pseudo_abort;


if(!this.child_frame){

return this;
}else{

var abort_val=this.child_frame.abort(pseudo_abort);
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===true)){
return this;
}else{

;

if(((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_cfx)&&abort_val.type==='t'&&abort_val.val!=null&&abort_val.val._oniE===token_oniE)&&this.callstack){
abort_val.val.__oni_stack=abort_val.val.__oni_stack.concat(this.callstack);
}


this.unreturnable=true;
return abort_val;
}
}
},returnToParent:function(val){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type=='t'&&this.callstack&&val.val!=null&&val.val.__oni_stack){








val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}
if(this.swallow_r){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==="r"){
if(!val.eid||val.eid===this.sid){
val=val.val;
if(this.swallow_r===3){


val=UNDEF;
}
}
}
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){












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






}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type!=='a'){



val.mapToJS(true);
}
}else return val;


}};









var token_dis={};


function execIN(node,env){if(!node||node.__oni_dis!=token_dis){

return node;
}
return node.exec(node.ndata,env);
}
exports.ex=execIN;





exports.exseq=function(aobj,tobj,file,args){var rv=I_seq(args,new Env(aobj,tobj,file));


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};



exports.exbl=function(env,args){var rv=I_seq(args,env);


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};

var StratumAborted=exports.StratumAborted=function(){};
StratumAborted.prototype=new Error("stratum aborted");





































function Env(aobj,tobj,file,blbref,blrref,blscope,fold,branch){this.aobj=aobj;

this.tobj=tobj;
this.file=file;
this.blbref=blbref;
this.blrref=blrref;
this.blscope=blscope;
this.fold=fold;
this.branch=branch;
}

function copyEnv(e){return new Env(e.aobj,e.tobj,e.file,e.blbref,e.blrref,e.blscope,e.fold,e.branch);

}






function I_call(ndata,env){try{

var rv=(ndata[0]).call(env);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([env.file,ndata[1]]);
}
return rv;
}catch(e){

if((e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
if(e.type=='blb'&&env.blscope&&e.eid==env.blscope.sid){



return UNDEF;
}
}else{
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}

exports.C=function(...args){return {exec:I_call,ndata:args,__oni_dis:token_dis};





};






function I_nblock(ndata,env){try{

return (ndata[0]).call(env);
}catch(e){

if(!(e!==null&&typeof (e)==='object'&&e.__oni_cfx)){
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}

exports.Nb=function(...args){return {exec:I_nblock,ndata:args,__oni_dis:token_dis};





};






function I_blocklambda(ndata,env){return ndata.bind(env);

}

exports.Bl=function(f){return {exec:I_blocklambda,ndata:f,__oni_dis:token_dis};





};














var seq_counter=0;

function EF_Seq(ndata,env){this.sid=++seq_counter;


this.ndata=ndata;
this.env=env;

if(ndata[0]&8){
if(ndata[0]&64){
this.env=copyEnv(env);
this.env.blbref=env.blscope;
this.env.blrref=env.blrref;
this.env.blscope=this;
}else{


env.blbref=this;
env.blrref=this;
env.blscope=this;
}
}else if(ndata[0]&1){

this.env=copyEnv(env);
if(ndata[0]&64)this.env.blbref=env.blscope;






this.env.blscope=null;
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
EF_Seq.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){




this.setChildFrame(val,idx);
}else{

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

if(val.type=='blb'&&this.env.blscope&&val.eid==this.env.blscope.sid){
val=UNDEF;
}else{


return this.returnToParent(val);
}
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
val=execIN(this.ndata[idx],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
if(!(val!==null&&typeof (val)==='object'&&val.__oni_ef===true))return this.returnToParent(val);

}
}
if(++idx==this.ndata.length&&this.tailcall){

break;
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){


if(val.type==='blb'&&this.env.blscope&&val.eid===this.env.blscope.sid)val=undefined;

break;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
return this;
}
}
return this.returnToParent(val);
}
};

function I_seq(ndata,env){return cont(new EF_Seq(ndata,env),1);

}

exports.Seq=function(...args){return {exec:I_seq,ndata:args,__oni_dis:token_dis};





};

















function EF_Sc(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Sc.prototype={});

EF_Sc.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

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
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
rv.quench();
rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}
}

++this.i;
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return this.returnToParent(rv);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
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
rv=this.ndata[1].apply(this.env,this.pars);
}catch(e){

rv=new CFException("t",e,this.ndata[0],this.env.file);


}
return this.returnToParent(rv);
}
};

function I_sc(ndata,env){return cont(new EF_Sc(ndata,env),0);

}


exports.Sc=function(...args){return {exec:I_sc,ndata:args,__oni_dis:token_dis};





};





function testIsFunction(f){if(typeof f=="function")return true;










return /(^| )\[[^o]/.test(""+f);
}












function EF_Fcall(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Fcall.prototype={});

EF_Fcall.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

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
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
rv.quench();
rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}
}

++this.i;
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))return this.returnToParent(rv);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
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



switch(this.ndata[0]&3){case 0:


if(typeof this.l=="function"){
rv=this.l(...pars);
}else if(!testIsFunction(this.l)){

rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.env.file);



}else{










try{
this.l(...pars);

}catch(e){







rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.env.file);



}
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.env.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],pars);
}else if((UA!=="msie")&&!testIsFunction(this.l[0][this.l[1]])){













rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.env.file);



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








rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.env.file);



}
}
break;
case 2:

var ctor=this.l;
rv=new ctor(...pars);
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
if(!rv.env)throw new Error("Invalid constructor function (no environment)");
this.o=rv.env.tobj;

this.setChildFrame(rv,2);
return this;
}
break;
default:
rv=new CFException("i","Invalid Fcall mode");
}
}catch(e){







if((e!==null&&typeof (e)==='object'&&e.__oni_cfx)){

if(e.type=='blb'&&this.env.blscope&&e.eid==this.env.blscope.sid){
rv=UNDEF;
}else rv=e;


}else rv=new CFException("t",e,this.ndata[1],this.env.file);




}
if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
if(this.aborted){

rv=rv.abort(this.pseudo_abort);
return this.returnToParent(rv);
}


if(!rv.callstack)rv.callstack=[];
rv.callstack.push([this.env.file,this.ndata[1]]);
}
return this.returnToParent(rv);
}
};

function I_fcall(ndata,env){return cont(new EF_Fcall(ndata,env),0);

}


exports.Fcall=function(...args){return {exec:I_fcall,ndata:args,__oni_dis:token_dis};





};













function EF_If(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_If.prototype={});

EF_If.prototype.cont=function(idx,val){switch(idx){case 0:



val=execIN(this.ndata[0],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}


case 1:
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))break;
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,1);
return this;
}

if(val)val=execIN(this.ndata[1],this.env);else val=execIN(this.ndata[2],this.env);



if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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

function I_if(ndata,env){return cont(new EF_If(ndata,env),0);

}


exports.If=function(...args){return {exec:I_if,ndata:args,__oni_dis:token_dis};





};





var Default={};
exports.Default=Default;





















function EF_Switch(ndata,env){this.ndata=ndata;

this.env=env;
this.phase=0;
}
setEFProto(EF_Switch.prototype={});

EF_Switch.prototype.cont=function(idx,val){switch(this.phase){case 0:


if(idx==0){
val=execIN(this.ndata[0],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}
}
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))return this.returnToParent(val);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,idx);
return this;
}else if(val==Default||val==this.testval)break;


}
if(++idx>=this.ndata[1].length)return this.returnToParent(null);


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[1][idx][0],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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
val=execIN(this.ndata[1][idx][1],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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

function I_switch(ndata,env){return cont(new EF_Switch(ndata,env),0);

}


exports.Switch=function(...args){return {exec:I_switch,ndata:args,__oni_dis:token_dis};





};






















function EF_Try(ndata,env){this.ndata=ndata;

this.env=env;
this.state=0;
}
setEFProto(EF_Try.prototype={});

EF_Try.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,this.state);
}else{

if(this.child_frame){
this.child_frame.parent=UNDEF;


this.child_frame=UNDEF;
}

switch(this.state){case 0:

this.state=1;
val=execIN(this.ndata[1],this.env);

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val);
return this;
}
case 1:

this.state=2;
if(this.ndata[2]&&((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type=="t")){

var v;
v=val.val;
val=this.ndata[2](this.env,v);



if(this.aborted&&(val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
}




if(!this.ndata[4]&&!this.ndata[3]&&!(this.aborted&&(val!==null&&typeof (val)==='object'&&val.__oni_ef===true))){


return this.returnToParent(val);
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,0,true);
return this;
}
}
case 2:

this.state=3;

this.rv=val;
if(this.aborted&&!this.pseudo_abort&&this.ndata[4]){
val=execIN(this.ndata[4],this.env);







if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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


val=this.ndata[3](this.env,v);
}else{

val=execIN(this.ndata[3],this.env);
}


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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





if(!(val!==null&&typeof (val)==='object'&&val.__oni_cfx)||val.type==='a'){
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

EF_Try.prototype.abort=function(pseudo_abort){;

this.aborted=true;
this.pseudo_abort=pseudo_abort;

if(!this.child_frame)return this;


if(this.state!==4){
var val=this.child_frame.abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){


this.setChildFrame(val);
}else{










this.async=false;
var rv=cont(this,0,val);
;
if(rv!==this){
if(!(rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx)||rv.type==='a')rv=val;

return rv;
}else{

this.rv=val;
this.async=true;
}

}
}
return this;
};

function I_try(ndata,env){return cont(new EF_Try(ndata,env),0);

}


exports.Try=function(...args){return {exec:I_try,ndata:args,__oni_dis:token_dis};





};













function EF_Loop(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Loop.prototype={});

EF_Loop.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else{

while(true){

if(idx===0){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

return this.returnToParent(val);
}

val=execIN(this.ndata[1],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,2,true);
return this;
}
idx=2;
}

if(idx>1){
if(idx===2){

if(!val||(val!==null&&typeof (val)==='object'&&val.__oni_cfx)){

return this.returnToParent(val);
}
}
while(1){
if(idx>2){
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==='blb'&&this.env.blscope&&val.eid===this.env.blscope.sid){

val=UNDEF;
}else{

if(val.type==="b"){

val=UNDEF;
}else if(val.type==="c"){


val=UNDEF;

break;
}
return this.returnToParent(val);
}
}
if(idx>=this.ndata.length)break;

}


if(this.child_frame){
this.child_frame.parent=UNDEF;
this.child_frame=UNDEF;
}
val=execIN(this.ndata[idx+1],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);


if(!(val!==null&&typeof (val)==='object'&&val.__oni_ef===true))return this.returnToParent(val);

}
}
++idx;
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,idx);
return this;
}
}
idx=1;
}

if(this.ndata[2]){

val=execIN(this.ndata[2],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,0,true);
return this;
}
}
idx=0;
}
}
};

function I_loop(ndata,env){return cont(new EF_Loop(ndata,env),ndata[0],true);

}


exports.Loop=function(...args){return {exec:I_loop,ndata:args,__oni_dis:token_dis};





};













function EF_ForIn(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_ForIn.prototype={});

EF_ForIn.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else{

if(idx==0){
val=execIN(this.ndata[0],this.env);
if(this.aborted){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
val.quench();
val=val.abort(this.pseudo_abort);
return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,1,true);
return this;
}
idx=1;
}
if(idx==1){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx))return this.returnToParent(val);

var for_in_obj=val;
for(var x=null in for_in_obj){
if(typeof this.remainingX==='undefined'){
val=this.ndata[1](this.env,x);
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
continue;
}
return this.returnToParent(val);
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.remainingX=[];
this.for_in_obj=for_in_obj;
}
}else this.remainingX.push(x);


}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
if(!this.remainingX)this.remainingX=[];
this.setChildFrame(val,2,true);
return this;
}

return this.returnToParent(val);
}
if(idx==2){
while(1){

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
if(this.remainingX.length)continue;

}
return this.returnToParent(val);
}
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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
val=this.ndata[1](this.env,arg);

}
}
}
};

function I_forin(ndata,env){return cont(new EF_ForIn(ndata,env),0);

}


exports.ForIn=function(...args){return {exec:I_forin,ndata:args,__oni_dis:token_dis};





};














function mergeExceptions(new_exception,original_exception){if((new_exception!==null&&typeof (new_exception)==='object'&&new_exception.__oni_cfx)){


if(!(original_exception!==null&&typeof (original_exception)==='object'&&original_exception.__oni_cfx)){

if(new_exception.type!=='a')return new_exception;
return original_exception;
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


function EF_Par(ndata,env){this.ndata=ndata;

this.env=env;
this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Par.prototype={});

EF_Par.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else{

if(idx==-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<this.ndata.length;++i){
val=execIN(this.ndata[i],this.env);
exports.current_dyn_vars=parent_dyn_vars;
if(this.inner_aborted){


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingCFE=mergeExceptions(val,this.pendingCFE);
return this.pendingCFE;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

++this.pending;
this.setChildFrame(val,i);
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
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&!this.inner_aborted&&!(val.type==='blb'&&this.env.blscope&&val.eid===this.env.blscope.sid)){




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




return this.returnToParent(return_child);
}
return this.returnToParent(new CFException("i","invalid state in Par"));
}else{





this.pendingCFE=mergeExceptions(val,this.pendingCFE);

if(this.pending===0)return this.returnToParent(this.pendingCFE);

}
}
this.async=true;
return this;
}
};

EF_Par.prototype.quench=function(){for(var i=0;i<this.children.length;++i){






if(this.children[i])this.children[i].quench();

}
};

EF_Par.prototype.abort=function(pseudo_abort){if(this.aborted){









return this;

}else this.pseudo_abort=pseudo_abort;


this.aborted=true;
return this.abortInner();
};

EF_Par.prototype.abortInner=function(){this.inner_aborted=true;




for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true))this.setChildFrame(val,i);else{


this.pendingCFE=mergeExceptions(val,this.pendingCFE);





--this.pending;
this.children[i]=UNDEF;
}
}
if(!this.pending)return this.pendingCFE||new CFException('a');


this.async=true;
return this;
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

EF_Par.prototype.setChildFrame=setChildFramePar;

function I_par(ndata,env){return cont(new EF_Par(ndata,env),-1);

}


exports.Par=function(...args){return {exec:I_par,ndata:args,__oni_dis:token_dis};





};













function EF_Alt(ndata,env){this.ndata=ndata;

this.env=env;

this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Alt.prototype={});

EF_Alt.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,idx);
}else{

if(idx==-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<this.ndata.length;++i){


var env=copyEnv(this.env);
env.fold=this;
env.branch=i;
val=execIN(this.ndata[i],env);
exports.current_dyn_vars=parent_dyn_vars;

if(this.inner_aborted){


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingRV=mergeExceptions(val,this.pendingRV);
return this.pendingRV;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

++this.pending;
this.setChildFrame(val,i);
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





return this;
}

this.pseudo_abort=pseudo_abort;
this.aborted=true;
var rv;
if(!this.inner_aborted){
rv=this.abortInner();
}else if(this.pending)rv=this;



this.pendingRV=this.pendingRV||new CFException('a');
if(rv!==this&&!(rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx))rv=this.pendingRV;
return rv;
};

EF_Alt.prototype.abortInner=function(){this.inner_aborted=true;




if(this.collapsing){

var branch=this.collapsing.branch;
this.collapsing=UNDEF;
var val=this.children[branch].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true))this.setChildFrame(val,branch);else{


--this.pending;
this.children[branch]=UNDEF;
}
}else{


for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true))this.setChildFrame(val,i);else{


this.pendingRV=mergeExceptions(val,this.pendingRV);
--this.pending;
this.children[i]=UNDEF;
}
}
}
if(!this.pending)return this.pendingRV;

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
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
have_async_branch_retract=true;
this.setChildFrame(val,i);
}else{

--this.pending;
this.children[i]=UNDEF;
}
}
}
if(!have_async_branch_retract){
;
return true;
}



this.collapsing={branch:branch,cf:cf};
return false;
};

function I_alt(ndata,env){return cont(new EF_Alt(ndata,env),-1);

}


exports.Alt=function(...args){return {exec:I_alt,ndata:args,__oni_dis:token_dis};





};











function EF_WfW(ndata,env){this.ndata=ndata;

this.env=env;
this.pending=0;
this.children=new Array(2);
}
setEFProto(EF_WfW.prototype={});

EF_WfW.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){



this.setChildFrame(val,idx);
}else{

if(idx===-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<2;++i){
val=execIN(this.ndata[i],this.env);
exports.current_dyn_vars=parent_dyn_vars;
if(this.inner_aborted){
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){



++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingCFE=mergeExceptions(val,this.pendingCFE);
return this.pendingCFE;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

++this.pending;
this.setChildFrame(val,i);
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
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&!this.inner_aborted&&!(val.type==='blb'&&this.env.blscope&&val.eid===this.env.blscope.sid)){




this.pendingCFE=val;
this.quench();
return this.returnToParent(this.abortInner());
}
}

if(this.pending===1){
if(this.pendingCFE===undefined&&this.children[1]){

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

EF_WfW.prototype.quench=function(){if(this.children[0])this.children[0].quench();






if(this.children[1])this.children[1].quench();
};

EF_WfW.prototype.abort=function(pseudo_abort){if(this.aborted){









return this;

}else this.pseudo_abort=pseudo_abort;


this.pendingCFE=this.pendingCFE||new CFException('a');
this.aborted=true;
return this.abortInner();
};

EF_WfW.prototype.abortInner=function(){this.inner_aborted=true;





if(this.children[1]){
var val=this.children[1].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,1);
this.async=true;
return this;
}else{

this.pendingCFE=mergeExceptions(val,this.pendingCFE);



--this.pending;
this.children[1]=UNDEF;
}
}
if(this.children[0]){
var val=this.children[0].abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,0);
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

function I_wfw(ndata,env){return cont(new EF_WfW(ndata,env),-1);

}
exports.WfW=function(...args){return {exec:I_wfw,ndata:args,__oni_dis:token_dis};



};




















function EF_Suspend(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Suspend.prototype={});

EF_Suspend.prototype.cont=function(idx,val){if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){


this.setChildFrame(val,idx);
}else{

switch(idx){case 0:

try{
var ef=this;
this.dyn_vars=exports.current_dyn_vars;

var resumefunc=function(...args){try{

var caller_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=ef.dyn_vars;
cont(ef,2,args);
}catch(e){

var s=function(){throw e};
setTimeout(s,0);
}finally{

ef.dyn_vars=undefined;
exports.current_dyn_vars=caller_dyn_vars;
}
};






val=this.ndata[0](this.env,resumefunc);
}catch(e){


val=new CFException("t",e);
}



if(this.returning){

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){


this.setChildFrame(val,0);
this.quench();
val=val.abort(this.pseudo_abort);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,3);

this.async=true;
return this;
}

}
return cont(this,3,null);
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
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
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,3);
return this;
}


}
}
case 3:

try{
this.ndata[1].apply(this.env,this.retvals);
val=UNDEF;
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
if((abort_val!==null&&typeof (abort_val)==='object'&&abort_val.__oni_ef===true)){
this.setChildFrame(abort_val,4);
return this;
}else{

;
return abort_val;
}
}
return new CFException('a');
};

function I_sus(ndata,env){return cont(new EF_Suspend(ndata,env),0);

}


exports.Suspend=function(...args){return {exec:I_sus,ndata:args,__oni_dis:token_dis};





};












function EF_Spawn(ndata,env,notifyAsync,notifyVal,notifyAborted){this.ndata=ndata;

this.env=env;
this.notifyAsync=notifyAsync;
this.notifyVal=notifyVal;
this.notifyAborted=notifyAborted;
}
setEFProto(EF_Spawn.prototype={});

EF_Spawn.prototype.cont=function(idx,val){if(idx==0){




this.abort_path=exports.current_dyn_vars?exports.current_dyn_vars.__oni__spawned_stratum:null;
this.parent_dyn_vars=exports.current_dyn_vars;


exports.current_dyn_vars=Object.create(this.parent_dyn_vars);
exports.current_dyn_vars.__oni__spawned_stratum=this;
val=execIN(this.ndata[1],this.env);

exports.current_dyn_vars=this.parent_dyn_vars;
if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&(val.type==='blb'||(val.type==='r'&&val.eid))){
return val;
}
}else if(idx===2){


if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,2);
return this.returnToParent(this);
}else if(!(val!==null&&typeof (val)==='object'&&val.__oni_cfx)||((val.type!=='r'||!val.eid)&&val.type!=='blb')){



this.in_abortion=false;
this.done=true;
this.abort_path=undefined;

this.notifyVal(this.return_val,true);
this.notifyAborted(val);






return this.returnToParent(this.return_val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)){
if(val.type==='r'&&val.eid){



var frame_to_abort=this.env.blrref;

if(!frame_to_abort.parent||frame_to_abort.unreturnable){
this.done=true;
this.notifyVal(new CFException("t",new Error("Blocklambda return from spawned stratum to inactive scope"),this.ndata[0],this.env.file));



this.notifyAborted(UNDEF);
return;
}


this.in_abortion=true;


this.parent=frame_to_abort.parent;
this.parent_idx=frame_to_abort.parent_idx;


cont(this.parent,this.parent_idx,this);


frame_to_abort.parent=UNDEF;


frame_to_abort.quench();
var aborted_target=frame_to_abort.abort(true);
if((aborted_target!==null&&typeof (aborted_target)==='object'&&aborted_target.__oni_ef===true)){

this.return_val=val;
this.setChildFrame(aborted_target,2);


this.notifyVal(UNDEF,true);
this.notifyAborted(UNDEF);


this.returnToParent(this);
return;
}

this.in_abortion=false;
this.done=true;



this.notifyVal(UNDEF,true);
this.notifyAborted(UNDEF);


return this.returnToParent(val.eid===frame_to_abort.sid?val.val:val);
}else if(val.type==='blb'){




var frame_to_abort=this.env.blrref;

if(!frame_to_abort.parent||frame_to_abort.unreturnable){
this.done=true;
this.notifyVal(new CFException("t",new Error("Blocklambda break from spawned stratum to invalid or inactive scope"),this.ndata[0],this.env.file));



this.notifyAborted(UNDEF);
return;
}


this.in_abortion=true;


this.parent=frame_to_abort.parent;
this.parent_idx=frame_to_abort.parent_idx;

cont(this.parent,this.parent_idx,this);


frame_to_abort.parent=UNDEF;


frame_to_abort.quench();

var aborted_target=frame_to_abort.abort(true);
if((aborted_target!==null&&typeof (aborted_target)==='object'&&aborted_target.__oni_ef===true)){

this.return_val=val;
this.setChildFrame(aborted_target,2);


this.notifyVal(UNDEF,true);
this.notifyAborted(UNDEF);


this.returnToParent(this);
return;
}

this.in_abortion=false;
this.done=true;



this.notifyVal(UNDEF,true);
this.notifyAborted(UNDEF);


return this.returnToParent(val);
}
}

if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){
this.setChildFrame(val,1);
if(idx==0)this.notifyAsync();

}else{

this.parent_dyn_vars=undefined;
this.in_abortion=false;
this.done=true;
this.notifyVal(val);
}
};

EF_Spawn.prototype.abort=function(pseudo){if(this.in_abortion)return this;





if(this.done)return new CFException('a');

this.in_abortion=true;
if(this.child_frame){
this.child_frame.quench();
var val=this.child_frame.abort(pseudo);
if((val!==null&&typeof (val)==='object'&&val.__oni_ef===true)){

this.setChildFrame(val,2);
return this;
}else{

this.in_abortion=false;
this.done=true;
return val;
}
}
};

function EF_SpawnWaitFrame(waitarr){this.dyn_vars=exports.current_dyn_vars;

this.waitarr=waitarr;
waitarr.push(this);
}
setEFProto(EF_SpawnWaitFrame.prototype={});
EF_SpawnWaitFrame.prototype.quench=function(){};
EF_SpawnWaitFrame.prototype.abort=function(){var idx=this.waitarr.indexOf(this);

this.waitarr.splice(idx,1);
return new CFException('a');
};
EF_SpawnWaitFrame.prototype.cont=function(val){if(this.parent){

var current_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=this.dyn_vars;
this.dyn_vars=undefined;

if(((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type==='t'&&val.val!=null&&val.val._oniE===token_oniE)){



val=cloneAnnotatedCFX(val);


if(this.callstack)val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);

}

cont(this.parent,this.parent_idx,val);
exports.current_dyn_vars=current_dyn_vars;
}
};


var nextTick;
if(exports.G.nextTick){
nextTick=exports.G.nextTick;
}else if(exports.G.Promise){

nextTick=function(cb){Promise.resolve().then(cb)};
}else throw new Error("host environment not supported - need 'Promise' or 'nextTick'");


function EF_SpawnAbortFrame(waitarr,spawn_frame){this.dyn_vars=exports.current_dyn_vars;

this.waitarr=waitarr;
waitarr.push(this);
var me=this;
nextTick(function(){me.resolveAbortCycle(spawn_frame)});

}
setEFProto(EF_SpawnAbortFrame.prototype={});
EF_SpawnAbortFrame.prototype.quench=function(){};
EF_SpawnAbortFrame.prototype.abort=function(){this.aborted=true;


return this;
};
EF_SpawnAbortFrame.prototype.cont=function(val){if(this.done)return;

if(this.parent){
var current_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=this.dyn_vars;
this.dyn_vars=undefined;
this.done=true;
if(this.aborted&&!(val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&this.parent.aborted)val=new CFException('a');


if(((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type==='t'&&val.val!=null&&val.val._oniE===token_oniE)){



val=cloneAnnotatedCFX(val);


if(this.callstack){
val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}
}


cont(this.parent,this.parent_idx,val);
exports.current_dyn_vars=current_dyn_vars;
}else if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&(val.type==='t'||val.val instanceof Error)){


hold0(function(){val.mapToJS(true)});
}
};
EF_SpawnAbortFrame.prototype.resolveAbortCycle=function(spawn_frame){if(this.done)return;

var parent=this.parent;
while(parent){
if(spawn_frame===parent){






this.cont(UNDEF);
return;
}


parent=parent.parent||parent.abort_path;
}
};


function ReifiedStratumProto(){}
exports.ReifiedStratumProto=ReifiedStratumProto;


ReifiedStratumProto.prototype.waitforValue=function(){return this.value()};
ReifiedStratumProto.prototype.toString=function(){return "[object Stratum]"};


function I_spawn(ndata,env){var val,async,have_val,picked_up=false;

var value_waitarr=[];
var abort_waitarr=[];



env=copyEnv(env);
env.blscope=null;
env.blbref=null;





var stratum=new ReifiedStratumProto();
stratum.abort=function(pseudo){var dyn_vars=exports.current_dyn_vars;


if(ef.done)return UNDEF;




if(ef.in_abortion){
return new EF_SpawnAbortFrame(abort_waitarr,ef);
}



var rv=ef.abort(pseudo);

exports.current_dyn_vars=dyn_vars;

async=false;



val=new CFException("t",new StratumAborted(),ndata[0],env.file);



while(value_waitarr.length)cont(value_waitarr.shift(),val);


if((rv!==null&&typeof (rv)==='object'&&rv.__oni_ef===true)){
return new EF_SpawnAbortFrame(abort_waitarr,ef);
}


if(!(rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx)||rv.type!=='t')rv=UNDEF;

notifyAborted(rv);


if(((rv!==null&&typeof (rv)==='object'&&rv.__oni_cfx)&&rv.type==='t'&&rv.val!=null&&rv.val._oniE===token_oniE)){



rv=cloneAnnotatedCFX(rv);


throw rv.val;
}

return rv;
};

stratum.value=function(){if(!async){

picked_up=true;
if(((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&val.type==='t'&&val.val!=null&&val.val._oniE===token_oniE)){



var v=cloneAnnotatedCFX(val);


throw v.val;
}
return val;
}
return new EF_SpawnWaitFrame(value_waitarr);
};

stratum.running=function(){return async};

stratum.waiting=function(){return value_waitarr.length;

};







stratum._adopt=function(blrref){ef.env.blrref=blrref;


};

function notifyAsync(){async=true;

}
function notifyVal(_val,have_caller){if(val!==undefined)return;



val=_val;
async=false;
if(!have_caller&&!value_waitarr.length){





if((val!==null&&typeof (val)==='object'&&val.__oni_cfx)&&(val.type!='t'||val.val instanceof Error)){







setTimeout(function(){if(!picked_up)val.mapToJS(true);







},0);
}
}else{

while(value_waitarr.length)cont(value_waitarr.shift(),val);

}

}
function notifyAborted(_val){if(!(_val!==null&&typeof (_val)==='object'&&_val.__oni_cfx)||_val.type!=='t')_val=UNDEF;


while(abort_waitarr.length)cont(abort_waitarr.shift(),_val);

}

var ef=new EF_Spawn(ndata,env,notifyAsync,notifyVal,notifyAborted);


return cont(ef,0)||stratum;
}


exports.Spawn=function(...args){return {exec:I_spawn,ndata:args,__oni_dis:token_dis};





};










function EF_Collapse(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Collapse.prototype={});


EF_Collapse.prototype.__oni_collapse=true;

EF_Collapse.prototype.cont=function(idx,val){if(idx==0){

var fold=this.env.fold;
if(!fold)return new CFException("t",new Error("Unexpected collapse statement"),this.ndata,this.env.file);


if(fold.docollapse(this.env.branch,this))return true;


this.async=true;
return this;
}else if(idx==1)return this.returnToParent(true);else return this.returnToParent(new CFException("t","Internal error in SJS runtime (collapse)",this.ndata,this.env.file));





};


EF_Collapse.prototype.quench=function(){};
EF_Collapse.prototype.abort=function(){this.aborted=true;return new CFException('a')};

function I_collapse(ndata,env){return cont(new EF_Collapse(ndata,env),0);

}


exports.Collapse=function(line){return {exec:I_collapse,ndata:line,__oni_dis:token_dis};





};




function dummy(){}



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


function abort(){exports.current_dyn_vars=dyn_vars;


return new CFException('a');
}

if(duration_ms===UNDEF)return {__oni_ef:true,wait:function(){


return this},quench:dummy,abort:abort};




if(duration_ms===0){
var sus={__oni_ef:true,wait:function(){

return this},abort:abort,quench:function(){

sus=null;clear0(this.co)},co:hold0(function(){
if(sus&&sus.parent){

exports.current_dyn_vars=dyn_vars;
cont(sus.parent,sus.parent_idx,UNDEF);
exports.current_dyn_vars=null;
}
})};

return sus;
}else{

var sus={__oni_ef:true,wait:function(){

return this},abort:abort,quench:function(){

sus=null;clearTimeout(this.co)}};

sus.co=setTimeout(function(){
if(sus&&sus.parent){

exports.current_dyn_vars=dyn_vars;
cont(sus.parent,sus.parent_idx,UNDEF);
exports.current_dyn_vars=null;
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

exports.BlBreak=function(env,lbl){var e=new CFException('blb',lbl);

if(!env.blbref)throw new Error("Internal runtime error; no reference frame in BlBreak");
if(env.blbref.unreturnable&&!env.blbref.toplevel)throw new Error("Blocklambda break to inactive scope");

e.eid=env.blbref.sid;
return e;
};

exports.BlReturn=function(exp){var e=new CFException('r',exp);

if(!this.blrref)throw new Error("Internal runtime error; no reference frame in BlReturn");
if(this.blrref.unreturnable){
if(this.blrref.toplevel)throw new Error("Invalid blocklambda 'return' statement; 'return' is only allowed in blocklambdas that are nested in functions");else{



throw new Error("Blocklambda return to inactive function");
}
}
e.eid=this.blrref.sid;
return e;
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




var UA=navigator.userAgent.toLowerCase();
if(UA.indexOf(" chrome/")>=0)UA="chrome";else if(UA.indexOf(" firefox/")>=0)UA="firefox";else if(UA.indexOf(" safari/")>=0)UA="safari";else if(UA.indexOf(" msie ")>=0)UA="msie";else UA="unknown";









exports.hostenv="xbrowser";
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

this.is_empty=this.d[1]==null;
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


function ph_bl_return(exp,pctx){this.line=pctx.line;

this.exp=exp;
}
ph_bl_return.prototype=new ph();
ph_bl_return.prototype.val=function(){var v=this.exp?","+this.exp.v():"";

return "__oni_rt.Sc("+this.line+",__oni_rt.BlReturn"+v+")";

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


function ph_collapse(pctx){this.line=pctx.line;

}
ph_collapse.prototype=new ph();
ph_collapse.prototype.val=function(){return "__oni_rt.Collapse("+this.line+")";

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

function ph_bl_break(pctx,lbl){this.line=pctx.line;

this.lbl=lbl;
this.is_nblock=true;
this.js_ctx=pctx.js_ctx;
}
ph_bl_break.prototype=new ph();
ph_bl_break.prototype.nblock_val=function(){if(this.js_ctx)throw new Error("Blocklamdas cannot contain 'break' statements in __js{...} contexts");

var rv="return __oni_rt.BlBreak(this";
if(this.lbl)rv+=",'"+this.lbl+"'";
rv+=");";
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

throw {mes:"Invalid left side in destructuring assignment ",line:this.line};

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

function ph_prefix_op(id,right,pctx){this.id=id;

this.right=right;
this.line=pctx.line;
if(id==='spawn'){


pctx.decl_scopes[pctx.decl_scopes.length-1].notail=true;
this.is_nblock=false;
}else{








this.is_nblock=(pctx.allow_nblock&&right.is_nblock);
}
}
ph_prefix_op.prototype=new ph();
ph_prefix_op.prototype.is_value=true;
ph_prefix_op.prototype.nblock_val=function(){return this.id+" "+this.right.nb();

};
ph_prefix_op.prototype.val=function(){var rv;

if(this.id=="spawn")rv="__oni_rt.Spawn("+this.line+","+this.right.v()+")";else if(this.right.is_nblock){







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



function gen_function_header(pars,pctx){var code="";






var trivial=true;
var vars=[];
if(!pars.length)return "(){";

var assignments="";

try{
for(var i=0;i<pars.length;++i){
if(trivial&&!(pars[i] instanceof ph_identifier))trivial=false;


pars[i].collect_var_decls(vars);
assignments+=pars[i].destruct('arguments['+i+']');
}

if(trivial){

return "("+vars.join(",")+"){";
}

if(vars.length){
code+="var "+vars.join(',')+";";
}

code+="try{"+assignments+"}catch(e){e.__oni_stack=[["+pctx.filename+","+pars.line+"]]; throw e;}";
return '(){'+code;
}catch(e){
throw {mes:"Invalid syntax in parameter list",line:pars.line};
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

var args='',spreads=[];
for(var i=0;i<this.args.length;++i){
if(this.args[i].spread)spreads.push(i);
args+=","+this.args[i].v();
}

var flags;
if(spreads.length){
var flags=4;
args+=",["+spreads+"]";
}else flags=0;



if(this.l.is_ref){
flags|=1;
rv="__oni_rt.Fcall("+flags+","+this.line+","+this.l.ref();
}else{




rv="__oni_rt.Fcall("+flags+","+this.line+","+this.l.v();
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
this.is_nblock=pctx.allow_nblock&&is_nblock_arr(elements);

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
ph_arr_lit.prototype.destruct=function(dpath,drefs){var rv="";

for(var i=0;i<this.elements.length;++i){
rv+=this.elements[i].destruct(dpath+"["+i+"]",drefs);
}
return rv;
};
ph_arr_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.elements.length;++i)this.elements[i].collect_var_decls(vars);


};


function ph_obj_lit(props,pctx){this.props=props;

this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&(function(){for(var i=0;i<props.length;++i){


if(!props[i][2].is_nblock)return false;
}
return true;
})();


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






function ph_blocklambda(pars,body,pctx){this.code="function"+gen_function_header(pars,pctx)+body+"}";

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
this.excf=function(left,pctx){var right=parseExp(pctx,bp);



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
}else if(pctx.token.id=="]")break;else elements.push(parseExp(pctx,110,undefined,exs_flags|2));




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


S("...").exs(function(pctx,exs_flags){var lookahead_pctx=Object.assign({},pctx);



if(pctx.token.id=="<id>"&&scan(lookahead_pctx).id==')'&&is_arrow(scan(lookahead_pctx).id)){
pctx.token.value="..."+pctx.token.value;
var tok=pctx.token;
scan(pctx);
return tok.exsf(pctx);
}else if((exs_flags&2)){







var right=parseExp(pctx,119);


return gen_spread(right);
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

var e=parseExp(pctx,0,undefined,exs_flags);
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

var body=parseExp(pctx,119.5);



return new ph_arrow(undefined,body,pctx);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5);



return new ph_arrow(left,body,pctx);
});
S("=>").exs(function(pctx){

var body=parseExp(pctx,119.5);



return new ph_arrow(undefined,body,pctx,true);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5);



return new ph_arrow(left,body,pctx,true);
});

S("spawn").pre(115);

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

var decls=pctx.decl_scopes.pop();var flags=1+64;if(decls.notail)flags+=8;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exbl(this,["+flags,"])");
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

var decls=pctx.decl_scopes.pop();var flags=1;if(decls.notail)flags+=8;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exseq(arguments,this,"+pctx.filename+",["+flags,"])");
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

var id_or_pattern=parse(pctx,120),initialiser=null;
if(pctx.token.id=="="){
scan(pctx);
initialiser=parse(pctx,110);

}
decls.push([id_or_pattern,initialiser,null]);
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

if(top_decl_scope(pctx).continue_scope)return new ph_cfe("c",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_return(undefined,pctx);else throw new Error("Unexpected 'continue' statement");
});

S("break").stmt(function(pctx){var label=null;


if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;

scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).break_scope)return new ph_cfe("b",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_bl_break(pctx,label);else throw new Error("Unexpected 'break' statement");
});

S("return").stmt(function(pctx){var exp=null;


if(!isStmtTermination(pctx.token)&&!pctx.newline){
exp=parseExp(pctx);

}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).bl)return new ph_bl_return(exp,pctx);else return new ph_return(exp,pctx);
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







if(settings)for(var a=null in settings)ctx[a]=settings[a];



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


})(__oni_rt.c1={});if(!Array.isArray){

















































































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







(function(exports) {var UNDEF,arrayCtors,arrayCtorNames,c,i,_flatten,parseURLOptions,orig_console_log,orig_console_info,orig_console_warn,orig_console_error,pendingLoads,compiled_src_tag,canonical_id_to_module,github_api,github_opts;function URI(){}function filter_console_args(args){var rv,arg,i;rv=[];i=0;for(;i < args.length;++ i){arg=args[i];if(arg && arg._oniE){arg=String(arg);}rv.push(arg);}return rv;}function makeRequire(parent){var rf;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rf=function (module,settings){var opts,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){opts=exports.extendObject({},settings);},706),__oni_rt.Nb(function(){if(opts.callback)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Try(0,__oni_rt.Sc(709,function(_oniX){return rv=_oniX;},__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},708),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},708),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},708))),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return opts.callback(e)},710),__oni_rt.Nb(function(){return __oni_rt.Return();},710)),__oni_env)},0),__oni_rt.C(function(){return opts.callback(UNDEF,rv)},712),__oni_rt.Nb(function(){return __oni_rt.Return();},713)),this);else return __oni_rt.ex(__oni_rt.Sc(716,__oni_rt.Return,__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},716),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},716),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},716))),this);},706)])};rf.resolve=function (module,settings){var opts;opts=exports.extendObject({},settings);return resolve(module,rf,parent,opts);};rf.path="";rf.alias={};if(exports.require){rf.hubs=exports.require.hubs;rf.modules=exports.require.modules;rf.extensions=exports.require.extensions;}else{rf.hubs=augmentHubs(getHubs_hostenv());rf.modules={};rf.extensions=getExtensions_hostenv();}rf.url=function (relative){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(747,__oni_rt.Return,__oni_rt.Sc(747,(l)=>l.path,__oni_rt.C(function(){return resolve(relative,rf,parent)},747)))])};return __oni_rt.Return(rf);},719)])}function augmentHubs(hubs){hubs.addDefault=function (hub){if(! this.defined(hub[0])){this.unshift(hub);return true;}return false;};hubs.defined=function (prefix){var h,l,i;i=0;for(;i < this.length;i++ ){h=this[i][0];l=Math.min(h.length,prefix.length);if(h.substr(0,l) == prefix.substr(0,l)){return true;}}return false;};return hubs;}function html_sjs_extractor(html,descriptor){var re,match,src;re=/<script (?:[^>]+ )?(?:type=['"]text\/sjs['"]|main=['"]([^'"]+)['"])[^>]*>((.|[\r\n])*?)<\/script>/mg;src='';while(match=re.exec(html)){if(match[1]){src+='require("' + match[1] + '")';}else{src+=match[2];}src+=';';}if(! src){throw new Error("No sjs found in HTML file");}return default_compiler(src,descriptor);}function resolveAliases(module,aliases){var ALIAS_REST,alias_rest,alias,rv,level;ALIAS_REST=/^([^:]+):(.*)$/;rv=module;level=10;while((alias_rest=ALIAS_REST.exec(rv)) && (alias=aliases[alias_rest[1]])){if(-- level == 0){throw new Error("Too much aliasing in modulename '" + module + "'");}rv=alias + alias_rest[2];}return rv;}function resolveHubs(module,hubs,require_obj,parent,opts){var path,loader,src,resolve,level,match_prefix,i,hub;path=module;loader=opts.loader || default_loader;src=opts.src || default_src_loader;resolve=default_resolver;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}level=10;i=0;while(hub=hubs[i++ ]){match_prefix=typeof hub[0] === 'string';if((match_prefix && path.indexOf(hub[0]) === 0) || (! match_prefix && hub[0].test(path))){if(typeof hub[1] == "string"){if(match_prefix){path=hub[1] + path.substring(hub[0].length);}else{path=path.replace(hub[0],hub[1]);}i=0;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}if(-- level == 0){throw new Error("Too much indirection in hub resolution for module '" + module + "'");}}else{if(typeof hub[1] == "object"){if(hub[1].src){src=hub[1].src;}if(hub[1].loader){loader=hub[1].loader;}resolve=hub[1].resolve || loader.resolve || resolve;break;}else{throw new Error("Unexpected value for require.hubs element '" + hub[0] + "'");}}}}return {path:path,loader:loader,src:src,resolve:resolve};}function default_src_loader(path){throw new Error("Don't know how to load module at " + path);}function default_compiler(src,descriptor){var f,filename;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof (src) === 'function')return __oni_rt.ex(__oni_rt.Nb(function(){return f=src;},859),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.If(__oni_rt.Sc(862,(r)=>! r,__oni_rt.C(function(){return compiled_src_tag.exec(src)},862)),__oni_rt.Seq(0,__oni_rt.Nb(function(){filename=((descriptor.id));},864),__oni_rt.Sc(864,function(_oniX){return filename=_oniX;},__oni_rt.Sc(864,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},864),"'")),__oni_rt.Sc(867,function(_oniX){return src=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(src,{filename:filename,mode:'normal',globalReturn:true})},866)))),__oni_rt.Sc(871,function(_oniX){return f=_oniX;},__oni_rt.Fcall(2,871,__oni_rt.Nb(function(){return Function},871),"module","exports","require","__onimodulename","__oni_altns",__oni_rt.Nb(function(){return src},871)))),this);},857),__oni_rt.C(function(){return f(descriptor,descriptor.exports,descriptor.require,((descriptor.id)),{})},873)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Nb(function(){if(e instanceof SyntaxError)return __oni_rt.ex(__oni_rt.Sc(880,__oni_rt.Throw,__oni_rt.Fcall(2,880,__oni_rt.Nb(function(){return Error},880),__oni_rt.Nb(function(){return ("In module "+(descriptor.id)+": "+(e.message))},880)),880,'apollo-sys-common.sjs'),this);else return __oni_rt.ex(__oni_rt.Sc(883,__oni_rt.Throw,__oni_rt.Nb(function(){return e},883),883,'apollo-sys-common.sjs'),this);},879),__oni_env)},0)])}function checkForDependencyCycles(root_node,target_node){var deeper_cycle,name;if(! root_node.waiting_on){return false;}for(name in root_node.waiting_on){if(root_node.waiting_on[name] === target_node){return [root_node.id];}deeper_cycle=checkForDependencyCycles(root_node.waiting_on[name],target_node);if(deeper_cycle){return [root_node.id].concat(deeper_cycle);}}return false;}function default_loader(path,parent,src_loader,opts,spec){var compile,descriptor,pendingHook,dep_cycle;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[9,__oni_rt.Nb(function(){compile=exports.require.extensions[spec.type];},921),__oni_rt.Nb(function(){if(! compile)return __oni_rt.ex(__oni_rt.Sc(922,__oni_rt.Throw,__oni_rt.Fcall(2,922,__oni_rt.Nb(function(){return Error},922),__oni_rt.Nb(function(){return "Unknown type '" + spec.type + "'"},922)),922,'apollo-sys-common.sjs'),this);},921),__oni_rt.Nb(function(){descriptor=exports.require.modules[path];pendingHook=pendingLoads[path];},925),__oni_rt.Nb(function(){if((! descriptor && ! pendingHook) || opts.reload)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return descriptor={id:path,exports:{},loaded_by:parent,required_by:{}};},936),__oni_rt.Sc(1006,function(_oniX){return pendingHook=_oniX;},__oni_rt.Sc(1006,function(_oniX){return pendingLoads[path]=_oniX;},__oni_rt.Spawn(1006,__oni_rt.C(function(){return (function (){var src,loaded_from,canonical_id;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Alt(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof src_loader === "string")return __oni_rt.ex(__oni_rt.Nb(function(){src=src_loader;loaded_from="[src string]";},0),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(path in __oni_rt.modsrc)return __oni_rt.ex(__oni_rt.Nb(function(){loaded_from="[builtin]";src=__oni_rt.modsrc[path];delete __oni_rt.modsrc[path];},0),this);else return __oni_rt.ex(__oni_rt.Sc(957,function(_oniX){src=_oniX.src;loaded_from=_oniX.loaded_from;return _oniX;},__oni_rt.C(function(){return src_loader(path)},957)),this);},947),this);},941),__oni_rt.Nb(function(){descriptor.loaded_from=loaded_from;descriptor.require=makeRequire(descriptor);canonical_id=null;descriptor.getCanonicalId=function (){return canonical_id;};descriptor.setCanonicalId=function (id){var canonical;if(id == null){throw new Error("Canonical ID cannot be null");}if(canonical_id !== null){throw new Error("Canonical ID is already defined for module " + path);}canonical=canonical_id_to_module[id];if(canonical != null){throw new Error("Canonical ID " + id + " is already defined in module " + canonical.id);}canonical_id=id;canonical_id_to_module[id]=descriptor;};if(opts.main){descriptor.require.main=descriptor;}exports.require.modules[path]=descriptor;},0),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.C(function(){return compile(src,descriptor)},992),__oni_rt.Nb(function(){return __oni_rt.Return(descriptor);},993)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},995),__oni_rt.Sc(996,__oni_rt.Throw,__oni_rt.Nb(function(){return e},996),996,'apollo-sys-common.sjs')),__oni_env)},0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},998))),__oni_rt.Suspend(function(__oni_env,resume){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(0)},1002),__oni_rt.Nb(function(){return pendingHook.resume=resume;},1003)),__oni_env)}, function() {}))])})()},1006)))),__oni_rt.Nb(function(){return pendingHook.pending_descriptor=descriptor;},1008)),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(! descriptor)return __oni_rt.ex(__oni_rt.Nb(function(){return descriptor=pendingHook.pending_descriptor;},1011),this);},1010),this);},927),__oni_rt.Nb(function(){if(pendingHook)return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){if(! parent.waiting_on){parent.waiting_on={};}parent.waiting_on[path]=descriptor;dep_cycle=checkForDependencyCycles(descriptor,parent);},0),__oni_rt.Nb(function(){if(dep_cycle)return __oni_rt.ex(__oni_rt.Sc(1026,__oni_rt.Throw,__oni_rt.Fcall(2,1026,__oni_rt.Nb(function(){return Error},1026),__oni_rt.Sc(1026,__oni_rt.infix['+'],__oni_rt.Nb(function(){return ("Cyclic require() dependency: "+(parent.id)+" -> ")},1026),__oni_rt.C(function(){return dep_cycle.join(' -> ')},1026))),1026,'apollo-sys-common.sjs'),this);},1025),__oni_rt.C(function(){return pendingHook.waitforValue()},1028),__oni_rt.Nb(function(){return delete parent.waiting_on[path];},1037)),0,__oni_rt.If(__oni_rt.Sc(1050,__oni_rt.infix['=='],__oni_rt.C(function(){return pendingHook.waiting()},1050),0),__oni_rt.Nb(function(){return delete pendingLoads[path]},1051)),__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Sc(1043,__oni_rt.infix['=='],__oni_rt.C(function(){return pendingHook.waiting()},1043),0),__oni_rt.Nb(function(){return pendingHook.resume},1043)),__oni_rt.Seq(0,__oni_rt.C(function(){return pendingHook.resume()},1044),__oni_rt.C(function(){return pendingHook.value()},1045)))),this);},1014),__oni_rt.Nb(function(){if(! descriptor.required_by[parent.id]){descriptor.required_by[parent.id]=1;}else{++ descriptor.required_by[parent.id];}return __oni_rt.Return(descriptor.exports);},1055)])}function default_resolver(spec){if(! spec.ext && spec.path.charAt(spec.path.length - 1) !== '/'){spec.path+="." + spec.type;}}function http_src_loader(path){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1073,__oni_rt.Return,__oni_rt.Sc(1073,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.C(function(){return request_hostenv([path,{format:'compiled'}],{mime:'text/plain'})},1071),__oni_rt.Nb(function(){return path},1073)))])}function github_src_loader(path){var user,repo,tag,url,data,str;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Sc(1086,function(_oniX){user=_oniX[1];repo=_oniX[2];tag=_oniX[3];path=_oniX[4];return _oniX;},__oni_rt.C(function(){return /github:\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path)},1086)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Sc(1087,__oni_rt.Throw,__oni_rt.Fcall(2,1087,__oni_rt.Nb(function(){return Error},1087),__oni_rt.Nb(function(){return "Malformed module id '" + path + "'"},1087)),1087,'apollo-sys-common.sjs'),__oni_env)},0),__oni_rt.Sc(1091,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(github_api,'repos',user,repo,"contents",path,{ref:tag})},1089)),__oni_rt.Alt(__oni_rt.Sc(1093,function(_oniX){return data=_oniX;},__oni_rt.Sc(1092,(l)=>l.data,__oni_rt.C(function(){return jsonp_hostenv(url,github_opts)},1092))),__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(10000)},1095),__oni_rt.Sc(1096,__oni_rt.Throw,__oni_rt.Fcall(2,1096,__oni_rt.Nb(function(){return Error},1096),"Github timeout"),1096,'apollo-sys-common.sjs'))),__oni_rt.Nb(function(){if(data.message && ! data.content)return __oni_rt.ex(__oni_rt.Sc(1099,__oni_rt.Throw,__oni_rt.Fcall(2,1099,__oni_rt.Nb(function(){return Error},1099),__oni_rt.Nb(function(){return data.message},1099)),1099,'apollo-sys-common.sjs'),this);},1098),__oni_rt.Sc(1104,function(_oniX){return str=_oniX;},__oni_rt.C(function(){return exports.require('sjs:string')},1102)),__oni_rt.Sc(1107,__oni_rt.Return,__oni_rt.Sc(1107,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.Fcall(1,1105,__oni_rt.Nb(function() { return [str,'utf8ToUtf16']},1105),__oni_rt.C(function(){return str.base64ToOctets(data.content)},1105)),__oni_rt.Nb(function(){return url},1107)))])}function resolve(module,require_obj,parent,opts){var path,hubs,resolveSpec,ext,extMatch,preload,pendingHubs,deleteHubs,entries,parent,resolved,ent,i,k,i,path,contents;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1115,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveAliases(module,require_obj.alias)},1113)),__oni_rt.Nb(function(){hubs=exports.require.hubs;},1117),__oni_rt.Sc(1120,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolveHubs(path,hubs,require_obj,parent,opts || {})},1117)),__oni_rt.Nb(function(){resolveSpec.path=exports.normalizeURL(resolveSpec.path,parent.id);extMatch=/.+\.([^\.\/]+)$/.exec(resolveSpec.path);if(extMatch){ext=extMatch[1].toLowerCase();resolveSpec.ext=ext;if(! exports.require.extensions[ext]){ext=null;}}if(! ext){if(parent.id.substr(- 3) === '.js'){resolveSpec.type='js';}else{resolveSpec.type='sjs';}}else{resolveSpec.type=ext;}},1120),__oni_rt.C(function(){return resolveSpec.resolve(resolveSpec,parent)},1140),__oni_rt.Nb(function(){preload=__oni_rt.G.__oni_rt_bundle;pendingHubs=false;if(preload.h){deleteHubs=[];for(k in preload.h){if(! Object.prototype.hasOwnProperty.call(preload.h,k)){continue;}entries=preload.h[k];parent=getTopReqParent_hostenv();resolved=resolveHubs(k,hubs,exports.require,parent,{});if(resolved.path === k){pendingHubs=true;continue;}i=0;for(;i < entries.length;i++ ){ent=entries[i];preload.m[resolved.path + ent[0]]=ent[1];}deleteHubs.push(k);}if(! pendingHubs){delete preload.h;}else{i=0;for(;i < deleteHubs.length;i++ ){delete preload.h[deleteHubs[i]];}}}if(module in __oni_rt.modsrc){if(! preload.m){preload.m={};}preload.m[resolveSpec.path]=__oni_rt.modsrc[module];delete __oni_rt.modsrc[module];}if(preload.m){path=resolveSpec.path;if(path.indexOf('!sjs',path.length - 4) !== - 1){path=path.slice(0,- 4);}contents=preload.m[path];if(contents !== undefined){resolveSpec.src=function (){delete preload.m[path];return {src:contents,loaded_from:path + "#bundle"};};}}return __oni_rt.Return(resolveSpec);},0)])}function requireInner(module,require_obj,parent,opts){var resolveSpec;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1219,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolve(module,require_obj,parent,opts)},1216)),__oni_rt.Sc(1219,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts,resolveSpec)},1219)),__oni_rt.Nb(function(){return __oni_rt.Return(module);},1221)])}function requireInnerMultiple(modules,require_obj,parent,opts){var rv;function inner(i,l){var descriptor,id,exclude,include,name,module,addSym,o,i,o,split;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(l === 1)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor=modules[i];if(typeof descriptor === 'string'){id=descriptor;exclude=[];include=null;name=null;}else{id=descriptor.id;exclude=descriptor.exclude || [];include=descriptor.include || null;name=descriptor.name || null;}},1233),__oni_rt.Sc(1250,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return requireInner(id,require_obj,parent,opts)},1247)),__oni_rt.Nb(function(){addSym=function (k,v){if(rv[k] !== undefined){if(rv[k] === v){return;}throw new Error(("require([.]) name clash while merging module '"+(id)+"': Symbol '"+(k)+"' defined in multiple modules"));}rv[k]=v;};if(name){addSym(name,module);}else{if(include){i=0;for(;i < include.length;i++ ){o=include[i];if(! (o in module)){throw new Error(("require([.]) module "+(id)+" has no symbol "+(o)));}addSym(o,module[o]);}}else{for(o in module){if(exclude.indexOf(o) !== - 1){continue;}addSym(o,module[o]);}}}},0)),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(1280,function(_oniX){return split=_oniX;},__oni_rt.C(function(){return Math.floor(l / 2)},1279)),__oni_rt.Par(__oni_rt.C(function(){return inner(i,split)},1281),__oni_rt.C(function(){return inner(i + split,l - split)},1284))),this);},1231)])}return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rv={};},1230),__oni_rt.Nb(function(){if(modules.length !== 0)return __oni_rt.ex(__oni_rt.C(function(){return inner(0,modules.length)},1290),this);},1290),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},1291)])}__oni_rt.exseq(this ? this.arguments : undefined,this,'apollo-sys-common.sjs',[24,__oni_rt.Nb(function(){__oni_rt.sys=exports;if(! (__oni_rt.G.__oni_rt_bundle)){__oni_rt.G.__oni_rt_bundle={};}exports.hostenv=__oni_rt.hostenv;exports.getGlobal=function (){return __oni_rt.G;};exports.withDynVarContext=function (){var old_dyn_vars,proto_context,block;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){old_dyn_vars=__oni_rt.current_dyn_vars;},94),__oni_rt.Nb(function(){if(this.aobj.length === 1)return __oni_rt.ex(__oni_rt.Nb(function(){proto_context=old_dyn_vars;return block=this.aobj[0];},96),this);else return __oni_rt.ex(__oni_rt.Nb(function(){proto_context=this.aobj[0];return block=this.aobj[1];},100),this);},95),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=Object.create(proto_context);},105),__oni_rt.C(function(){return block()},106)),0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=old_dyn_vars;},109))])};exports.getCurrentDynVarContext=function (){return __oni_rt.current_dyn_vars;};exports.setDynVar=function (name,value){var key;if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to retrieve "+(name)));}key='$' + name;__oni_rt.current_dyn_vars[key]=value;};exports.clearDynVar=function (name){var key;if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to clear "+(name)));}key='$' + name;delete __oni_rt.current_dyn_vars[key];};exports.getDynVar=function (name,default_val){var key;key='$' + name;if(__oni_rt.current_dyn_vars === null){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist (no dynamic variable context)"));}}if(! (key in __oni_rt.current_dyn_vars)){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist"));}}return __oni_rt.current_dyn_vars[key];};arrayCtors=[];arrayCtorNames=['Uint8Array','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array','Float32Array','Float64Array','NodeList','HTMLCollection','FileList','StaticNodeList','DataTransferItemList'];i=0;for(;i < arrayCtorNames.length;i++ ){c=__oni_rt.G[arrayCtorNames[i]];if(c){arrayCtors.push(c);}}exports.isArrayLike=function (obj){var i;if(Array.isArray(obj) || ! ! (obj && Object.prototype.hasOwnProperty.call(obj,'callee'))){return true;}i=0;for(;i < arrayCtors.length;i++ ){if(obj instanceof arrayCtors[i]){return true;}}return false;};_flatten=function (arr,rv){var l,elem,i;l=arr.length;i=0;for(;i < l;++ i){elem=arr[i];if(exports.isArrayLike(elem)){_flatten(elem,rv);}else{rv.push(elem);}}};exports.flatten=function (arr){var rv;rv=[];if(arr.length === UNDEF){throw new Error("flatten() called on non-array");}_flatten(arr,rv);return rv;};exports.expandSingleArgument=function (args){if(args.length == 1 && exports.isArrayLike(args[0])){args=args[0];}return args;};exports.isReifiedStratum=function (obj){return (obj instanceof __oni_rt.ReifiedStratumProto);};exports.isQuasi=function (obj){return (obj instanceof __oni_rt.QuasiProto);};exports.Quasi=function (arr){return __oni_rt.Quasi.apply(__oni_rt,arr);};exports.mergeObjects=function (){var rv,sources,i;rv={};sources=exports.expandSingleArgument(arguments);i=0;for(;i < sources.length;i++ ){exports.extendObject(rv,sources[i]);}return rv;};exports.extendObject=function (dest,source){var o;for(o in source){if(Object.prototype.hasOwnProperty.call(source,o)){dest[o]=source[o];}}return dest;};exports.overrideObject=function (dest,...sources){var sources,h,hl,source,h,o;sources=exports.flatten(sources);h=sources.length - 1;for(;h >= 0;-- h){if(sources[h] == null){sources.splice(h,1);}}hl=sources.length;if(hl){for(o in dest){h=hl - 1;for(;h >= 0;-- h){source=sources[h];if(o in source){dest[o]=source[o];break;}}}}return dest;};URI.prototype={toString:function (){return ((this.protocol)+"://"+(this.authority)+(this.relative));}};URI.prototype.params=function (){var rv;if(! this._params){rv={};this.query.replace(parseURLOptions.qsParser,function (_,k,v){if(k){rv[decodeURIComponent(k)]=decodeURIComponent(v);}});this._params=rv;}return this._params;};parseURLOptions={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],qsParser:/(?:^|&)([^&=]*)=?([^&]*)/g,parser:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:\/@]*)(?::([^:\/@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/};exports.parseURL=function (str){var o,m,uri,i;o=parseURLOptions;m=o.parser.exec(str);uri=new URI();i=14;while(i-- ){uri[o.key[i]]=m[i] || "";}return uri;};exports.encodeURIComponentRFC3986=function (str){return encodeURIComponent(str).replace(/[!'()*]/g,function (c){return '%' + c.charCodeAt(0).toString(16);});};exports.constructQueryString=function (){var hashes,hl,parts,hash,l,val,i,q,h;hashes=exports.flatten(arguments);hl=hashes.length;parts=[];h=0;for(;h < hl;++ h){hash=hashes[h];for(q in hash){l=encodeURIComponent(q) + "=";val=hash[q];if(! exports.isArrayLike(val)){parts.push(l + encodeURIComponent(val));}else{i=0;for(;i < val.length;++ i){parts.push(l + encodeURIComponent(val[i]));}}}}return parts.join("&");};exports.constructURL=function (){var url_spec,l,rv,comp,k,i,qparts,part,query;url_spec=exports.flatten(arguments);l=url_spec.length;i=0;for(;i < l;++ i){comp=url_spec[i];if(exports.isQuasi(comp)){comp=comp.parts.slice();k=1;for(;k < comp.length;k+=2){comp[k]=exports.encodeURIComponentRFC3986(comp[k]);}comp=comp.join('');}else{if(typeof comp != "string"){break;}}if(rv !== undefined){if(rv.charAt(rv.length - 1) != "/"){rv+="/";}rv+=comp.charAt(0) == "/"?comp.substr(1):comp;}else{rv=comp;}}qparts=[];for(;i < l;++ i){part=exports.constructQueryString(url_spec[i]);if(part.length){qparts.push(part);}}query=qparts.join("&");if(query.length){if(rv.indexOf("?") != - 1){rv+="&";}else{rv+="?";}rv+=query;}return rv;};exports.isSameOrigin=function (url1,url2){var a1,a2;a1=exports.parseURL(url1).authority;if(! a1){return true;}a2=exports.parseURL(url2).authority;return ! a2 || (a1 == a2);};exports.normalizeURL=function (url,base){var a,pin,l,pout,c,i,rv;if(__oni_rt.hostenv == "nodejs" && __oni_rt.G.process.platform == 'win32'){url=url.replace(/\\/g,"/");base=base.replace(/\\/g,"/");}a=exports.parseURL(url);if(base && (base=exports.parseURL(base)) && (! a.protocol || a.protocol == base.protocol)){if(! a.directory && ! a.protocol){a.directory=base.directory;if(! a.path && (a.query || a.anchor)){a.file=base.file;}}else{if(a.directory && a.directory.charAt(0) != '/'){a.directory=(base.directory || "/") + a.directory;}}if(! a.protocol){a.protocol=base.protocol;if(! a.authority){a.authority=base.authority;}}}a.directory=a.directory.replace(/\/\/+/g,'/');pin=a.directory.split("/");l=pin.length;pout=[];i=0;for(;i < l;++ i){c=pin[i];if(c == "."){continue;}if(c == ".."){if(pout.length > 1){pout.pop();}}else{pout.push(c);}}if(a.file === '.'){a.file='';}else{if(a.file === '..'){if(pout.length > 2){pout.splice(- 2,1);}a.file='';}}a.directory=pout.join("/");rv="";if(a.protocol){rv+=a.protocol + ":";}if(a.authority){rv+="//" + a.authority;}else{if(a.protocol == "file"){rv+="//";}}rv+=a.directory + a.file;if(a.query){rv+="?" + a.query;}if(a.anchor){rv+="#" + a.anchor;}return rv;};exports.jsonp=jsonp_hostenv;exports.getXDomainCaps=getXDomainCaps_hostenv;exports.request=request_hostenv;exports.makeMemoizedFunction=function (f,keyfn){var lookups_in_progress,memoizer;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){lookups_in_progress={};memoizer=function (){var key,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[9,__oni_rt.Sc(617,function(_oniX){return key=_oniX;},__oni_rt.If(__oni_rt.Nb(function(){return keyfn},616),__oni_rt.C(function(){return keyfn.apply(this.tobj,this.aobj)},616),__oni_rt.Nb(function(){return this.aobj[0]},616))),__oni_rt.Nb(function(){rv=memoizer.db[key];},618),__oni_rt.Nb(function(){if(typeof rv !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(rv);},618),this);},618),__oni_rt.Nb(function(){if(! lookups_in_progress[key])return __oni_rt.ex(__oni_rt.Sc(622,function(_oniX){return lookups_in_progress[key]=_oniX;},__oni_rt.Spawn(622,__oni_rt.C(function(){return (function (self,args){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(621,__oni_rt.Return,__oni_rt.Sc(621,function(_oniX){return memoizer.db[key]=_oniX;},__oni_rt.C(function(){return f.apply(self,args)},621)))])})(this.tobj,this.aobj)},622))),this);},619),__oni_rt.Try(0,__oni_rt.Sc(624,__oni_rt.Return,__oni_rt.C(function(){return lookups_in_progress[key].waitforValue()},624)),0,__oni_rt.If(__oni_rt.Sc(627,__oni_rt.infix['=='],__oni_rt.C(function(){return lookups_in_progress[key].waiting()},627),0),__oni_rt.Seq(0,__oni_rt.C(function(){return lookups_in_progress[key].abort()},628),__oni_rt.Nb(function(){return delete lookups_in_progress[key];},629))))])};memoizer.db={};return __oni_rt.Return(memoizer);},615)])};if(console){orig_console_log=console.log;orig_console_info=console.info;orig_console_warn=console.warn;orig_console_error=console.error;console.log=function (){return orig_console_log.apply(console,filter_console_args(arguments));};console.info=function (){return orig_console_info.apply(console,filter_console_args(arguments));};console.warn=function (){return orig_console_warn.apply(console,filter_console_args(arguments));};console.error=function (){return orig_console_error.apply(console,filter_console_args(arguments));};}exports.eval=eval_hostenv;pendingLoads={};exports._makeRequire=makeRequire;compiled_src_tag=/^\/\*\__oni_compiled_sjs_1\*\//;default_compiler.module_args=['module','exports','require','__onimodulename','__oni_altns'];canonical_id_to_module={};github_api="https://api.github.com/";github_opts={cbfield:"callback"};exports.resolve=function (url,require_obj,parent,opts){require_obj=require_obj || exports.require;parent=parent || getTopReqParent_hostenv();opts=opts || {};return resolve(url,require_obj,parent,opts);};exports.require=makeRequire(getTopReqParent_hostenv());exports.require.modules['builtin:apollo-sys.sjs']={id:'builtin:apollo-sys.sjs',exports:exports,loaded_from:"[builtin]",required_by:{"[system]":1}};return exports.init=function (cb){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.C(function(){return init_hostenv()},1305),__oni_rt.C(function(){return cb()},1306)])};},55)])
var location,jsonp_req_count,jsonp_cb_obj,XHR_caps,activex_xhr_ver,IE_resume_counter;function determineLocation(){var scripts,matches,i;if(! location){location={};scripts=document.getElementsByTagName("script");i=0;for(;i < scripts.length;++ i){if((matches=/^(.*\/)(?:[^\/]*)stratified(?:[^\/]*)\.js(?:\?.*)?$/.exec(scripts[i].src))){location.location=exports.normalizeURL(matches[1] + "modules/",document.location.href);location.requirePrefix=scripts[i].getAttribute("require-prefix");location.req_base=scripts[i].getAttribute("req-base") || document.location.href;location.main=scripts[i].getAttribute("main");location.noInlineScripts=scripts[i].getAttribute("no-inline-scripts");location.waitForBundle=scripts[i].getAttribute("wait-for-bundle");break;}}if(! location.req_base){location.req_base=document.location.href;}}return location;}function jsonp_hostenv(url,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({iframe:false,cbfield:"callback"},settings);url=exports.constructURL(url,opts.query);},0),__oni_rt.Nb(function(){if(opts.iframe || opts.forcecb)return __oni_rt.ex(__oni_rt.Sc(112,__oni_rt.Return,__oni_rt.C(function(){return jsonp_iframe(url,opts)},112)),this);else return __oni_rt.ex(__oni_rt.Sc(114,__oni_rt.Return,__oni_rt.C(function(){return jsonp_indoc(url,opts)},114)),this);},111)])}function jsonp_indoc(url,opts){var cb,cb_query,elem,complete,readystatechange,error,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! window[jsonp_cb_obj]){window[jsonp_cb_obj]={};}cb="cb" + (jsonp_req_count++ );cb_query={};cb_query[opts.cbfield]=jsonp_cb_obj + "." + cb;url=exports.constructURL(url,cb_query);elem=document.createElement("script");elem.setAttribute("src",url);elem.setAttribute("async","async");elem.setAttribute("type","text/javascript");complete=false;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){window[jsonp_cb_obj][cb]=resume;return document.getElementsByTagName("head")[0].appendChild(elem);},136),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Nb(function(){if(elem.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.addEventListener("error",resume,false)},141),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){readystatechange=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(elem.readyState == 'loaded' && ! complete)return __oni_rt.ex(__oni_rt.Fcall(0,144,__oni_rt.Nb(function(){return resume},144),__oni_rt.Fcall(2,144,__oni_rt.Nb(function(){return Error},144),"script loaded but `complete` flag not set")),this);},144)])};},146),__oni_rt.C(function(){return elem.attachEvent("onreadystatechange",readystatechange)},146)),this);},140),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(elem.removeEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.removeEventListener("error",resume,false)},151),this);else return __oni_rt.ex(__oni_rt.C(function(){return elem.detachEvent("onreadystatechange",readystatechange)},153),this);},150)),this)},155),__oni_rt.Sc(155,__oni_rt.Throw,__oni_rt.Fcall(2,155,__oni_rt.Nb(function(){return Error},155),__oni_rt.Nb(function(){return "Could not complete JSONP request to '" + url + "'" + (error?"\n" + error.message:"")},155)),155,'apollo-sys-xbrowser.sjs')),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.Seq(0,__oni_rt.C(function(){return elem.parentNode.removeChild(elem)},158),__oni_rt.Nb(function(){return delete window[jsonp_cb_obj][cb];},159))),this)},161),__oni_rt.Nb(function(){complete=true;return __oni_rt.Return(rv);},161)])}function jsonp_iframe(url,opts){var cb,cb_query,iframe,doc,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){cb=opts.forcecb || "R";cb_query={};if(opts.cbfield){cb_query[opts.cbfield]=cb;}url=exports.constructURL(url,cb_query);iframe=document.createElement("iframe");document.getElementsByTagName("head")[0].appendChild(iframe);doc=iframe.contentWindow.document;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return doc.open()},178),__oni_rt.Nb(function(){return iframe.contentWindow[cb]=resume;},179),__oni_rt.C(function(){return __oni_rt.Hold(0)},182),__oni_rt.C(function(){return doc.write("\x3Cscript type='text/javascript' src=\"" + url + "\">\x3C/script>")},183),__oni_rt.C(function(){return doc.close()},184)),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.C(function(){return iframe.parentNode.removeChild(iframe)},187)),this)},191),__oni_rt.C(function(){return __oni_rt.Hold(0)},191),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},192)])}function getXHRCaps(){if(! XHR_caps){XHR_caps={};if(__oni_rt.G.XMLHttpRequest){XHR_caps.XHR_ctor=function (){return new XMLHttpRequest();};}else{XHR_caps.XHR_ctor=function (){var req,v;if(typeof activex_xhr_ver !== 'undefined'){return new ActiveXObject(activex_xhr_ver);}for(v in {"MSXML2.XMLHTTP.6.0":1,"MSXML2.XMLHTTP.3.0":1,"MSXML2.XMLHTTP":1}){try{req=new ActiveXObject(v);activex_xhr_ver=v;return req;}catch(e){;}}throw new Error("Browser does not support XMLHttpRequest");};}XHR_caps.XHR_CORS=("withCredentials" in XHR_caps.XHR_ctor());if(! XHR_caps.XHR_CORS){XHR_caps.XDR=(typeof __oni_rt.G.XDomainRequest !== 'undefined');}XHR_caps.CORS=(XHR_caps.XHR_CORS || XHR_caps.XDR)?"CORS":"none";}return XHR_caps;}function getXDomainCaps_hostenv(){return getXHRCaps().CORS;}function getTopReqParent_hostenv(){var base;base=determineLocation().req_base;return {id:base,loaded_from:base,required_by:{"[system]":1}};}function resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(req_obj.path && req_obj.path.length){url_string=exports.constructURL(req_obj.path,url_string);}return exports.normalizeURL(url_string,parent.id);}function request_hostenv(url,settings){var opts,caps,req,h,error,txt,err;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({method:"GET",body:null,response:'string',throwing:true},settings);url=exports.constructURL(url,opts.query);caps=getXHRCaps();if(! caps.XDR || exports.isSameOrigin(url,document.location)){req=caps.XHR_ctor();req.open(opts.method,url,true,opts.username || "",opts.password || "");}else{req=new XDomainRequest();req.open(opts.method,url);}},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume()},300)])};req.onerror=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},301)])};return req.onabort=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},302)])};},300),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=function (evt){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(req.readyState != 4)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return();},307),this);else return __oni_rt.ex(__oni_rt.C(function(){return resume()},309),this);},306)])};},310),this);},299),__oni_rt.Nb(function(){if(opts.headers && req.setRequestHeader){for(h in opts.headers){req.setRequestHeader(h,opts.headers[h]);}}if(opts.mime && req.overrideMimeType){req.overrideMimeType(opts.mime);}if(opts.response === 'arraybuffer'){req.responseType='arraybuffer';}req.send(opts.body);},0)),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=null;req.onerror=null;return req.onabort=null;},333),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=null},338),this);},332),__oni_rt.C(function(){return req.abort()},329)),this)},342),__oni_rt.If(__oni_rt.Seq(2,__oni_rt.Nb(function(){return error},342),__oni_rt.Seq(4,__oni_rt.Nb(function(){return typeof req.status !== 'undefined'},343),__oni_rt.Sc(344,(r)=>! r,__oni_rt.Sc(344,__oni_rt.infix['in'],__oni_rt.Fcall(1,344,__oni_rt.Sc(344,(l)=>[l,'charAt'],__oni_rt.C(function(){return req.status.toString()},344)),0),__oni_rt.Nb(function(){return {'0':1,'2':1}},344))))),__oni_rt.Seq(0,__oni_rt.Nb(function(){if(opts.throwing){txt="Failed " + opts.method + " request to '" + url + "'";if(req.statusText){txt+=": " + req.statusText;}if(req.status){txt+=" (" + req.status + ")";}err=new Error(txt);err.status=req.status;err.data=req.response;throw err;}},345),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return("");},356),this);},355))),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(req.responseText);},361),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(opts.response === 'arraybuffer')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.response,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},366)])}});},367),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.responseText,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},374)])}});},375),this);},362),this);},360)])}function getHubs_hostenv(){return [["sjs:",determineLocation().location || {src:function (path){throw new Error("Can't load module '" + path + "': The location of the StratifiedJS standard module lib is unknown - it can only be inferred automatically if you load stratified.js in the normal way through a <script> element.");}}],["github:",{src:github_src_loader}],["http:",{src:http_src_loader}],["https:",{src:http_src_loader}],["file:",{src:http_src_loader}],["x-wmapp1:",{src:http_src_loader}],["local:",{src:http_src_loader}]];}function getExtensions_hostenv(){return {'sjs':default_compiler,'js':function (src,descriptor){var f;f=new Function("module","exports","require",src + ("\n//# sourceURL="+(descriptor.id)));return f.apply(descriptor.exports,[descriptor,descriptor.exports,descriptor.require]);},'html':html_sjs_extractor};}function eval_hostenv(code,settings){var filename,mode,js;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(__oni_rt.UA == "msie" && __oni_rt.G.execScript)return __oni_rt.ex(__oni_rt.Sc(422,__oni_rt.Return,__oni_rt.C(function(){return eval_msie(code,settings)},422)),this);},421),__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},425),__oni_rt.Sc(425,function(_oniX){return filename=_oniX;},__oni_rt.Sc(425,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},425),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},427),__oni_rt.Sc(428,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(code,{filename:filename,mode:mode})},427)),__oni_rt.Sc(428,__oni_rt.Return,__oni_rt.C(function(){return __oni_rt.G.eval(js)},428))])}function eval_msie(code,settings){var filename,mode,rc,js,rv,isexception;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},441),__oni_rt.Sc(441,function(_oniX){return filename=_oniX;},__oni_rt.Sc(441,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},441),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},443),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Suspend(function(__oni_env,resume){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){rc=++ IE_resume_counter;return __oni_rt.IE_resume[rc]=resume;},446),__oni_rt.Sc(450,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile("try{" + code + "\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume[" + rc + "](rv[0],rv[1])) }",{filename:filename,mode:mode})},448)),__oni_rt.C(function(){return __oni_rt.G.execScript(js)},450)),__oni_env)}, function() {rv=arguments[0];isexception=arguments[1];}),__oni_rt.Nb(function(){if(isexception)return __oni_rt.ex(__oni_rt.Sc(452,__oni_rt.Throw,__oni_rt.Nb(function(){return rv},452),452,'apollo-sys-xbrowser.sjs'),this);},452)),0,__oni_rt.Nb(function(){return delete __oni_rt.IE_resume[rc];},455)),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},457)])}function init_hostenv(){}function runScripts(){var scripts,ss,s,i,s,m,content,descriptor,f,i,mainModule;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.If(__oni_rt.Sc(481,(l)=>l.waitForBundle,__oni_rt.C(function(){return determineLocation()},481)),__oni_rt.Nb(function(){if(__oni_rt_bundle.h === undefined)return __oni_rt.ex(__oni_rt.Nb(function(){__oni_rt_bundle_hook=runScripts;return __oni_rt.Return();},485),this);},483)),__oni_rt.If(__oni_rt.Sc(490,(r)=>! r[0][r[1]],__oni_rt.Sc(490,(l)=>[l,'noInlineScripts'],__oni_rt.C(function(){return determineLocation()},490))),__oni_rt.Seq(0,__oni_rt.Nb(function(){scripts=document.getElementsByTagName("script");ss=[];i=0;for(;i < scripts.length;++ i){s=scripts[i];if(s.getAttribute("type") == "text/sjs"){ss.push(s);}}},0),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},533),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < ss.length},510),__oni_rt.Nb(function(){return ++ i},510),__oni_rt.Nb(function(){s=ss[i];m=s.getAttribute("module");content=s.textContent || s.innerHTML;if(__oni_rt.UA == "msie"){content=content.replace(/\r\n/,"");}},0),__oni_rt.Nb(function(){if(m)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.modsrc[m]=content},522),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor={id:document.location.href + "_inline_sjs_" + (i + 1)};return __oni_rt.sys.require.main=descriptor;},527),__oni_rt.Sc(530,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module, __onimodulename){" + content + "\n})",{filename:("module "+(descriptor.id))})},528)),__oni_rt.C(function(){return f(descriptor)},530)),this);},521))))),__oni_rt.Nb(function(){mainModule=determineLocation().main;},535),__oni_rt.Nb(function(){if(mainModule)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.sys.require(mainModule,{main:true})},536),this);},535)])}__oni_rt.exseq(this ? this.arguments : undefined,this,'apollo-sys-xbrowser.sjs',[24,__oni_rt.Nb(function(){if(determineLocation().requirePrefix){__oni_rt.G[determineLocation().requirePrefix]={require:__oni_rt.sys.require};}else{__oni_rt.G.require=__oni_rt.sys.require;}jsonp_req_count=0;jsonp_cb_obj="_oni_jsonpcb";IE_resume_counter=0;__oni_rt.IE_resume={};return window.onerror=function (a,b,c,d,e){if(e){console.error("Uncaught " + e.toString());return true;}};},78),__oni_rt.Nb(function(){if(! __oni_rt.G.__oni_rt_no_script_load)return __oni_rt.ex(__oni_rt.Nb(function(){if(document.readyState === "complete" || document.readyState === "interactive")return __oni_rt.ex(__oni_rt.C(function(){return runScripts()},541),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(__oni_rt.G.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.addEventListener("DOMContentLoaded",runScripts,true)},545),this);else return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.attachEvent("onload",runScripts)},547),this);},544),this);},540),this);},478)])})({})