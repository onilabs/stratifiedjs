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


if(exports.hostenv!=='nodejs'){


e.stack='';
return;
}
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
stack=stack.trim();
e.stack="";
var lines=stack.split("\n");
var i;
for(i=0;i<lines.length;i++ ){

if((caller_module&&lines[i].indexOf(caller_module)!==-1)||lines[i].indexOf("stratified-node.js")!==-1||lines[i].indexOf("stratified.js")!==-1){



break;
}
e.__oni_stack.push([lines[i]]);
}
}

var token_oniE={};
function CFException(type,value,line,file){this.type=type;

this.val=value;

if(type=="t"&&(value instanceof Error||(typeof value=='object'&&value.message))){

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







if(uncaught&&this.val.__oni_stack){
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


}else if(!this.ef)throw new Error(this.toString());else throw this;




}};










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

function is_ef(obj){return obj&&obj.__oni_ef;

}
exports.is_ef=is_ef;

function setEFProto(t){for(var p=null in EF_Proto)t[p]=EF_Proto[p]}




function mergeCallstacks(target_ef,src_ef){if(target_ef.callstack){





target_ef.callstack=target_ef.callstack.concat(src_ef.callstack);
if(target_ef.callstack.length>20)target_ef.callstack.splice(20/2,target_ef.callstack.length-20+1,['    ...(frames omitted)']);



}else{


target_ef.callstack=src_ef.callstack;
}
}


var EF_Proto={toString:function(){
return "<suspended SJS>"},__oni_ef:true,wait:function(){


return this},setChildFrame:function(ef,idx){

if(this.child_frame&&this.child_frame.callstack){


mergeCallstacks(ef,this.child_frame);
}
this.async=true;
this.child_frame=ef;
ef.parent=this;
ef.parent_idx=idx;
},quench:function(){






if(this.child_frame)this.child_frame.quench();




},abort:function(){

this.aborted=true;



if(!this.child_frame){

return this;
}else return this.child_frame.abort();


},returnToParent:function(val){

if((val&&val.__oni_cfx)&&val.type=='t'&&this.callstack&&val.val.__oni_stack){

val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}
if(this.swallow_r){
if((val&&val.__oni_cfx)){
if(val.type=="r"){
if(!val.ef||val.ef==this)val=val.val;

}
}else if(is_ef(val))val.swallow_r=this.swallow_r;else if(this.swallow_r!==2)val=UNDEF;




}




this.unreturnable=true;





if(this.async){
if(this.parent){






return new ReturnToParentContinuation(this.parent,this.parent_idx,val);






}else if((val&&val.__oni_cfx)){


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


if((rv&&rv.__oni_cfx))return rv.mapToJS();

return rv;
};



exports.exbl=function(env,args){var rv=I_seq(args,env);


if((rv&&rv.__oni_cfx))return rv.mapToJS();

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
if(is_ef(rv)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([env.file,ndata[1]]);
}
return rv;
}catch(e){

if((e&&e.__oni_cfx)){
if(e.type=='blb'&&e.ef==env.blscope){



return UNDEF;
}
}else{
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}

exports.C=function(f,line){return {exec:I_call,ndata:[f,line],__oni_dis:token_dis};





};






function I_nblock(ndata,env){try{

return (ndata[0]).call(env);
}catch(e){

if(!(e&&e.__oni_cfx)){
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}

exports.Nb=function(f,line){return {exec:I_nblock,ndata:[f,line],__oni_dis:token_dis};





};






function I_blocklambda(ndata,env){return ndata.bind(env);

}

exports.Bl=function(f){return {exec:I_blocklambda,ndata:f,__oni_dis:token_dis};





};















function EF_Seq(ndata,env){this.ndata=ndata;

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




this.swallow_r=ndata[0]&1;
if(ndata[0]&32)this.swallow_r=2;



this.sc=ndata[0]&(2|4);



if(ndata[0]&16){
this.unreturnable=true;


this.toplevel=true;
}
}
setEFProto(EF_Seq.prototype={});
EF_Seq.prototype.cont=function(idx,val){if(is_ef(val)){



this.setChildFrame(val,idx);
}else{

if((val&&val.__oni_cfx)){

if(val.type=='blb'&&val.ef==this.env.blscope){
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
this.child_frame=null;
val=execIN(this.ndata[idx],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}
if(++idx==this.ndata.length&&this.tailcall){

break;
}
if((val&&val.__oni_cfx)){


if(val.type==='blb'&&val.ef===this.env.blscope)val=undefined;

break;
}else if(is_ef(val)){

this.setChildFrame(val,idx);
return this;
}
}
return this.returnToParent(val);
}
};

function I_seq(ndata,env){return cont(new EF_Seq(ndata,env),1);

}

exports.Seq=function(){return {exec:I_seq,ndata:arguments,__oni_dis:token_dis};





};

















function EF_Sc(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Sc.prototype={});

EF_Sc.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val&&val.__oni_cfx)){

return this.returnToParent(val);
}else{

this.child_frame=null;
if(idx==1){

this.pars.push(val);
}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if(is_ef(rv)){
rv.quench();
rv=rv.abort();
return this.returnToParent(rv);
}
}

++this.i;
if((rv&&rv.__oni_cfx))return this.returnToParent(rv);
if(is_ef(rv)){
this.setChildFrame(rv,1);
return this;
}
this.pars.push(rv);
}
this.child_frame=null;


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


exports.Sc=function(){return {exec:I_sc,ndata:arguments,__oni_dis:token_dis};





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

EF_Fcall.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val&&val.__oni_cfx)){

return this.returnToParent(val);
}else if(idx==2){


return this.returnToParent(this.o);
}else{

if(idx==1){

if(this.i==3)this.l=val;else this.pars.push(val);



}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if(is_ef(rv)){
rv.quench();
rv=rv.abort();
return this.returnToParent(rv);
}
}

++this.i;
if((rv&&rv.__oni_cfx))return this.returnToParent(rv);
if(is_ef(rv)){
this.child_frame=null;
this.setChildFrame(rv,1);
return this;
}
if(this.i==3)this.l=rv;else this.pars.push(rv);



}

this.child_frame=null;


try{
switch(this.ndata[0]){case 0:



if(typeof this.l=="function"){
rv=this.l.apply(null,this.pars);
}else if(!testIsFunction(this.l)){

rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.env.file);



}else{



var command="this.l(";
for(var i=0;i<this.pars.length;++i){
if(i)command+=",";
command+="this.pars["+i+"]";
}
command+=")";
try{
rv=eval(command);
}catch(e){







rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.env.file);



}
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.env.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],this.pars);
}else if((UA!=="msie")&&!testIsFunction(this.l[0][this.l[1]])){













rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.env.file);



}else{



var command="this.l[0][this.l[1]](";
for(var i=0;i<this.pars.length;++i){
if(i)command+=",";
command+="this.pars["+i+"]";
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
if(ctor&&(/\{\s*\[native code\]\s*\}\s*$/.test(ctor.toString())||ctor.apply==undefined)){



var pars=this.pars;


rv=new (Function.prototype.bind.apply(ctor,[null].concat(pars)))();
}else if(!testIsFunction(ctor)){

rv=new CFException("t",new Error("'"+ctor+"' is not a function"),this.ndata[1],this.env.file);



}else{



var f=function(){};
f.prototype=ctor.prototype;
this.o=new f();
rv=ctor.apply(this.o,this.pars);
if(is_ef(rv)){

this.setChildFrame(rv,2);
return this;
}else{



if(!rv||"object function".indexOf(typeof rv)==-1)rv=this.o;

}
}
break;
default:
rv=new CFException("i","Invalid Fcall mode");
}
}catch(e){







if((e&&e.__oni_cfx)){

if(e.type=='blb'&&e.ef==this.env.blscope){
rv=UNDEF;
}else rv=e;


}else rv=new CFException("t",e,this.ndata[1],this.env.file);




}
if(is_ef(rv)){
if(this.aborted){

rv=rv.abort();
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


exports.Fcall=function(){return {exec:I_fcall,ndata:arguments,__oni_dis:token_dis};





};












function EF_If(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_If.prototype={});

EF_If.prototype.cont=function(idx,val){switch(idx){case 0:



val=execIN(this.ndata[0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}


case 1:
if((val&&val.__oni_cfx))break;
if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}

if(val)val=execIN(this.ndata[1],this.env);else val=execIN(this.ndata[2],this.env);



break;
default:
val=new CFException("i","invalid state in EF_If");
}
return this.returnToParent(val);
};

function I_if(ndata,env){return cont(new EF_If(ndata,env),0);

}


exports.If=function(t,c,a){return {exec:I_if,ndata:[t,c,a],__oni_dis:token_dis};





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

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}
}
if((val&&val.__oni_cfx))return this.returnToParent(val);
if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}
this.phase=1;
this.testval=val;
idx=-1;
case 1:
while(true){
if(idx>-1){
if((val&&val.__oni_cfx))return this.returnToParent(val);
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}else if(val==Default||val==this.testval)break;


}
if(++idx>=this.ndata[1].length)return this.returnToParent(null);


this.child_frame=null;
val=execIN(this.ndata[1][idx][0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}
}
this.phase=2;
val=0;
case 2:
while(true){
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
if((val&&val.__oni_cfx)){
if(val.type=="b"){
val=val.val;
}
return this.returnToParent(val);
}
if(idx>=this.ndata[1].length){
return this.returnToParent(val);
}
this.child_frame=null;
val=execIN(this.ndata[1][idx][1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
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


exports.Switch=function(exp,clauses){return {exec:I_switch,ndata:[exp,clauses],__oni_dis:token_dis};





};






















function EF_Try(ndata,env){this.ndata=ndata;

this.env=env;
this.state=0;
}
setEFProto(EF_Try.prototype={});

EF_Try.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,this.state);
}else{

switch(this.state){case 0:

this.state=1;
val=execIN(this.ndata[1],this.env);

if(is_ef(val)){
this.setChildFrame(val);
return this;
}
case 1:

this.state=2;
if(this.ndata[2]&&(((val&&val.__oni_cfx)&&val.type=="t")||this.ndata[0]&1)){


var v;
if(this.ndata[0]&1){


v=(val&&val.__oni_cfx)?[val.type==='t'?val.val:val,true]:[val,false];
}else v=val.val;


val=this.ndata[2](this.env,v);



if(this.aborted&&is_ef(val)){

val=val.abort();
}


if(!this.NDATA_TRY_RETRACT_BLOCK&&!this.ndata[3])return this.returnToParent(val);



if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 2:

this.state=3;


this.rv=val;
if(this.aborted&&this.ndata[4]){
val=execIN(this.ndata[4],this.env);







if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 3:

this.state=4;
if(this.ndata[3]){
val=execIN(this.ndata[3],this.env);


if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 4:



if((this.rv&&this.rv.__oni_cfx)&&!(val&&val.__oni_cfx)){
val=this.rv;
}
break;
default:
val=new CFException("i","invalid state in CF_Try");
}
return this.returnToParent(val);
}
};

EF_Try.prototype.quench=function(){if(this.state!==4)this.child_frame.quench();


};

EF_Try.prototype.abort=function(){;

this.aborted=true;

if(this.state!==4){
var val=this.child_frame.abort();
if(is_ef(val)){


this.setChildFrame(val);
}else{





this.parent=UNDEF;



this.async=false;
var rv=cont(this,0);
if(rv!==this){
return rv;
}else this.async=true;



}
}
return this;
};

function I_try(ndata,env){return cont(new EF_Try(ndata,env),0);

}


exports.Try=function(){return {exec:I_try,ndata:arguments,__oni_dis:token_dis};





};













function EF_Loop(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Loop.prototype={});

EF_Loop.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

while(true){

if(idx==0){
if((val&&val.__oni_cfx)){

return this.returnToParent(val);
}

val=execIN(this.ndata[1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}
idx=2;
}

if(idx>1){
if(idx==2){

if(!val||(val&&val.__oni_cfx)){

return this.returnToParent(val);
}
}
while(1){
if(idx>2){
if((val&&val.__oni_cfx)){
if(val.type=='blb'&&val.ef==this.env.blscope){

val=UNDEF;
}else{

if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;

break;
}
return this.returnToParent(val);
}
}
if(idx>=this.ndata.length)break;

}


this.child_frame=null;
val=execIN(this.ndata[idx+1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}
++idx;
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
}
idx=1;
}

if(this.ndata[2]){

val=execIN(this.ndata[2],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,0);
return this;
}
}
idx=0;
}
}
};

function I_loop(ndata,env){return cont(new EF_Loop(ndata,env),ndata[0],true);

}


exports.Loop=function(){return {exec:I_loop,ndata:arguments,__oni_dis:token_dis};





};













function EF_ForIn(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_ForIn.prototype={});

EF_ForIn.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==0){
val=execIN(this.ndata[0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
return this.returnToParent(val);
}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,1);
return this;
}
idx=1;
}
if(idx==1){

if((val&&val.__oni_cfx))return this.returnToParent(val);

for(var x=null in val){
if(typeof this.remainingX==='undefined'){
val=this.ndata[1](this.env,x);
if((val&&val.__oni_cfx)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
continue;
}
return this.returnToParent(val);
}
if(is_ef(val))this.remainingX=[];

}else this.remainingX.push(x);


}
if(is_ef(val)){
if(!this.remainingX)this.remainingX=[];
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}

return this.returnToParent(val);
}
if(idx==2){
while(1){

if((val&&val.__oni_cfx)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
if(this.remainingX.length)continue;

}
return this.returnToParent(val);
}
if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}
if(!this.remainingX.length){
return this.returnToParent(val);
}
val=this.ndata[1](this.env,this.remainingX.shift());

}
}
}
};

function I_forin(ndata,env){return cont(new EF_ForIn(ndata,env),0);

}


exports.ForIn=function(obj,loop){return {exec:I_forin,ndata:[obj,loop],__oni_dis:token_dis};





};














function mergeExceptions(new_exception,original_exception){if(!(new_exception&&new_exception.__oni_cfx)||new_exception.type!=='t'){

return original_exception;
}
if(!(original_exception&&original_exception.__oni_cfx)||original_exception.type!=='t')return new_exception;

if(console){

var msg="Multiple exceptions from sub-strata. Swallowing "+original_exception.val;
if(console.error)console.error(msg);else console.log(msg);

}
return new_exception;
}


function EF_Par(ndata,env){this.ndata=ndata;

this.env=env;
this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Par.prototype={});

EF_Par.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==-1){
var parent_dyn_vars=exports.current_dyn_vars;

for(var i=0;i<this.ndata.length;++i){
val=execIN(this.ndata[i],this.env);
exports.current_dyn_vars=parent_dyn_vars;
if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingCFE=mergeExceptions(val,this.pendingCFE);
return this.pendingCFE;
}else if(is_ef(val)){

++this.pending;
this.setChildFrame(val,i);
}else if((val&&val.__oni_cfx)){


this.pendingCFE=val;
this.quench();
return this.abortInner();
}
}
}else{


--this.pending;
this.children[idx]=UNDEF;
if((val&&val.__oni_cfx)&&!this.aborted&&!(val.type==='blb'&&val.ef===this.env.blscope)){




this.pendingCFE=val;
this.quench();
return this.returnToParent(this.abortInner());
}
}
if(this.pending<2){
if(!this.pendingCFE){


if(this.pending==0)return this.returnToParent(val);


for(var i=0;i<this.children.length;++i)if(this.children[i])return this.returnToParent(this.children[i]);


return this.returnToParent(new CFException("i","invalid state in Par"));
}else{





this.pendingCFE=mergeExceptions(val,this.pendingCFE);

if(this.pending==0)return this.returnToParent(this.pendingCFE);

}
}
this.async=true;
return this;
}
};

EF_Par.prototype.quench=function(){if(this.aborted)return;

for(var i=0;i<this.children.length;++i){
if(this.children[i])this.children[i].quench();

}
};

EF_Par.prototype.abort=function(){this.parent=UNDEF;



if(this.aborted){


this.pendingCFE=UNDEF;
return this;
}
return this.abortInner();
};

EF_Par.prototype.abortInner=function(){this.aborted=true;




for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


this.pendingCFE=mergeExceptions(val,this.pendingCFE);
--this.pending;
this.children[i]=UNDEF;
}
}
if(!this.pending)return this.pendingCFE;


this.async=true;
return this;
};

EF_Par.prototype.setChildFrame=function(ef,idx){if(this.children[idx]&&this.children[idx].callstack){


mergeCallstacks(ef,this.children[idx]);
}
this.children[idx]=ef;
ef.parent=this;
ef.parent_idx=idx;
};

function I_par(ndata,env){return cont(new EF_Par(ndata,env),-1);

}


exports.Par=function(){return {exec:I_par,ndata:arguments,__oni_dis:token_dis};





};












function EF_Alt(ndata,env){this.ndata=ndata;

this.env=env;

this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Alt.prototype={});

EF_Alt.prototype.cont=function(idx,val){if(is_ef(val)){

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

if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
this.pendingRV=mergeExceptions(val,this.pendingRV);
return this.pendingRV;
}else if(is_ef(val)){

++this.pending;
this.setChildFrame(val,i);
}else{


this.pendingRV=val;
this.quench();
return this.abortInner();
}
}
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




if(!this.aborted){
if(!this.pendingRV)this.pendingRV=val;

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

EF_Alt.prototype.quench=function(except){if(this.aborted)return;

if(this.collapsing){

this.children[this.collapsing.branch].quench();
}else{


for(var i=0;i<this.children.length;++i){
if(i!==except&&this.children[i])this.children[i].quench();

}
}
};

EF_Alt.prototype.abort=function(){this.parent=UNDEF;

if(this.aborted){
this.pendingRV=UNDEF;
return this;
}
return this.abortInner();
};

EF_Alt.prototype.abortInner=function(){this.aborted=true;


if(this.collapsing){

var branch=this.collapsing.branch;
this.collapsing=UNDEF;
var val=this.children[branch].abort();
if(is_ef(val))this.setChildFrame(val,branch);else{


--this.pending;
this.children[branch]=UNDEF;
}
}else{


for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


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

EF_Alt.prototype.setChildFrame=function(ef,idx){if(this.children[idx]&&this.children[idx].callstack){


mergeCallstacks(ef,this.children[idx]);
}
this.children[idx]=ef;
ef.parent=this;
ef.parent_idx=idx;
};

EF_Alt.prototype.docollapse=function(branch,cf){this.quench(branch);


for(var i=0;i<this.children.length;++i){
if(i==branch)continue;
if(this.children[i]){
var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


--this.pending;
this.children[i]=UNDEF;
}
}
}

if(this.pending<=1)return true;




this.collapsing={branch:branch,cf:cf};
return false;
};

function I_alt(ndata,env){return cont(new EF_Alt(ndata,env),-1);

}


exports.Alt=function(){return {exec:I_alt,ndata:arguments,__oni_dis:token_dis};





};




















function EF_Suspend(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Suspend.prototype={});

EF_Suspend.prototype.cont=function(idx,val){if(is_ef(val)){


this.setChildFrame(val,idx);
}else{

switch(idx){case 0:

try{
var ef=this;
this.dyn_vars=exports.current_dyn_vars;

var resumefunc=function(){try{

var caller_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=ef.dyn_vars;
cont(ef,2,arguments);
}catch(e){

var s=function(){throw e};
setTimeout(s,0);
}finally{

delete ef.dyn_vars;
exports.current_dyn_vars=caller_dyn_vars;
}
};



resumefunc.ef=ef;

val=this.ndata[0](this.env,resumefunc);
}catch(e){


val=new CFException("t",e);
}



if(this.returning){

if(is_ef(val)){


this.setChildFrame(val,null);
this.quench();
val=this.abort();
if(is_ef(val)){

this.setChildFrame(val,3);

this.async=true;
return this;
}

}
return cont(this,3,null);
}

if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}
case 1:

if((val&&val.__oni_cfx)){
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
if((val&&val.__oni_cfx)){


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
val=this.abort();
if(is_ef(val)){

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
default:
val=new CFException("i","Invalid state in Suspend ("+idx+")");
}
return this.returnToParent(val);
}
};

EF_Suspend.prototype.quench=function(){this.returning=true;

if(!this.suspendCompleted)this.child_frame.quench();

};

EF_Suspend.prototype.abort=function(){exports.current_dyn_vars=this.dyn_vars;


this.returning=true;
if(!this.suspendCompleted)return this.child_frame.abort();

};

function I_sus(ndata,env){return cont(new EF_Suspend(ndata,env),0);

}


exports.Suspend=function(s,r){return {exec:I_sus,ndata:[s,r],__oni_dis:token_dis};





};












function EF_Spawn(ndata,env,notifyAsync,notifyVal,notifyAborted){this.ndata=ndata;

this.env=env;
this.notifyAsync=notifyAsync;
this.notifyVal=notifyVal;
this.notifyAborted=notifyAborted;
}
setEFProto(EF_Spawn.prototype={});

EF_Spawn.prototype.cont=function(idx,val){if(idx==0){


this.parent_dyn_vars=exports.current_dyn_vars;
val=execIN(this.ndata[1],this.env);
exports.current_dyn_vars=this.parent_dyn_vars;




if((val&&val.__oni_cfx)&&val.type==='blb'){
return val;
}
}else if(idx===2){


if(is_ef(val)){
this.setChildFrame(val,2);
return this.returnToParent(this);
}else{

this.in_abortion=false;
this.done=true;

this.notifyVal(this.return_val,true);
this.notifyAborted(val);

return this.returnToParent(this.return_val);
}
}

if((val&&val.__oni_cfx)){
if(val.type==='r'&&val.ef){





if(val.ef.unreturnable){
this.notifyVal(new CFException("t",new Error("Blocklambda return from spawned stratum to inactive scope"),this.ndata[0],this.env.file));



return;
}


this.in_abortion=true;


this.parent=val.ef.parent;
this.parent_idx=val.ef.parent_idx;

if(!this.parent){

this.done=true;
return val;
}


cont(this.parent,this.parent_idx,this);


val.ef.parent=UNDEF;


val.ef.quench();
var aborted_target=val.ef.abort();
if(is_ef(aborted_target)){
this.return_val=val.val;
this.setChildFrame(aborted_target,2);

return this.returnToParent(this);
}

this.in_abortion=false;
this.done=true;

this.notifyVal(val.val,true);

if(!this.async){

cont(this.parent,this.parent_idx,val.val);
return;
}
return this.returnToParent(val.val);
}else if(val.type==='blb'){






var frame_to_abort=this.env.blrref;
while(frame_to_abort.parent&&!(frame_to_abort.parent.env&&frame_to_abort.parent.env.blscope===val.ef))frame_to_abort=frame_to_abort.parent;


if(!frame_to_abort.parent||frame_to_abort.unreturnable){
this.notifyVal(new CFException("t",new Error("Blocklambda break from spawned stratum to invalid or inactive scope"),this.ndata[0],this.env.file));



return;
}


this.in_abortion=true;


this.parent=frame_to_abort.parent;
this.parent_idx=frame_to_abort.parent_idx;

cont(this.parent,this.parent_idx,this);


frame_to_abort.parent=UNDEF;


frame_to_abort.quench();
var aborted_target=frame_to_abort.abort();
if(is_ef(aborted_target)){
this.return_val=UNDEF;
this.setChildFrame(aborted_target,2);

return this.returnToParent(this);
}

this.in_abortion=false;
this.done=true;



this.notifyVal(UNDEF,true);
this.notifyAborted(UNDEF);

return this.returnToParent(UNDEF);
}
}

if(is_ef(val)){
this.setChildFrame(val,1);
if(idx==0)this.notifyAsync();

}else{

delete this.parent_dyn_vars;
this.in_abortion=false;
this.done=true;
this.notifyVal(val);
}
};

EF_Spawn.prototype.abort=function(){if(this.in_abortion)return this;





if(this.done)return UNDEF;

this.in_abortion=true;
if(this.child_frame){
this.child_frame.quench();
var val=this.child_frame.abort();
if(is_ef(val)){

this.setChildFrame(val,2);
return this;
}else{

this.in_abortion=false;
this.done=true;
return UNDEF;
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
};
EF_SpawnWaitFrame.prototype.cont=function(val){if(this.parent){

var current_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=this.dyn_vars;
delete this.dyn_vars;
cont(this.parent,this.parent_idx,val);
exports.current_dyn_vars=current_dyn_vars;
}
};

function EF_SpawnAbortFrame(waitarr,spawn_frame){this.dyn_vars=exports.current_dyn_vars;

this.waitarr=waitarr;
waitarr.push(this);
var me=this;
hold0(function(){me.resolveAbortCycle(spawn_frame)});

}
setEFProto(EF_SpawnAbortFrame.prototype={});
EF_SpawnAbortFrame.prototype.quench=function(){};
EF_SpawnAbortFrame.prototype.abort=function(){return this;


};
EF_SpawnAbortFrame.prototype.cont=function(val){if(this.done)return;

if(this.parent){
var current_dyn_vars=exports.current_dyn_vars;
exports.current_dyn_vars=this.dyn_vars;
delete this.dyn_vars;
this.done=true;
cont(this.parent,this.parent_idx,val);
exports.current_dyn_vars=current_dyn_vars;
}else if((val&&val.__oni_cfx)&&(val.type==='t'||val.val instanceof Error)){


hold0(function(){val.mapToJS(true)});
}
};
EF_SpawnAbortFrame.prototype.resolveAbortCycle=function(spawn_frame){if(this.done)return;

var parent=this.parent;
while(parent){
if(spawn_frame===parent){
var msg="Warning: Cyclic stratum.abort() call from within stratum."+stack_to_string(this.callstack);
if(console){
if(console.error)console.error(msg);else console.log(msg);

}
this.cont(UNDEF);
break;
}
parent=parent.parent;
}
};


function I_spawn(ndata,env){var val,async,have_val,picked_up=false;

var value_waitarr=[];
var abort_waitarr=[];
var stratum={abort:function(){
var dyn_vars=exports.current_dyn_vars;





if(ef.in_abortion)return new EF_SpawnAbortFrame(abort_waitarr,ef);

if(ef.done)return UNDEF;


var rv=ef.abort();

exports.current_dyn_vars=dyn_vars;

async=false;
val=new CFException("t",new StratumAborted(),ndata[0],env.file);



while(value_waitarr.length)cont(value_waitarr.shift(),val);


if(is_ef(rv)){
return new EF_SpawnAbortFrame(abort_waitarr,ef);
}

if(!(rv&&rv.__oni_cfx)||rv.type!=='t')rv=UNDEF;

notifyAborted(rv);

return rv;
},value:function(){
if(!async){
picked_up=true;return val}
return new EF_SpawnWaitFrame(value_waitarr);
},waitforValue:function(){

return this.value()},running:function(){
return async},waiting:function(){
return value_waitarr.length;

},toString:function(){
return "[object Stratum]"}};


function notifyAsync(){async=true;

}
function notifyVal(_val,have_caller){if(val!==undefined)return;



val=_val;
async=false;
if(!have_caller&&!value_waitarr.length){





if((val&&val.__oni_cfx)&&(val.type!='t'||val.val instanceof Error)){







setTimeout(function(){if(!picked_up)val.mapToJS(true);







},0);
}
}else while(value_waitarr.length)cont(value_waitarr.shift(),val);




}
function notifyAborted(_val){if(!(_val&&_val.__oni_cfx)||_val.type!=='t')_val=UNDEF;


while(abort_waitarr.length)cont(abort_waitarr.shift(),_val);

}

var ef=new EF_Spawn(ndata,env,notifyAsync,notifyVal,notifyAborted);


return cont(ef,0)||stratum;
}


exports.Spawn=function(line,exp){return {exec:I_spawn,ndata:[line,exp],__oni_dis:token_dis};





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
EF_Collapse.prototype.abort=function(){};

function I_collapse(ndata,env){return cont(new EF_Collapse(ndata,env),0);

}


exports.Collapse=function(line){return {exec:I_collapse,ndata:line,__oni_dis:token_dis};





};



exports.G=window;





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

function isStringAndStartsWith(string,putativeStart){return typeof string==='string'&&string.substring(0,putativeStart.length)===putativeStart;

}

function onGlobalMessage(event){if(event.source===exports.G&&isStringAndStartsWith(event.data,MESSAGE_PREFIX)){


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

exports.Arr=function(){return Array.prototype.slice.call(arguments,0)};

exports.Obj=function(){var obj=new Object();



for(var i=0;i<arguments[0].length;++i)obj[arguments[0][i]]=arguments[i+1];

return obj;
};

function QuasiProto(parts){this.parts=parts}
exports.QuasiProto=QuasiProto;

exports.Quasi=function(){return new QuasiProto(Array.prototype.slice.call(arguments,0));

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

e.ef=env.blbref;
return e;
};

exports.BlReturn=function(exp){var e=new CFException('r',exp);

if(!this.blrref)throw new Error("Internal runtime error; no reference frame in BlReturn");
if(this.blrref.unreturnable){
if(this.blrref.toplevel)throw new Error("Invalid blocklambda 'return' statement; 'return' is only allowed in blocklambdas that are nested in functions");else{



throw new Error("Blocklambda return to inactive function");
}
}
e.ef=this.blrref;
return e;
};

exports.With=function(exp,bodyf){return bodyf(this,exp);

};

exports.join_str=function(){var rv='';

for(var i=0,l=arguments.length;i<l;++i)rv+=arguments[i];

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







(function(exports) {var UNDEF,arrayCtors,arrayCtorNames,c,i,_flatten,parseURLOptions,pendingLoads,compiled_src_tag,canonical_id_to_module,github_api,github_opts;function URI(){}function makeRequire(parent){var rf;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rf=function (module,settings){var opts,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){opts=exports.extendObject({},settings);},559),__oni_rt.Nb(function(){if(opts.callback)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Try(0,__oni_rt.Sc(562,function(_oniX){return rv=_oniX;},__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},561),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},561),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},561))),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return opts.callback(e)},563),__oni_rt.Nb(function(){return __oni_rt.Return();},563)),__oni_env)},0),__oni_rt.C(function(){return opts.callback(UNDEF,rv)},565),__oni_rt.Nb(function(){return __oni_rt.Return();},566)),this);else return __oni_rt.ex(__oni_rt.Sc(569,__oni_rt.Return,__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(module)},569),__oni_rt.C(function(){return requireInnerMultiple(module,rf,parent,opts)},569),__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},569))),this);},559)])};rf.resolve=function (module,settings){var opts;opts=exports.extendObject({},settings);return resolve(module,rf,parent,opts);};rf.path="";rf.alias={};if(exports.require){rf.hubs=exports.require.hubs;rf.modules=exports.require.modules;rf.extensions=exports.require.extensions;}else{rf.hubs=augmentHubs(getHubs_hostenv());rf.modules={};rf.extensions=getExtensions_hostenv();}rf.url=function (relative){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(600,__oni_rt.Return,__oni_rt.Sc(600,function(l){return l.path;},__oni_rt.C(function(){return resolve(relative,rf,parent)},600)))])};return __oni_rt.Return(rf);},572)])}function augmentHubs(hubs){hubs.addDefault=function (hub){if(! this.defined(hub[0])){this.unshift(hub);return true;}return false;};hubs.defined=function (prefix){var h,l,i;i=0;for(;i < this.length;i++ ){h=this[i][0];l=Math.min(h.length,prefix.length);if(h.substr(0,l) == prefix.substr(0,l)){return true;}}return false;};return hubs;}function html_sjs_extractor(html,descriptor){var re,match,src;re=/<script (?:[^>]+ )?(?:type=['"]text\/sjs['"]|main=['"]([^'"]+)['"])[^>]*>((.|[\r\n])*?)<\/script>/mg;src='';while(match=re.exec(html)){if(match[1]){src+='require("' + match[1] + '")';}else{src+=match[2];}src+=';';}if(! src){throw new Error("No sjs found in HTML file");}return default_compiler(src,descriptor);}function resolveAliases(module,aliases){var ALIAS_REST,alias_rest,alias,rv,level;ALIAS_REST=/^([^:]+):(.*)$/;rv=module;level=10;while((alias_rest=ALIAS_REST.exec(rv)) && (alias=aliases[alias_rest[1]])){if(-- level == 0){throw new Error("Too much aliasing in modulename '" + module + "'");}rv=alias + alias_rest[2];}return rv;}function resolveHubs(module,hubs,require_obj,parent,opts){var path,loader,src,resolve,level,i,hub;path=module;loader=opts.loader || default_loader;src=opts.src || default_src_loader;resolve=default_resolver;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}level=10;i=0;while(hub=hubs[i++ ]){if(path.indexOf(hub[0]) == 0){if(typeof hub[1] == "string"){path=hub[1] + path.substring(hub[0].length);i=0;if(path.indexOf(":") == - 1){path=resolveSchemelessURL_hostenv(path,require_obj,parent);}if(-- level == 0){throw new Error("Too much indirection in hub resolution for module '" + module + "'");}}else{if(typeof hub[1] == "object"){if(hub[1].src){src=hub[1].src;}if(hub[1].loader){loader=hub[1].loader;}resolve=hub[1].resolve || loader.resolve || resolve;break;}else{throw new Error("Unexpected value for require.hubs element '" + hub[0] + "'");}}}}return {path:path,loader:loader,src:src,resolve:resolve};}function default_src_loader(path){throw new Error("Don't know how to load module at " + path);}function default_compiler(src,descriptor){var f;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(typeof (src) === 'function')return __oni_rt.ex(__oni_rt.Nb(function(){return f=src;},705),this);else return __oni_rt.ex(__oni_rt.If(__oni_rt.C(function(){return compiled_src_tag.exec(src)},707),__oni_rt.Sc(713,function(_oniX){return f=_oniX;},__oni_rt.Fcall(2,713,__oni_rt.Nb(function(){return Function},713),"module","exports","require","__onimodulename","__oni_altns",__oni_rt.Nb(function(){return src},713))),__oni_rt.Sc(717,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module,exports,require, __onimodulename, __oni_altns){" + src + "\n})",{filename:("module "+(descriptor.id))})},717))),this);},704),__oni_rt.C(function(){return f(descriptor,descriptor.exports,descriptor.require,("module "+(descriptor.id)),{})},719)])}function default_loader(path,parent,src_loader,opts,spec){var compile,descriptor,pendingHook,p;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[9,__oni_rt.Nb(function(){compile=exports.require.extensions[spec.type];},731),__oni_rt.Nb(function(){if(! compile)return __oni_rt.ex(__oni_rt.Sc(732,__oni_rt.Throw,__oni_rt.Fcall(2,732,__oni_rt.Nb(function(){return Error},732),__oni_rt.Nb(function(){return "Unknown type '" + spec.type + "'"},732)),732,'apollo-sys-common.sjs'),this);},731),__oni_rt.Nb(function(){descriptor=exports.require.modules[path];pendingHook=pendingLoads[path];},735),__oni_rt.Nb(function(){if((! descriptor && ! pendingHook) || opts.reload)return __oni_rt.ex(__oni_rt.Sc(813,function(_oniX){return pendingHook=_oniX;},__oni_rt.Sc(813,function(_oniX){return pendingLoads[path]=_oniX;},__oni_rt.Spawn(813,__oni_rt.C(function(){return (function (){var src,loaded_from,descriptor,canonical_id;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Alt(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof src_loader === "string")return __oni_rt.ex(__oni_rt.Nb(function(){src=src_loader;loaded_from="[src string]";},0),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(path in __oni_rt.modsrc)return __oni_rt.ex(__oni_rt.Nb(function(){loaded_from="[builtin]";src=__oni_rt.modsrc[path];delete __oni_rt.modsrc[path];},0),this);else return __oni_rt.ex(__oni_rt.Sc(759,function(_oniX){src=_oniX.src;loaded_from=_oniX.loaded_from;return _oniX;},__oni_rt.C(function(){return src_loader(path)},759)),this);},749),this);},743),__oni_rt.Nb(function(){descriptor={id:path,exports:{},loaded_from:loaded_from,loaded_by:parent,required_by:{}};descriptor.require=makeRequire(descriptor);canonical_id=null;descriptor.getCanonicalId=function (){return canonical_id;};descriptor.setCanonicalId=function (id){var canonical;if(id == null){throw new Error("Canonical ID cannot be null");}if(canonical_id !== null){throw new Error("Canonical ID is already defined for module " + path);}canonical=canonical_id_to_module[id];if(canonical != null){throw new Error("Canonical ID " + id + " is already defined in module " + canonical.id);}canonical_id=id;canonical_id_to_module[id]=descriptor;};if(opts.main){descriptor.require.main=descriptor;}exports.require.modules[path]=descriptor;},0),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.C(function(){return compile(src,descriptor)},799),__oni_rt.Nb(function(){return __oni_rt.Return(descriptor);},800)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},802),__oni_rt.Sc(803,__oni_rt.Throw,__oni_rt.Nb(function(){return e},803),803,'apollo-sys-common.sjs')),__oni_env)},0,__oni_rt.Nb(function(){return delete exports.require.modules[path];},805))),__oni_rt.Suspend(function(__oni_env,resume){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(0)},809),__oni_rt.Nb(function(){return pendingHook.resume=resume;},810)),__oni_env)}, function() {}))])})()},813)))),this);},737),__oni_rt.Nb(function(){if(pendingHook)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){p=parent;},826),__oni_rt.Nb(function(){if(descriptor)return __oni_rt.ex(__oni_rt.Loop(0,__oni_rt.Nb(function(){return p.loaded_by},827),0,__oni_rt.Nb(function(){if(path === p.id)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(descriptor.exports);},829),this);},828),__oni_rt.Nb(function(){return p=p.loaded_by;},830)),this);},826),__oni_rt.Try(0,__oni_rt.Sc(836,function(_oniX){return descriptor=_oniX;},__oni_rt.C(function(){return pendingHook.waitforValue()},836)),0,__oni_rt.If(__oni_rt.Sc(846,__oni_rt.infix['=='],__oni_rt.C(function(){return pendingHook.waiting()},846),0),__oni_rt.Nb(function(){return delete pendingLoads[path]},847)),__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Sc(839,__oni_rt.infix['=='],__oni_rt.C(function(){return pendingHook.waiting()},839),0),__oni_rt.Nb(function(){return pendingHook.resume},839)),__oni_rt.Seq(0,__oni_rt.C(function(){return pendingHook.resume()},840),__oni_rt.C(function(){return pendingHook.value()},841))))),this);},816),__oni_rt.Nb(function(){if(! descriptor.required_by[parent.id]){descriptor.required_by[parent.id]=1;}else{++ descriptor.required_by[parent.id];}return __oni_rt.Return(descriptor.exports);},851)])}function default_resolver(spec){if(! spec.ext && spec.path.charAt(spec.path.length - 1) !== '/'){spec.path+="." + spec.type;}}function http_src_loader(path){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(869,__oni_rt.Return,__oni_rt.Sc(869,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.C(function(){return request_hostenv([path,{format:'compiled'}],{mime:'text/plain'})},867),__oni_rt.Nb(function(){return path},869)))])}function github_src_loader(path){var user,repo,tag,url,data,str;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Sc(882,function(_oniX){user=_oniX[1];repo=_oniX[2];tag=_oniX[3];path=_oniX[4];return _oniX;},__oni_rt.C(function(){return /github:\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path)},882)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Sc(883,__oni_rt.Throw,__oni_rt.Fcall(2,883,__oni_rt.Nb(function(){return Error},883),__oni_rt.Nb(function(){return "Malformed module id '" + path + "'"},883)),883,'apollo-sys-common.sjs'),__oni_env)},0),__oni_rt.Sc(887,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(github_api,'repos',user,repo,"contents",path,{ref:tag})},885)),__oni_rt.Alt(__oni_rt.Sc(889,function(_oniX){return data=_oniX;},__oni_rt.Sc(888,function(l){return l.data;},__oni_rt.C(function(){return jsonp_hostenv(url,github_opts)},888))),__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(10000)},891),__oni_rt.Sc(892,__oni_rt.Throw,__oni_rt.Fcall(2,892,__oni_rt.Nb(function(){return Error},892),"Github timeout"),892,'apollo-sys-common.sjs'))),__oni_rt.Nb(function(){if(data.message && ! data.content)return __oni_rt.ex(__oni_rt.Sc(895,__oni_rt.Throw,__oni_rt.Fcall(2,895,__oni_rt.Nb(function(){return Error},895),__oni_rt.Nb(function(){return data.message},895)),895,'apollo-sys-common.sjs'),this);},894),__oni_rt.Sc(900,function(_oniX){return str=_oniX;},__oni_rt.C(function(){return exports.require('sjs:string')},898)),__oni_rt.Sc(903,__oni_rt.Return,__oni_rt.Sc(903,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.Fcall(1,901,__oni_rt.Sc(901,function(l){return [l,'utf8ToUtf16'];},__oni_rt.Nb(function(){return str},901)),__oni_rt.C(function(){return str.base64ToOctets(data.content)},901)),__oni_rt.Nb(function(){return url},903)))])}function resolve(module,require_obj,parent,opts){var path,hubs,resolveSpec,ext,extMatch,preload,pendingHubs,deleteHubs,entries,parent,resolved,ent,i,k,i,path,contents;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(911,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveAliases(module,require_obj.alias)},909)),__oni_rt.Nb(function(){hubs=exports.require.hubs;},913),__oni_rt.Sc(916,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolveHubs(path,hubs,require_obj,parent,opts || {})},913)),__oni_rt.Nb(function(){resolveSpec.path=exports.normalizeURL(resolveSpec.path,parent.id);extMatch=/.+\.([^\.\/]+)$/.exec(resolveSpec.path);if(extMatch){ext=extMatch[1].toLowerCase();resolveSpec.ext=ext;if(! exports.require.extensions[ext]){ext=null;}}return resolveSpec.type=ext || 'sjs';},916),__oni_rt.C(function(){return resolveSpec.resolve(resolveSpec,parent)},928),__oni_rt.Nb(function(){preload=__oni_rt.G.__oni_rt_bundle;pendingHubs=false;if(preload.h){deleteHubs=[];for(k in preload.h){if(! Object.prototype.hasOwnProperty.call(preload.h,k)){continue;}entries=preload.h[k];parent=getTopReqParent_hostenv();resolved=resolveHubs(k,hubs,exports.require,parent,{});if(resolved.path === k){pendingHubs=true;continue;}i=0;for(;i < entries.length;i++ ){ent=entries[i];preload.m[resolved.path + ent[0]]=ent[1];}deleteHubs.push(k);}if(! pendingHubs){delete preload.h;}else{i=0;for(;i < deleteHubs.length;i++ ){delete preload.h[deleteHubs[i]];}}}if(module in __oni_rt.modsrc){if(! preload.m){preload.m={};}preload.m[resolveSpec.path]=__oni_rt.modsrc[module];delete __oni_rt.modsrc[module];}if(preload.m){path=resolveSpec.path;if(path.indexOf('!sjs',path.length - 4) !== - 1){path=path.slice(0,- 4);}contents=preload.m[path];if(contents !== undefined){resolveSpec.src=function (){delete preload.m[path];return {src:contents,loaded_from:path + "#bundle"};};}}return __oni_rt.Return(resolveSpec);},0)])}function requireInner(module,require_obj,parent,opts){var resolveSpec;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(1007,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolve(module,require_obj,parent,opts)},1004)),__oni_rt.Sc(1007,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts,resolveSpec)},1007)),__oni_rt.Nb(function(){return __oni_rt.Return(module);},1009)])}function requireInnerMultiple(modules,require_obj,parent,opts){var rv;function inner(i,l){var descriptor,id,exclude,include,name,module,addSym,o,i,o,split;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(l === 1)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor=modules[i];if(typeof descriptor === 'string'){id=descriptor;exclude=[];include=null;name=null;}else{id=descriptor.id;exclude=descriptor.exclude || [];include=descriptor.include || null;name=descriptor.name || null;}},1021),__oni_rt.Sc(1038,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return requireInner(id,require_obj,parent,opts)},1035)),__oni_rt.Nb(function(){addSym=function (k,v){if(rv[k] !== undefined){if(rv[k] === v){return;}throw new Error(("require([.]) name clash while merging module '"+(id)+"': Symbol '"+(k)+"' defined in multiple modules"));}rv[k]=v;};if(name){addSym(name,module);}else{if(include){i=0;for(;i < include.length;i++ ){o=include[i];if(! (o in module)){throw new Error(("require([.]) module "+(id)+" has no symbol "+(o)));}addSym(o,module[o]);}}else{for(o in module){if(exclude.indexOf(o) !== - 1){continue;}addSym(o,module[o]);}}}},0)),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(1068,function(_oniX){return split=_oniX;},__oni_rt.C(function(){return Math.floor(l / 2)},1067)),__oni_rt.Par(__oni_rt.C(function(){return inner(i,split)},1069),__oni_rt.C(function(){return inner(i + split,l - split)},1072))),this);},1019)])}return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rv={};},1018),__oni_rt.Nb(function(){if(modules.length !== 0)return __oni_rt.ex(__oni_rt.C(function(){return inner(0,modules.length)},1078),this);},1078),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},1079)])}__oni_rt.exseq(this.arguments,this,'apollo-sys-common.sjs',[24,__oni_rt.Nb(function(){__oni_rt.sys=exports;if(! (__oni_rt.G.__oni_rt_bundle)){__oni_rt.G.__oni_rt_bundle={};}exports.hostenv=__oni_rt.hostenv;exports.getGlobal=function (){return __oni_rt.G;};exports.withDynVarContext=function (block){var old_dyn_vars;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){old_dyn_vars=__oni_rt.current_dyn_vars;},92),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=Object.create(old_dyn_vars);},93),__oni_rt.C(function(){return block()},94)),0,__oni_rt.Nb(function(){return __oni_rt.current_dyn_vars=old_dyn_vars;},97))])};exports.setDynVar=function (name,value){var key;if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to retrieve "+(name)));}key='$' + name;__oni_rt.current_dyn_vars[key]=value;};exports.clearDynVar=function (name){var key;if(__oni_rt.current_dyn_vars === null){throw new Error(("No dynamic variable context to clear "+(name)));}key='$' + name;delete __oni_rt.current_dyn_vars[key];};exports.getDynVar=function (name,default_val){var key;key='$' + name;if(__oni_rt.current_dyn_vars === null){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist (no dynamic variable context)"));}}if(! (key in __oni_rt.current_dyn_vars)){if(arguments.length > 1){return default_val;}else{throw new Error(("Dynamic Variable '"+(name)+"' does not exist"));}}return __oni_rt.current_dyn_vars[key];};arrayCtors=[];arrayCtorNames=['Uint8Array','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array','Float32Array','Float64Array','NodeList','HTMLCollection','FileList','StaticNodeList'];i=0;for(;i < arrayCtorNames.length;i++ ){c=__oni_rt.G[arrayCtorNames[i]];if(c){arrayCtors.push(c);}}exports.isArrayLike=function (obj){var i;if(Array.isArray(obj) || ! ! (obj && Object.prototype.hasOwnProperty.call(obj,'callee'))){return true;}i=0;for(;i < arrayCtors.length;i++ ){if(obj instanceof arrayCtors[i]){return true;}}return false;};_flatten=function (arr,rv){var l,elem,i;l=arr.length;i=0;for(;i < l;++ i){elem=arr[i];if(exports.isArrayLike(elem)){_flatten(elem,rv);}else{rv.push(elem);}}};exports.flatten=function (arr){var rv;rv=[];if(arr.length === UNDEF){throw new Error("flatten() called on non-array");}_flatten(arr,rv);return rv;};exports.expandSingleArgument=function (args){if(args.length == 1 && exports.isArrayLike(args[0])){args=args[0];}return args;};exports.isQuasi=function (obj){return (obj instanceof __oni_rt.QuasiProto);};exports.Quasi=function (arr){return __oni_rt.Quasi.apply(__oni_rt,arr);};exports.mergeObjects=function (){var rv,sources,i;rv={};sources=exports.expandSingleArgument(arguments);i=0;for(;i < sources.length;i++ ){exports.extendObject(rv,sources[i]);}return rv;};exports.extendObject=function (dest,source){var o;for(o in source){if(Object.prototype.hasOwnProperty.call(source,o)){dest[o]=source[o];}}return dest;};URI.prototype={toString:function (){return ((this.protocol)+"://"+(this.authority)+(this.relative));}};URI.prototype.params=function (){var rv;if(! this._params){rv={};this.query.replace(parseURLOptions.qsParser,function (_,k,v){if(k){rv[decodeURIComponent(k)]=decodeURIComponent(v);}});this._params=rv;}return this._params;};parseURLOptions={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],qsParser:/(?:^|&)([^&=]*)=?([^&]*)/g,parser:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/};exports.parseURL=function (str){var o,m,uri,i;o=parseURLOptions;m=o.parser.exec(str);uri=new URI();i=14;while(i-- ){uri[o.key[i]]=m[i] || "";}return uri;};exports.constructQueryString=function (){var hashes,hl,parts,hash,l,val,i,q,h;hashes=exports.flatten(arguments);hl=hashes.length;parts=[];h=0;for(;h < hl;++ h){hash=hashes[h];for(q in hash){l=encodeURIComponent(q) + "=";val=hash[q];if(! exports.isArrayLike(val)){parts.push(l + encodeURIComponent(val));}else{i=0;for(;i < val.length;++ i){parts.push(l + encodeURIComponent(val[i]));}}}}return parts.join("&");};exports.constructURL=function (){var url_spec,l,rv,comp,i,qparts,part,query;url_spec=exports.flatten(arguments);l=url_spec.length;rv=url_spec[0];i=1;for(;i < l;++ i){comp=url_spec[i];if(typeof comp != "string"){break;}if(rv.charAt(rv.length - 1) != "/"){rv+="/";}rv+=comp.charAt(0) == "/"?comp.substr(1):comp;}qparts=[];for(;i < l;++ i){part=exports.constructQueryString(url_spec[i]);if(part.length){qparts.push(part);}}query=qparts.join("&");if(query.length){if(rv.indexOf("?") != - 1){rv+="&";}else{rv+="?";}rv+=query;}return rv;};exports.isSameOrigin=function (url1,url2){var a1,a2;a1=exports.parseURL(url1).authority;if(! a1){return true;}a2=exports.parseURL(url2).authority;return ! a2 || (a1 == a2);};exports.normalizeURL=function (url,base){var a,pin,l,pout,c,i,rv;if(__oni_rt.hostenv == "nodejs" && __oni_rt.G.process.platform == 'win32'){url=url.replace(/\\/g,"/");base=base.replace(/\\/g,"/");}a=exports.parseURL(url);if(base && (base=exports.parseURL(base)) && (! a.protocol || a.protocol == base.protocol)){if(! a.directory && ! a.protocol){a.directory=base.directory;if(! a.path && (a.query || a.anchor)){a.file=base.file;}}else{if(a.directory && a.directory.charAt(0) != '/'){a.directory=(base.directory || "/") + a.directory;}}if(! a.protocol){a.protocol=base.protocol;if(! a.authority){a.authority=base.authority;}}}a.directory=a.directory.replace(/\/\/+/g,'/');pin=a.directory.split("/");l=pin.length;pout=[];i=0;for(;i < l;++ i){c=pin[i];if(c == "."){continue;}if(c == ".." && pout.length > 1){pout.pop();}else{pout.push(c);}}a.directory=pout.join("/");rv="";if(a.protocol){rv+=a.protocol + ":";}if(a.authority){rv+="//" + a.authority;}else{if(a.protocol == "file"){rv+="//";}}rv+=a.directory + a.file;if(a.query){rv+="?" + a.query;}if(a.anchor){rv+="#" + a.anchor;}return rv;};exports.jsonp=jsonp_hostenv;exports.getXDomainCaps=getXDomainCaps_hostenv;exports.request=request_hostenv;exports.makeMemoizedFunction=function (f,keyfn){var lookups_in_progress,memoizer;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){lookups_in_progress={};memoizer=function (){var key,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[9,__oni_rt.Sc(518,function(_oniX){return key=_oniX;},__oni_rt.If(__oni_rt.Nb(function(){return keyfn},517),__oni_rt.C(function(){return keyfn.apply(this.tobj,this.aobj)},517),__oni_rt.Nb(function(){return this.aobj[0]},517))),__oni_rt.Nb(function(){rv=memoizer.db[key];},519),__oni_rt.Nb(function(){if(typeof rv !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(rv);},519),this);},519),__oni_rt.Nb(function(){if(! lookups_in_progress[key])return __oni_rt.ex(__oni_rt.Sc(523,function(_oniX){return lookups_in_progress[key]=_oniX;},__oni_rt.Spawn(523,__oni_rt.C(function(){return (function (self,args){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(522,__oni_rt.Return,__oni_rt.Sc(522,function(_oniX){return memoizer.db[key]=_oniX;},__oni_rt.C(function(){return f.apply(self,args)},522)))])})(this.tobj,this.aobj)},523))),this);},520),__oni_rt.Try(0,__oni_rt.Sc(525,__oni_rt.Return,__oni_rt.C(function(){return lookups_in_progress[key].waitforValue()},525)),0,__oni_rt.If(__oni_rt.Sc(528,__oni_rt.infix['=='],__oni_rt.C(function(){return lookups_in_progress[key].waiting()},528),0),__oni_rt.Seq(0,__oni_rt.C(function(){return lookups_in_progress[key].abort()},529),__oni_rt.Nb(function(){return delete lookups_in_progress[key];},530))))])};memoizer.db={};return __oni_rt.Return(memoizer);},516)])};exports.eval=eval_hostenv;pendingLoads={};exports._makeRequire=makeRequire;compiled_src_tag=/^\/\*\__oni_compiled_sjs_1\*\//;default_compiler.module_args=['module','exports','require','__onimodulename','__oni_altns'];canonical_id_to_module={};github_api="https://api.github.com/";github_opts={cbfield:"callback"};exports.resolve=function (url,require_obj,parent,opts){require_obj=require_obj || exports.require;parent=parent || getTopReqParent_hostenv();opts=opts || {};return resolve(url,require_obj,parent,opts);};exports.require=makeRequire(getTopReqParent_hostenv());exports.require.modules['builtin:apollo-sys.sjs']={id:'builtin:apollo-sys.sjs',exports:exports,loaded_from:"[builtin]",required_by:{"[system]":1}};return exports.init=function (cb){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.C(function(){return init_hostenv()},1093),__oni_rt.C(function(){return cb()},1094)])};},55)])
var location,jsonp_req_count,jsonp_cb_obj,XHR_caps,activex_xhr_ver,IE_resume_counter;function determineLocation(){var scripts,matches,i;if(! location){location={};scripts=document.getElementsByTagName("script");i=0;for(;i < scripts.length;++ i){if((matches=/^(.*\/)(?:[^\/]*)stratified(?:[^\/]*)\.js(?:\?.*)?$/.exec(scripts[i].src))){location.location=exports.normalizeURL(matches[1] + "modules/",document.location.href);location.requirePrefix=scripts[i].getAttribute("require-prefix");location.req_base=scripts[i].getAttribute("req-base") || document.location.href;location.main=scripts[i].getAttribute("main");location.noInlineScripts=scripts[i].getAttribute("no-inline-scripts");location.waitForBundle=scripts[i].getAttribute("wait-for-bundle");break;}}if(! location.req_base){location.req_base=document.location.href;}}return location;}function jsonp_hostenv(url,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({iframe:false,cbfield:"callback"},settings);url=exports.constructURL(url,opts.query);},0),__oni_rt.Nb(function(){if(opts.iframe || opts.forcecb)return __oni_rt.ex(__oni_rt.Sc(112,__oni_rt.Return,__oni_rt.C(function(){return jsonp_iframe(url,opts)},112)),this);else return __oni_rt.ex(__oni_rt.Sc(114,__oni_rt.Return,__oni_rt.C(function(){return jsonp_indoc(url,opts)},114)),this);},111)])}function jsonp_indoc(url,opts){var cb,cb_query,elem,complete,readystatechange,error,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! window[jsonp_cb_obj]){window[jsonp_cb_obj]={};}cb="cb" + (jsonp_req_count++ );cb_query={};cb_query[opts.cbfield]=jsonp_cb_obj + "." + cb;url=exports.constructURL(url,cb_query);elem=document.createElement("script");elem.setAttribute("src",url);elem.setAttribute("async","async");elem.setAttribute("type","text/javascript");complete=false;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){window[jsonp_cb_obj][cb]=resume;return document.getElementsByTagName("head")[0].appendChild(elem);},136),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Nb(function(){if(elem.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.addEventListener("error",resume,false)},141),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){readystatechange=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(elem.readyState == 'loaded' && ! complete)return __oni_rt.ex(__oni_rt.Fcall(0,145,__oni_rt.Nb(function(){return resume},144),__oni_rt.Fcall(2,144,__oni_rt.Nb(function(){return Error},144),"script loaded but `complete` flag not set")),this);},144)])};},146),__oni_rt.C(function(){return elem.attachEvent("onreadystatechange",readystatechange)},146)),this);},140),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(elem.removeEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.removeEventListener("error",resume,false)},151),this);else return __oni_rt.ex(__oni_rt.C(function(){return elem.detachEvent("onreadystatechange",readystatechange)},153),this);},150)),this)},155),__oni_rt.Sc(155,__oni_rt.Throw,__oni_rt.Fcall(2,155,__oni_rt.Nb(function(){return Error},155),__oni_rt.Nb(function(){return "Could not complete JSONP request to '" + url + "'" + (error?"\n" + error.message:"")},155)),155,'apollo-sys-xbrowser.sjs')),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.Seq(0,__oni_rt.C(function(){return elem.parentNode.removeChild(elem)},158),__oni_rt.Nb(function(){return delete window[jsonp_cb_obj][cb];},159))),this)},161),__oni_rt.Nb(function(){complete=true;return __oni_rt.Return(rv);},161)])}function jsonp_iframe(url,opts){var cb,cb_query,iframe,doc,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){cb=opts.forcecb || "R";cb_query={};if(opts.cbfield){cb_query[opts.cbfield]=cb;}url=exports.constructURL(url,cb_query);iframe=document.createElement("iframe");document.getElementsByTagName("head")[0].appendChild(iframe);doc=iframe.contentWindow.document;},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return doc.open()},178),__oni_rt.Nb(function(){return iframe.contentWindow[cb]=resume;},179),__oni_rt.C(function(){return __oni_rt.Hold(0)},182),__oni_rt.C(function(){return doc.write("\x3Cscript type='text/javascript' src=\"" + url + "\">\x3C/script>")},183),__oni_rt.C(function(){return doc.close()},184)),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.C(function(){return iframe.parentNode.removeChild(iframe)},187)),this)},191),__oni_rt.C(function(){return __oni_rt.Hold(0)},191),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},192)])}function getXHRCaps(){if(! XHR_caps){XHR_caps={};if(__oni_rt.G.XMLHttpRequest){XHR_caps.XHR_ctor=function (){return new XMLHttpRequest();};}else{XHR_caps.XHR_ctor=function (){var req,v;if(typeof activex_xhr_ver !== 'undefined'){return new ActiveXObject(activex_xhr_ver);}for(v in {"MSXML2.XMLHTTP.6.0":1,"MSXML2.XMLHTTP.3.0":1,"MSXML2.XMLHTTP":1}){try{req=new ActiveXObject(v);activex_xhr_ver=v;return req;}catch(e){;}}throw new Error("Browser does not support XMLHttpRequest");};}XHR_caps.XHR_CORS=("withCredentials" in XHR_caps.XHR_ctor());if(! XHR_caps.XHR_CORS){XHR_caps.XDR=(typeof __oni_rt.G.XDomainRequest !== 'undefined');}XHR_caps.CORS=(XHR_caps.XHR_CORS || XHR_caps.XDR)?"CORS":"none";}return XHR_caps;}function getXDomainCaps_hostenv(){return getXHRCaps().CORS;}function getTopReqParent_hostenv(){var base;base=determineLocation().req_base;return {id:base,loaded_from:base,required_by:{"[system]":1}};}function resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(req_obj.path && req_obj.path.length){url_string=exports.constructURL(req_obj.path,url_string);}return exports.normalizeURL(url_string,parent.id);}function request_hostenv(url,settings){var opts,caps,req,h,error,txt,err;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){opts=exports.mergeObjects({method:"GET",body:null,response:'string',throwing:true},settings);url=exports.constructURL(url,opts.query);caps=getXHRCaps();if(! caps.XDR || exports.isSameOrigin(url,document.location)){req=caps.XHR_ctor();req.open(opts.method,url,true,opts.username || "",opts.password || "");}else{req=new XDomainRequest();req.open(opts.method,url);}},0),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume()},300)])};req.onerror=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},301)])};return req.onabort=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},302)])};},300),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=function (evt){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(req.readyState != 4)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return();},307),this);else return __oni_rt.ex(__oni_rt.C(function(){return resume()},309),this);},306)])};},310),this);},299),__oni_rt.Nb(function(){if(opts.headers && req.setRequestHeader){for(h in opts.headers){req.setRequestHeader(h,opts.headers[h]);}}if(opts.mime && req.overrideMimeType){req.overrideMimeType(opts.mime);}if(opts.response === 'arraybuffer'){req.responseType='arraybuffer';}req.send(opts.body);},0)),__oni_env)}, function() {error=arguments[0];}),0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=null;req.onerror=null;return req.onabort=null;},333),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=null},338),this);},332),__oni_rt.C(function(){return req.abort()},329)),this)},342),__oni_rt.If(__oni_rt.Seq(2,__oni_rt.Nb(function(){return error},342),__oni_rt.Seq(4,__oni_rt.Nb(function(){return typeof req.status !== 'undefined'},343),__oni_rt.Sc(344,function(r){return ! r},__oni_rt.Sc(344,__oni_rt.infix['in'],__oni_rt.Fcall(1,344,__oni_rt.Sc(344,function(l){return [l,'charAt'];},__oni_rt.C(function(){return req.status.toString()},344)),0),__oni_rt.Nb(function(){return {'0':1,'2':1}},344))))),__oni_rt.Seq(0,__oni_rt.Nb(function(){if(opts.throwing){txt="Failed " + opts.method + " request to '" + url + "'";if(req.statusText){txt+=": " + req.statusText;}if(req.status){txt+=" (" + req.status + ")";}err=new Error(txt);err.status=req.status;err.data=req.response;throw err;}},345),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return("");},356),this);},355))),__oni_rt.Nb(function(){if(opts.response === 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(req.responseText);},361),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(opts.response === 'arraybuffer')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.response,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},367)])}});},367),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({status:req.status,content:req.responseText,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},375)])}});},375),this);},362),this);},360)])}function getHubs_hostenv(){return [["sjs:",determineLocation().location || {src:function (path){throw new Error("Can't load module '" + path + "': The location of the StratifiedJS standard module lib is unknown - it can only be inferred automatically if you load stratified.js in the normal way through a <script> element.");}}],["github:",{src:github_src_loader}],["http:",{src:http_src_loader}],["https:",{src:http_src_loader}],["file:",{src:http_src_loader}],["x-wmapp1:",{src:http_src_loader}],["local:",{src:http_src_loader}]];}function getExtensions_hostenv(){return {'sjs':default_compiler,'js':function (src,descriptor){var f;f=new Function("module","exports",src);return f.apply(descriptor.exports,[descriptor,descriptor.exports]);},'html':html_sjs_extractor};}function eval_hostenv(code,settings){var filename,mode,js;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(__oni_rt.UA == "msie" && __oni_rt.G.execScript)return __oni_rt.ex(__oni_rt.Sc(422,__oni_rt.Return,__oni_rt.C(function(){return eval_msie(code,settings)},422)),this);},421),__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},425),__oni_rt.Sc(425,function(_oniX){return filename=_oniX;},__oni_rt.Sc(425,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},425),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},427),__oni_rt.Sc(428,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(code,{filename:filename,mode:mode})},427)),__oni_rt.Sc(428,__oni_rt.Return,__oni_rt.C(function(){return __oni_rt.G.eval(js)},428))])}function eval_msie(code,settings){var filename,mode,rc,js,rv,isexception;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},441),__oni_rt.Sc(441,function(_oniX){return filename=_oniX;},__oni_rt.Sc(441,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},441),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},443),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Suspend(function(__oni_env,resume){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){rc=++ IE_resume_counter;return __oni_rt.IE_resume[rc]=resume;},446),__oni_rt.Sc(450,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile("try{" + code + "\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume[" + rc + "](rv[0],rv[1])) }",{filename:filename,mode:mode})},449)),__oni_rt.C(function(){return __oni_rt.G.execScript(js)},450)),__oni_env)}, function() {rv=arguments[0];isexception=arguments[1];}),__oni_rt.Nb(function(){if(isexception)return __oni_rt.ex(__oni_rt.Sc(452,__oni_rt.Throw,__oni_rt.Nb(function(){return rv},452),452,'apollo-sys-xbrowser.sjs'),this);},452)),0,__oni_rt.Nb(function(){return delete __oni_rt.IE_resume[rc];},455)),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},457)])}function init_hostenv(){}function runScripts(){var scripts,ss,s,i,s,m,content,descriptor,f,i,mainModule;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.If(__oni_rt.Sc(471,function(l){return l.waitForBundle;},__oni_rt.C(function(){return determineLocation()},471)),__oni_rt.Nb(function(){if(__oni_rt_bundle.h === undefined)return __oni_rt.ex(__oni_rt.Nb(function(){__oni_rt_bundle_hook=runScripts;return __oni_rt.Return();},475),this);},473)),__oni_rt.If(__oni_rt.Sc(480,function(r){return ! r[0][r[1]]},__oni_rt.Sc(480,function(l){return [l,'noInlineScripts'];},__oni_rt.C(function(){return determineLocation()},480))),__oni_rt.Seq(0,__oni_rt.Nb(function(){scripts=document.getElementsByTagName("script");ss=[];i=0;for(;i < scripts.length;++ i){s=scripts[i];if(s.getAttribute("type") == "text/sjs"){ss.push(s);}}},0),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},523),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < ss.length},500),__oni_rt.Nb(function(){return ++ i},500),__oni_rt.Nb(function(){s=ss[i];m=s.getAttribute("module");content=s.textContent || s.innerHTML;if(__oni_rt.UA == "msie"){content=content.replace(/\r\n/,"");}},0),__oni_rt.Nb(function(){if(m)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.modsrc[m]=content},512),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor={id:document.location.href + "_inline_sjs_" + (i + 1)};return __oni_rt.sys.require.main=descriptor;},517),__oni_rt.Sc(520,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module, __onimodulename){" + content + "\n})",{filename:("module "+(descriptor.id))})},519)),__oni_rt.C(function(){return f(descriptor)},520)),this);},511))))),__oni_rt.Nb(function(){mainModule=determineLocation().main;},525),__oni_rt.Nb(function(){if(mainModule)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.sys.require(mainModule,{main:true})},526),this);},525)])}__oni_rt.exseq(this.arguments,this,'apollo-sys-xbrowser.sjs',[24,__oni_rt.Nb(function(){if(determineLocation().requirePrefix){__oni_rt.G[determineLocation().requirePrefix]={require:__oni_rt.sys.require};}else{__oni_rt.G.require=__oni_rt.sys.require;}jsonp_req_count=0;jsonp_cb_obj="_oni_jsonpcb";IE_resume_counter=0;return __oni_rt.IE_resume={};},78),__oni_rt.Nb(function(){if(! __oni_rt.G.__oni_rt_no_script_load)return __oni_rt.ex(__oni_rt.Nb(function(){if(document.readyState === "complete" || document.readyState === "interactive")return __oni_rt.ex(__oni_rt.C(function(){return runScripts()},531),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(__oni_rt.G.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.addEventListener("DOMContentLoaded",runScripts,true)},535),this);else return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.attachEvent("onload",runScripts)},537),this);},534),this);},530),this);},468)])})({})