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








































































function CFException_toString(){var rv=this.name+": "+this.message;

if(this.__oni_stack){
for(var i=0;i<this.__oni_stack.length;++i){
var line=this.__oni_stack[i];
if(line.length==1)line=line[0];else line='    at '+line.slice(0,2).join(':');



rv+='\n'+line;
}
}
return rv;
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

var command="new ctor(";
for(var i=0;i<pars.length;++i){
if(i)command+=",";
command+="pars["+i+"]";
}
command+=")";
rv=eval(command);
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
if(!this.aborted&&this.ndata[2]&&(((val&&val.__oni_cfx)&&val.type=="t")||this.ndata[0]&1)){



var v;
if(this.ndata[0]&1){


v=(val&&val.__oni_cfx)?[val.val,true]:[val,false];
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

EF_Try.prototype.abort=function(){this.aborted=true;



if(this.state!==4){
var val=this.child_frame.abort();
if(is_ef(val)){


this.setChildFrame(val);
}else{





this.parent=UNDEF;

if(cont(this,0)!==this){
return;
}

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

for(var i=0;i<this.ndata.length;++i){
val=execIN(this.ndata[i],this.env);
if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
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

for(var i=0;i<this.ndata.length;++i){


var env=copyEnv(this.env);
env.fold=this;
env.branch=i;
val=execIN(this.ndata[i],env);

if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
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
if(this.collapsing){


if(this.pending==1){

var cf=this.collapsing.cf;
this.collapsing=UNDEF;
cont(cf,1);
}
return;
}else{



if(!this.aborted){
this.pendingRV=val;
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

var resumefunc=function(){try{

cont(ef,2,arguments);
}catch(e){

var s=function(){throw e};
setTimeout(s,0);
}
};


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

EF_Suspend.prototype.abort=function(){this.returning=true;


if(!this.suspendCompleted)return this.child_frame.abort();

};

function I_sus(ndata,env){return cont(new EF_Suspend(ndata,env),0);

}


exports.Suspend=function(s,r){return {exec:I_sus,ndata:[s,r],__oni_dis:token_dis};





};










function EF_Spawn(ndata,env,notifyAsync,notifyVal){this.ndata=ndata;

this.env=env;
this.notifyAsync=notifyAsync;
this.notifyVal=notifyVal;
}
setEFProto(EF_Spawn.prototype={});

EF_Spawn.prototype.cont=function(idx,val){if(idx==0)val=execIN(this.ndata[1],this.env);



if(is_ef(val)){
this.setChildFrame(val,1);
if(idx==0)this.notifyAsync();

}else{

this.notifyVal(val);
}
};

EF_Spawn.prototype.abort=function(){this.aborted=true;

if(this.child_frame){
var val=this.child_frame.abort();
if(is_ef(val)){
this.notifyAsync();
this.setChildFrame(val,1);
}
}
};

function EF_SpawnWaitFrame(waitarr){this.waitarr=waitarr;

waitarr.push(this);
}
setEFProto(EF_SpawnWaitFrame.prototype={});
EF_SpawnWaitFrame.prototype.quench=function(){};
EF_SpawnWaitFrame.prototype.abort=function(){var idx=this.waitarr.indexOf(this);

this.waitarr.splice(idx,1);
};
EF_SpawnWaitFrame.prototype.cont=function(val){if(this.parent)cont(this.parent,this.parent_idx,val);


};

function I_spawn(ndata,env){var val,async,have_val,picked_up=false;

var waitarr=[];
var stratum={abort:function(){
if(!async)return;

ef.quench();
ef.abort();
async=false;
val=new CFException("t",new StratumAborted(),ndata[0],env.file);



while(waitarr.length)cont(waitarr.shift(),val);

},value:function(){
if(!async){
picked_up=true;return val}
return new EF_SpawnWaitFrame(waitarr);
},waitforValue:function(){

return this.value()},running:function(){
return async},waiting:function(){
return waitarr.length;

},toString:function(){
return "[object Stratum]"}};


function notifyAsync(){async=true;

}
function notifyVal(_val){if(val!==undefined)return;



val=_val;
async=false;
if(!waitarr.length){





if((val&&val.__oni_cfx)&&(val.type!='t'||val.val instanceof Error)){







setTimeout(function(){if(!picked_up)val.mapToJS(true);







},0);
}
}else while(waitarr.length)cont(waitarr.shift(),val);




}
var ef=new EF_Spawn(ndata,env,notifyAsync,notifyVal);
cont(ef,0);
return stratum;
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

exports.Hold=function(duration_ms){if(duration_ms===UNDEF)return {__oni_ef:true,wait:function(){

return this},quench:dummy,abort:dummy};
if(duration_ms===0){
var sus={__oni_ef:true,wait:function(){
return this},abort:dummy,quench:function(){

sus=null;clear0(this.co)},co:hold0(function(){
if(sus&&sus.parent)cont(sus.parent,sus.parent_idx,UNDEF);


})};

return sus;
}else{

var sus={__oni_ef:true,wait:function(){
return this},abort:dummy,quench:function(){

sus=null;clearTimeout(this.co)}};

sus.co=setTimeout(function(){if(sus&&sus.parent)cont(sus.parent,sus.parent_idx,UNDEF)},duration_ms);

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


exports.modules={};exports.modsrc={};})(__oni_rt);(function(exports){function push_decl_scope(pctx,bl){

































































































































































































































































































































































pctx.decl_scopes.push({vars:[],funs:"",fscoped_ctx:0,bl:bl,continue_scope:0,break_scope:0});


if(bl){
var prev=pctx.decl_scopes[pctx.decl_scopes.length-2];
prev.notail=true;
}
}

function collect_decls(decls){var rv="";

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
;
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










function begin_script(pctx){switch(pctx.mode){case "debug":



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
if(stmt.is_nblock&&pctx.js_ctx==0){

var last=seq.length?seq[seq.length-1]:null;
if(!last||!last.is_nblock_seq){
last=new ph_nblock_seq(pctx);
seq.push(last);
}
last.pushStmt(stmt);
}else seq.push(stmt);


}

function end_script(pctx){var decls=pctx.decl_scopes.pop();

var rv=collect_decls(decls)+pop_stmt_scope(pctx,(pctx.globalReturn?"return ":"")+"__oni_rt.exseq(this.arguments,this,"+pctx.filename+",["+(16|8),"])");




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







function ph_fun_exp(fname,pars,body,pctx,implicit_return){this.is_nblock=pctx.allow_nblock;






if(implicit_return&&pctx.js_ctx)body="return "+body;

















this.code="function "+fname+gen_function_header(pars)+body+"}";
}
ph_fun_exp.prototype=new ph();

ph_fun_exp.prototype.v=function(){return this.code;

};
ph_fun_exp.prototype.nblock_val=function(){return this.code};

function gen_fun_decl(fname,pars,body,pctx){if(top_decl_scope(pctx).fscoped_ctx){



return gen_var_decl([[new ph_identifier(fname,pctx),new ph_fun_exp("",pars,body,pctx)]],pctx);
}else return new ph_fun_decl(fname,pars,body,pctx);


}

function ph_fun_decl(fname,pars,body,pctx){this.code="function "+fname+gen_function_header(pars)+body+"}";

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
ph_var_decl.prototype.nblock_val=function(){return this.d[0].name+"="+this.d[1].nb()+";";


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
if(this.crf[0][2])throw new Error("catchall statement not allowed in __js block");
rv+="catch("+this.crf[0][0]+"){"+this.crf[0][1].nb()+"}";
}
if(this.crf[1])throw new Error("retract statement not allowed in __js block");
if(this.crf[2])rv+="finally{"+this.crf[2].nb()+"}";

return rv;
};
ph_try.prototype.val=function(){var tb=this.block.v();

var rv="__oni_rt.Try("+((this.crf[0]&&this.crf[0][2])?1:0);
rv+=","+tb;
if(this.crf[0]){
var cb=this.crf[0][1].v();
rv+=",function(__oni_env,"+this.crf[0][0]+"){";
if(cb.length)rv+="return __oni_rt.ex("+cb+",__oni_env)";

rv+="}";
}else rv+=",0";



if(this.crf[2]){
var fb=this.crf[2].v();
rv+=","+fb;
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


rv="__oni_rt.Sc("+this.line+",function(l, r){return l[0][l[1]]"+this.id+"r;},"+this.left.ref()+","+this.right.v()+")";

}
return rv;
};

function ph_prefix_op(id,right,pctx){this.id=id;

this.right=right;
this.line=pctx.line;
this.is_nblock=(pctx.allow_nblock&&right.is_nblock)&&id!="spawn";
}
ph_prefix_op.prototype=new ph();
ph_prefix_op.prototype.is_value=true;
ph_prefix_op.prototype.nblock_val=function(){return this.id+" "+this.right.nb();

};
ph_prefix_op.prototype.val=function(){var rv;

if(this.id=="spawn")rv="__oni_rt.Spawn("+this.line+","+this.right.v()+")";else if(this.right.is_nblock){





rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.right.is_ref){
rv="__oni_rt.Sc("+this.line+",function(r){return "+this.id+" r[0][r[1]]},"+this.right.ref()+")";

}else{


rv="__oni_rt.Sc("+this.line+",function(r){return "+this.id+" r},"+this.right.v()+")";

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

rv="__oni_rt.Sc("+this.line+",function(l){return l[0][l[1]]"+this.id+"},"+this.left.ref()+")";

}
return rv;
};



function gen_function_header(pars){var code="";






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

code+=assignments;
return '(){'+code;
}catch(e){
throw new Error("Invalid syntax in parameter list");
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

this.code+=gen_function_header(pars);

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
rv+=this.args[i].nb();
}
return rv+")";
};
ph_fun_call.prototype.val=function(){var rv;

if(this.nblock_form){
rv=this.l.nb()+"(";
for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
rv+=this.args[i].nb();
}
return "__oni_rt.C(function(){return "+rv+")},"+this.line+")";
}else if(this.l.is_ref){

rv="__oni_rt.Fcall(1,"+this.line+","+this.l.ref();
}else{



rv="__oni_rt.Fcall(0,"+this.line+","+this.l.v();
}
for(var i=0;i<this.args.length;++i){
rv+=","+this.args[i].v();
}
rv+=")";
return rv;
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
ph_dot_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",function(l){return l."+this.name+";},"+this.l.v()+")";


};
ph_dot_accessor.prototype.ref=function(){return "__oni_rt.Sc("+this.line+",function(l){return [l,'"+this.name+"'];},"+this.l.v()+")";



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
ph_idx_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",function(l, idx){return l[idx];},"+this.l.v()+","+this.idxexp.v()+")";


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
rv+=this.elements[i].nb();
}
return rv+"]";
};
ph_arr_lit.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Arr";

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



rv+=this.props[i][1]+":"+this.props[i][2].nb();
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
rv+=this.args[i].nb();
}
return rv+")";
};

ph_new.prototype.val=function(){var rv="__oni_rt.Fcall(2,"+this.line+","+this.exp.v();

for(var i=0;i<this.args.length;++i){
rv+=","+this.args[i].v();
}
rv+=")";
return rv;
};









function gen_waitfor_andor(op,blocks,crf,pctx){if(crf[0]||crf[1]||crf[2])return new ph_try(new ph_par_alt(op,blocks),crf,pctx);else return new ph_par_alt(op,blocks);




}

function ph_par_alt(op,blocks){this.op=op;

this.blocks=blocks;
}
ph_par_alt.prototype=new ph();
ph_par_alt.prototype.is_nblock=false;
ph_par_alt.prototype.val=function(){var rv="__oni_rt.";

if(this.op=="and")rv+="Par(";else rv+="Alt(";



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



function gen_using(has_var,lhs,exp,body,pctx){var rv;

if(has_var){

if(!lhs.is_id)throw new Error("Variable name expected in 'using' expression");
rv=gen_var_compound([[lhs]],pctx);
rv.stmts.push(new ph_using(lhs,exp,body,pctx));
rv=rv.toBlock();
}else rv=new ph_using(lhs,exp,body,pctx);


return rv;
}

function ph_using(lhs,exp,body,pctx){this.line=pctx.line;

this.body=body;
this.assign1=new ph_assign_op(new ph_identifier("_oniW",pctx),"=",exp,pctx);

if(lhs)this.assign2=new ph_assign_op(lhs,"=",new ph_identifier("_oniW",pctx),pctx);


}




ph_using.prototype=new ph();
ph_using.prototype.val=function(){var rv="__oni_rt.Nb(function(){var _oniW;"+"return __oni_rt.ex(__oni_rt.Seq("+0+","+this.assign1.v()+",";



if(this.assign2)rv+=this.assign2.v()+",";

rv+="__oni_rt.Try("+0+","+this.body.v()+",0,"+"__oni_rt.Nb(function(){if(_oniW&&_oniW.__finally__)return _oniW.__finally__()},"+this.line+"),0)),this)},"+this.line+")";

return rv;
};







function ph_blocklambda(pars,body,pctx){this.code="__oni_rt.Bl(function"+gen_function_header(pars)+body+"})";

}
ph_blocklambda.prototype=new ph();
ph_blocklambda.prototype.val=function(){return this.code};



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


























var TOKENIZER_SA=/(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|((?:0[xX][\da-fA-F]+)|(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))|(\/(?:\\.|\[(?:\\[^\r\n]|[^\n\r\]])*\]|[^\[\/\r\n])+\/[gimy]*)|(==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+)|('(?:\\[^\r\n]|[^\\\'\r\n])*')|('(?:\\(?:(?:[^\r\n]|(?:\r\n|\n|\r)))|[^\\\'])*')|(\S+))/g;



var TOKENIZER_OP=/(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|(>>>=|===|!==|>>>|<<=|>>=|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+))/g;



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












































































S("[").exs(function(pctx){

var elements=[];


while(pctx.token.id!="]"){
if(elements.length)scan(pctx,",");
if(pctx.token.id==","){
elements.push((function(pctx){return new ph_literal("",pctx)})(pctx));
}else if(pctx.token.id=="]")break;else elements.push(parseExp(pctx,110));




}
scan(pctx,"]");

return new ph_arr_lit(elements,pctx);
}).exc(270,function(l,pctx){

var idxexp=parseExp(pctx);



scan(pctx,"]");

return new ph_idx_accessor(l,idxexp,pctx);
});

S(".").exc(270,function(l,pctx){if(pctx.token.id!="<id>")throw new Error("Expected an identifier, found '"+pctx.token+"' instead");



var name=pctx.token.value;

scan(pctx);

return new ph_dot_accessor(l,name,pctx);
});

S("new").exs(function(pctx){var exp=parseExp(pctx,260);


var args=[];
if(pctx.token.id=="("){
scan(pctx);
while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110));
}

scan(pctx,")");
}

return new ph_new(exp,args);
});

S("(").exs(function(pctx){

if(pctx.token.id==')'){


var op=scan(pctx,')');
if(op.id!='->'&&op.id!='=>')throw new Error("Was expecting '->' or '=>' after empty parameter list, but saw '"+pctx.token.id+"'");


scan(pctx);
return op.exsf(pctx);
}

var e=parseExp(pctx);
scan(pctx,")");

return new ph_group(e,pctx);
}).exc(260,function(l,pctx){

var args=[];


while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110));
}

scan(pctx,")");


if(pctx.token.id=='{'){

TOKENIZER_SA.lastIndex=pctx.lastIndex;
while(1){
var matches=TOKENIZER_SA.exec(pctx.src);
if(matches&&(matches[4]=='|'||matches[4]=='||')){



args.push(parseBlockLambda(scan(pctx).id,pctx));
}else if(matches&&matches[1]){

continue;
}
break;
}
}


return new ph_fun_call(l,args,pctx);
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

S("::").exc(205,function(l,pctx){var r=parseExp(pctx,204.5);



return gen_doublecolon_call(l,r,pctx);
});


S("<").ifx(200);
S(">").ifx(200);
S("<=").ifx(200);
S(">=").ifx(200);
S("instanceof").ifx(200);

S("in").ifx(200);

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

S("{").exs(function(pctx){
var start=pctx.token.id;

if(start=="|"||start=="||"){

return parseBlockLambda(start,pctx);
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
var exp=parseExp(pctx,110);
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

var start=pctx.token.id;


if(start!="|"&&start!="||")throw new Error("Unexpected token '"+pctx.token+"' - was expecting '|' or '||'");

var args=[parseBlockLambda(start,pctx)];

return new ph_fun_call(l,args,pctx);
}).stmt(parseBlock);




S(";").stmt(function(pctx){return ph_empty_stmt});
S(")",TOKENIZER_OP);
S("]",TOKENIZER_OP);
S("}");
S(":");

S("<eof>").exs(function(pctx){
throw new Error("Unexpected end of input (exs)")}).stmt(function(pctx){
throw new Error("Unexpected end of input (stmt)")});




function parseFunctionBody(pctx,implicit_return){push_decl_scope(pctx);

push_stmt_scope(pctx);

scan(pctx,"{");
while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}

scan(pctx,"}");

var decls=pctx.decl_scopes.pop();var flags=1;if(decls.notail)flags+=8;if(implicit_return)flags+=32;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exseq(arguments,this,"+pctx.filename+",["+flags,"])");
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
scan(pctx,starttok);
while(pctx.token.id!=endtok){
if(pars.length)scan(pctx,",");

switch(pctx.token.id){case "{":

case "[":
pars.push(parseFunctionParam(pctx));
break;
case "<id>":
pars.push(pctx.token.exsf(pctx));
scan(pctx);
break;
default:
throw new Error("Expected function parameter but found '"+pctx.token+"'");
}
token=pctx.token;
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


return new ph_fun_exp(fname,pars,body,pctx,false);
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


if(pctx.token.id!=="<id>"&&pctx.token.id!=="<@id>")throw new Error("Unexpected "+pctx.token+" in quasi template");
if(pctx.src.charAt(pctx.lastIndex)!='('){

return identifier.exsf(pctx);
}else{


scan(pctx);
scan(pctx,'(');

var args=[];
while(pctx.token.id!=')'){
if(args.length)scan(pctx,',');
args.push(parseExp(pctx,110));
}
return new ph_fun_call(identifier.exsf(pctx),args,pctx);
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

function parseVarDecls(pctx,noIn){var decls=[];

var parse=noIn?parseExpNoIn:parseExp;
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

if(pctx.token.id!=';')start_exp=parseExpNoIn(pctx);

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





function parseCRF(pctx){var rv=[];

var a=null;
if(pctx.token.id=="catch"||pctx.token.value=="catchall"){



var all=pctx.token.value=="catchall";
a=[];
scan(pctx);
a.push(scan(pctx,"(").value);
scan(pctx,"<id>");
scan(pctx,")");
scan(pctx,"{");
a.push(parseBlock(pctx));
a.push(all);
}
rv.push(a);
if(pctx.token.value=="retract"){
scan(pctx);
scan(pctx,"{");
rv.push(parseBlock(pctx));
}else rv.push(null);


if(pctx.token.id=="finally"){
scan(pctx);
scan(pctx,"{");
rv.push(parseBlock(pctx));
}else rv.push(null);


return rv;
}

S("try").stmt(function(pctx){scan(pctx,"{");


var block=parseBlock(pctx);
var op=pctx.token.value;
if(op!="and"&&op!="or"){

var crf=parseCRF(pctx);
if(!crf[0]&&!crf[1]&&!crf[2])throw new Error("Missing 'catch', 'finally' or 'retract' after 'try'");


return new ph_try(block,crf,pctx);
}else{

var blocks=[block];
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value==op);
var crf=parseCRF(pctx);

return gen_waitfor_andor(op,blocks,crf,pctx);
}
});

S("waitfor").stmt(function(pctx){if(pctx.token.id=="{"){



scan(pctx,"{");
var blocks=[parseBlock(pctx)];
var op=pctx.token.value;
if(op!="and"&&op!="or")throw new Error("Missing 'and' or 'or' after 'waitfor' block");
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value==op);
var crf=parseCRF(pctx);

return gen_waitfor_andor(op,blocks,crf,pctx);
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
var crf=parseCRF(pctx);

--top_decl_scope(pctx).fscoped_ctx;

return gen_suspend(has_var,decls,block,crf,pctx);
}
});


S("using").stmt(function(pctx){var has_var;


scan(pctx,"(");
if(has_var=(pctx.token.id=="var"))scan(pctx);

var lhs,exp;
var e1=parseExp(pctx,120);
if(pctx.token.id=="="){
lhs=e1;
scan(pctx);
exp=parseExp(pctx);
}else{

if(has_var)throw new Error("Syntax error in 'using' expression");

exp=e1;
}
scan(pctx,")");
var body=parseStmt(pctx);

return gen_using(has_var,lhs,exp,body,pctx);
});

S("__js").stmt(function(pctx){if(pctx.allow_nblock)++pctx.js_ctx;



var body=parseStmt(pctx);

if(pctx.allow_nblock)--pctx.js_ctx;

body.is_nblock=pctx.allow_nblock;return body;
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
var exception=new Error("SJS syntax error "+(pctx.filename?"in "+pctx.filename+",":"at")+" line "+line+": "+mes);
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


function parseExp(pctx,bp,t){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}


var left=t.exsf(pctx);
while(bp<pctx.token.excbp){

if(pctx.newline&&t.asi_restricted)break;

t=pctx.token;

scan(pctx);
left=t.excf(left,pctx);

}
return left;
}


function parseExpNoIn(pctx,bp,t){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}


var left=t.exsf(pctx);
while(bp<pctx.token.excbp&&pctx.token.id!='in'){
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
if(matches[4]){
pctx.token=ST.lookup(matches[4]);
if(!pctx.token){
pctx.token=new Identifier(matches[4]);
}
}else if(matches[1]){

var m=matches[1].match(/(?:\r\n|\n|\r)/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else if(matches[5]){

pctx.token=new Literal("<string>",matches[5]);
}else if(matches[6]){

var val=matches[6];
var m=val.match(/(?:\r\n|\n|\r)/g);
pctx.line+=m.length;
pctx.newline+=m.length;
var lit=val.replace(/\\(?:\r\n|\n|\r)/g,"").replace(/(?:\r\n|\n|\r)/g,"\\n");
pctx.token=new Literal("<string>",lit);

}else if(matches[2])pctx.token=new Literal("<number>",matches[2]);else if(matches[3])pctx.token=new Literal("<regex>",matches[3]);else if(matches[7])throw new Error("Unexpected characters: '"+matches[7]+"'");else throw new Error("Internal scanner error");









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


})(__oni_rt.c1={});__oni_rt.modsrc['builtin:apollo-sys-common.sjs']="__oni_rt.sys=exports;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar UNDEF;\n\n\n\n\n\nif(!(__oni_rt.G.__oni_rt_bundle)){\n__oni_rt.G.__oni_rt_bundle={};\n}\n\n\n\n\n\n\n\n\n\nexports.hostenv=__oni_rt.hostenv;\n\n\n\n\n\n__js exports.getGlobal=function(){return __oni_rt.G};\n\n\n\n\n\n\n\n\n\n\nvar arrayCtors=[],arrayCtorNames=[\'Uint8Array\',\'Uint16Array\',\'Uint32Array\',\'Int8Array\',\'Int16Array\',\'Int32Array\',\'Float32Array\',\'Float64Array\',\'NodeList\',\'HTMLCollection\',\'FileList\',\'StaticNodeList\'];\n\n\n\n\nfor(var i=0;i<arrayCtorNames.length;i++ ){\nvar c=__oni_rt.G[arrayCtorNames[i]];\nif(c)arrayCtors.push(c);\n}\n__js exports.isArrayLike=function(obj){if(Array.isArray(obj)||!!(obj&&Object.prototype.hasOwnProperty.call(obj,\'callee\')))return true;\n\nfor(var i=0;i<arrayCtors.length;i++ )if(obj instanceof arrayCtors[i])return true;\nreturn false;\n};\n\n\n\n\n\n\n\n\n\n\n\n__js {\nvar _flatten=function(arr,rv){var l=arr.length;\n\nfor(var i=0;i<l;++i){\nvar elem=arr[i];\nif(exports.isArrayLike(elem))_flatten(elem,rv);else rv.push(elem);\n\n\n\n}\n};\n\nexports.flatten=function(arr){var rv=[];\n\nif(arr.length===UNDEF)throw new Error(\"flatten() called on non-array\");\n_flatten(arr,rv);\nreturn rv;\n};\n}\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js exports.expandSingleArgument=function(args){if(args.length==1&&exports.isArrayLike(args[0]))args=args[0];\n\n\nreturn args;\n};\n\n\n\n\n\n\n\n\n\n__js exports.isQuasi=function(obj){return (obj instanceof __oni_rt.QuasiProto);\n\n};\n\n\n\n\n\n\n__js exports.Quasi=function(arr){return __oni_rt.Quasi.apply(__oni_rt,arr)};\n\n\n\n\n\n\n__js exports.mergeObjects=function(){var rv={};\n\nvar sources=exports.expandSingleArgument(arguments);\nfor(var i=0;i<sources.length;i++ ){\nexports.extendObject(rv,sources[i]);\n}\nreturn rv;\n};\n\n\n\n\n\n__js exports.extendObject=function(dest,source){for(var o=null in source){\n\nif(Object.prototype.hasOwnProperty.call(source,o))dest[o]=source[o];\n}\nreturn dest;\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js {\nfunction URI(){}\nURI.prototype={toString:function(){\nreturn \"#{this.protocol}://#{this.authority}#{this.relative}\";\n\n}};\n\nURI.prototype.params=function(){if(!this._params){\n\nvar rv={};\nthis.query.replace(parseURLOptions.qsParser,function(_,k,v){if(k)rv[decodeURIComponent(k)]=decodeURIComponent(v);\n\n});\nthis._params=rv;\n}\nreturn this._params;\n};\n\nvar parseURLOptions={key:[\"source\",\"protocol\",\"authority\",\"userInfo\",\"user\",\"password\",\"host\",\"port\",\"relative\",\"path\",\"directory\",\"file\",\"query\",\"anchor\"],qsParser:/(?:^|&)([^&=]*)=?([^&]*)/g,parser:/^(?:([^:\\/?#]+):)?(?:\\/\\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\\/?#]*)(?::(\\d*))?))?((((?:[^?#\\/]*\\/)*)([^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/};\n\n\n\n\n\n\nexports.parseURL=function(str){var o=parseURLOptions,m=o.parser.exec(str),uri=new URI(),i=14;\n\n\n\n\nwhile(i-- )uri[o.key[i]]=m[i]||\"\";\nreturn uri;\n};\n}\n\n\n\n\n\n\n\n\n\n__js exports.constructQueryString=function(){var hashes=exports.flatten(arguments);\n\nvar hl=hashes.length;\nvar parts=[];\nfor(var h=0;h<hl;++h){\nvar hash=hashes[h];\nfor(var q=null in hash){\nvar l=encodeURIComponent(q)+\"=\";\nvar val=hash[q];\nif(!exports.isArrayLike(val))parts.push(l+encodeURIComponent(val));else{\n\n\nfor(var i=0;i<val.length;++i)parts.push(l+encodeURIComponent(val[i]));\n\n}\n}\n}\nreturn parts.join(\"&\");\n};\n\n\n\n\n\n\n\n\n__js exports.constructURL=function(){var url_spec=exports.flatten(arguments);\n\nvar l=url_spec.length;\nvar rv=url_spec[0];\n\n\nfor(var i=1;i<l;++i){\nvar comp=url_spec[i];\nif(typeof comp!=\"string\")break;\nif(rv.charAt(rv.length-1)!=\"/\")rv+=\"/\";\nrv+=comp.charAt(0)==\"/\"?comp.substr(1):comp;\n}\n\n\nvar qparts=[];\nfor(;i<l;++i){\nvar part=exports.constructQueryString(url_spec[i]);\nif(part.length)qparts.push(part);\n\n}\nvar query=qparts.join(\"&\");\nif(query.length){\nif(rv.indexOf(\"?\")!=-1)rv+=\"&\";else rv+=\"?\";\n\n\n\nrv+=query;\n}\nreturn rv;\n};\n\n\n\n\n\n\n\n__js exports.isSameOrigin=function(url1,url2){var a1=exports.parseURL(url1).authority;\n\nif(!a1)return true;\nvar a2=exports.parseURL(url2).authority;\nreturn !a2||(a1==a2);\n};\n\n\n\n\n\n\n\n\n\n\n__js exports.canonicalizeURL=function(url,base){if(__oni_rt.hostenv==\"nodejs\"&&__oni_rt.G.process.platform==\'win32\'){\n\n\n\nurl=url.replace(/\\\\/g,\"/\");\nbase=base.replace(/\\\\/g,\"/\");\n}\n\nvar a=exports.parseURL(url);\n\n\nif(base&&(base=exports.parseURL(base))&&(!a.protocol||a.protocol==base.protocol)){\n\nif(!a.directory&&!a.protocol){\na.directory=base.directory;\nif(!a.path&&(a.query||a.anchor))a.file=base.file;\n\n}else if(a.directory&&a.directory.charAt(0)!=\'/\'){\n\n\na.directory=(base.directory||\"/\")+a.directory;\n}\nif(!a.protocol){\na.protocol=base.protocol;\nif(!a.authority)a.authority=base.authority;\n\n}\n}\n\n\nvar pin=a.directory.split(\"/\");\nvar l=pin.length;\nvar pout=[];\nfor(var i=0;i<l;++i){\nvar c=pin[i];\nif(c==\".\")continue;\nif(c==\"..\"&&pout.length>1)pout.pop();else pout.push(c);\n\n\n\n}\na.directory=pout.join(\"/\");\n\n\nvar rv=\"\";\nif(a.protocol)rv+=a.protocol+\":\";\nif(a.authority)rv+=\"//\"+a.authority;else if(a.protocol==\"file\")rv+=\"//\";\n\n\n\nrv+=a.directory+a.file;\nif(a.query)rv+=\"?\"+a.query;\nif(a.anchor)rv+=\"#\"+a.anchor;\nreturn rv;\n};\n\n\n\n\n\n\n\n\n\n\n\nexports.jsonp=jsonp_hostenv;\n\n\n\n\n\n\n\nexports.getXDomainCaps=getXDomainCaps_hostenv;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nexports.request=request_hostenv;\n\n\n\n\n\n\nexports.makeMemoizedFunction=function(f,keyfn){var lookups_in_progress={};\n\n\nvar memoizer=function(){var key=keyfn?keyfn.apply(this,arguments):arguments[0];\n\nvar rv=memoizer.db[key];\nif(typeof rv!==\'undefined\')return rv;\nif(!lookups_in_progress[key])lookups_in_progress[key]=spawn (function(self,args){\nreturn memoizer.db[key]=f.apply(self,args);\n\n})(this,arguments);\ntry{\nreturn lookups_in_progress[key].waitforValue();\n}finally{\n\nif(lookups_in_progress[key].waiting()==0){\nlookups_in_progress[key].abort();\ndelete lookups_in_progress[key];\n}\n}\n};\n\nmemoizer.db={};\nreturn memoizer;\n};\n\n\n\n\n\n\n\nexports.eval=eval_hostenv;\n\n\n\n\nvar pendingLoads={};\n\n\n\n\nfunction makeRequire(parent){var rf=function(module,settings){\n\n__js var opts=exports.extendObject({},settings);\n\nif(opts.callback){\ntry{\nvar rv=exports.isArrayLike(module)?requireInnerMultiple(module,rf,parent,opts):requireInner(module,rf,parent,opts);\n}catch(e){\nopts.callback(e);return;\n}\nopts.callback(UNDEF,rv);\nreturn;\n}else return exports.isArrayLike(module)?requireInnerMultiple(module,rf,parent,opts):requireInner(module,rf,parent,opts);\n\n\n};\n\n__js {\n\nrf.resolve=function(module,settings){var opts=exports.extendObject({},settings);\n\nreturn resolve(module,rf,parent,opts);\n};\n\nrf.path=\"\";\nrf.alias={};\n\n\nif(exports.require){\nrf.hubs=exports.require.hubs;\nrf.modules=exports.require.modules;\nrf.extensions=exports.require.extensions;\n}else{\n\n\nrf.hubs=augmentHubs(getHubs_hostenv());\nrf.modules={};\n\nrf.extensions=getExtensions_hostenv();\n}\n\n}\n\n\nrf.url=function(relative){return resolve(relative,rf,parent,{loader:\'dummy\'}).path;\n\n\n};\n\nreturn rf;\n}\nexports._makeRequire=makeRequire;\n\n__js function augmentHubs(hubs){hubs.addDefault=function(hub){\n\nif(!this.defined(hub[0])){\n\nthis.unshift(hub);\nreturn true;\n}\nreturn false;\n};\nhubs.defined=function(prefix){for(var i=0;i<this.length;i++ ){\n\nvar h=this[i][0];\nvar l=Math.min(h.length,prefix.length);\nif(h.substr(0,l)==prefix.substr(0,l))return true;\n}\nreturn false;\n};\nreturn hubs;\n}\n\nfunction html_sjs_extractor(html,descriptor){var re=/<script (?:[^>]+ )?(?:type=[\'\"]text\\/sjs[\'\"]|main=[\'\"]([^\'\"]+)[\'\"])[^>]*>((.|[\\r\\n])*?)<\\/script>/mg;\n\nvar match;\nvar src=\'\';\nwhile(match=re.exec(html)){\nif(match[1])src+=\'require(\"\'+match[1]+\'\")\';else src+=match[2];\n\nsrc+=\';\';\n}\nif(!src)throw new Error(\"No sjs found in HTML file\");\nreturn default_compiler(src,descriptor);\n}\n\n\n__js function resolveAliases(module,aliases){var ALIAS_REST=/^([^:]+):(.*)$/;\n\nvar alias_rest,alias;\nvar rv=module;\nvar level=10;\nwhile((alias_rest=ALIAS_REST.exec(rv))&&(alias=aliases[alias_rest[1]])){\n\nif(--level==0)throw new Error(\"Too much aliasing in modulename \'\"+module+\"\'\");\n\nrv=alias+alias_rest[2];\n}\nreturn rv;\n}\n\n\n__js function resolveHubs(module,hubs,require_obj,parent,opts){var path=module;\n\nvar loader=opts.loader||default_loader;\nvar src=opts.src||default_src_loader;\nvar resolve=default_resolver;\n\n\nif(path.indexOf(\":\")==-1)path=resolveSchemelessURL_hostenv(path,require_obj,parent);\n\n\nvar level=10;\nfor(var i=0,hub;hub=hubs[i++ ];){\nif(path.indexOf(hub[0])==0){\n\nif(typeof hub[1]==\"string\"){\npath=hub[1]+path.substring(hub[0].length);\ni=0;\n\nif(path.indexOf(\":\")==-1)path=resolveSchemelessURL_hostenv(path,require_obj,parent);\n\nif(--level==0)throw new Error(\"Too much indirection in hub resolution for module \'\"+module+\"\'\");\n\n}else if(typeof hub[1]==\"object\"){\n\nif(hub[1].src)src=hub[1].src;\nif(hub[1].loader)loader=hub[1].loader;\nresolve=hub[1].resolve||loader.resolve||resolve;\n\nbreak;\n}else throw new Error(\"Unexpected value for require.hubs element \'\"+hub[0]+\"\'\");\n\n\n}\n}\n\nreturn {path:path,loader:loader,src:src,resolve:resolve};\n}\n\n\n__js function default_src_loader(path){throw new Error(\"Don\'t know how to load module at \"+path);\n\n}\n\n\nvar compiled_src_tag=/^\\/\\*\\__oni_compiled_sjs_1\\*\\//;\nfunction default_compiler(src,descriptor){var f;\n\n\nif(typeof (src)===\'function\'){\nf=src;\n}else if(compiled_src_tag.exec(src)){\n\n\n\n\n\n\nf=new Function(\"module\",\"exports\",\"require\",\"__onimodulename\",\"__oni_altns\",src);\n}else{\n\nf=exports.eval(\"(function(module,exports,require, __onimodulename, __oni_altns){\"+src+\"\\n})\",{filename:\"module #{descriptor.id}\"});\n\n}\nf(descriptor,descriptor.exports,descriptor.require,\"module #{descriptor.id}\",{});\n\n}\n\ndefault_compiler.module_args=[\'module\',\'exports\',\'require\',\'__onimodulename\',\'__oni_altns\'];\n\nvar canonical_id_to_module={};\n\nfunction default_loader(path,parent,src_loader,opts,spec){var compile=exports.require.extensions[spec.type];\n\nif(!compile)throw new Error(\"Unknown type \'\"+spec.type+\"\'\");\n\n\nvar descriptor=exports.require.modules[path];\nvar pendingHook=pendingLoads[path];\n\nif((!descriptor&&!pendingHook)||opts.reload){\n\n\npendingHook=pendingLoads[path]=spawn (function(){waitfor{\n\nvar src,loaded_from;\nif(typeof src_loader===\"string\"){\nsrc=src_loader;\nloaded_from=\"[src string]\";\n}else if(path in __oni_rt.modsrc){\n\n\nloaded_from=\"[builtin]\";\nsrc=__oni_rt.modsrc[path];\ndelete __oni_rt.modsrc[path];\n\n}else{\n\n({src,loaded_from})=src_loader(path);\n}\nvar descriptor={id:path,exports:{},loaded_from:loaded_from,loaded_by:parent,required_by:{}};\n\n\n\n\n\n\ndescriptor.require=makeRequire(descriptor);\n\nvar canonical_id=null;\n\ndescriptor.getCanonicalId=function(){return canonical_id;\n\n};\n\ndescriptor.setCanonicalId=function(id){if(id==null){\n\nthrow new Error(\"Canonical ID cannot be null\");\n}\n\nif(canonical_id!==null){\nthrow new Error(\"Canonical ID is already defined for module \"+path);\n}\n\nvar canonical=canonical_id_to_module[id];\nif(canonical!=null){\nthrow new Error(\"Canonical ID \"+id+\" is already defined in module \"+canonical.id);\n}\n\ncanonical_id=id;\ncanonical_id_to_module[id]=descriptor;\n};\n\nif(opts.main)descriptor.require.main=descriptor;\nexports.require.modules[path]=descriptor;\ntry{\ncompile(src,descriptor);\nreturn descriptor;\n}catch(e){\ndelete exports.require.modules[path];\nthrow e;\n}retract{\ndelete exports.require.modules[path];\n}\n}or{\nwaitfor(){\nhold(0);\npendingHook.resume=resume;\n}\n}\n})();\n}\n\nif(pendingHook){\n\n\n\nvar p=parent;\n\n\n\n\n\nwhile(p.loaded_by){\nif(path===p.id)return descriptor.exports;\n\np=p.loaded_by;\n}\n\n\ntry{\ndescriptor=pendingHook.waitforValue();\n}retract{\n\nif(pendingHook.waiting()==0&&pendingHook.resume){\npendingHook.resume();\npendingHook.value();\n}\n}finally{\n\n\nif(pendingHook.waiting()==0)delete pendingLoads[path];\n\n}\n}\n\nif(!descriptor.required_by[parent.id])descriptor.required_by[parent.id]=1;else ++descriptor.required_by[parent.id];\n\n\n\n\nreturn descriptor.exports;\n}\n\n__js function default_resolver(spec){if(!spec.ext)spec.path+=\".\"+spec.type;\n\n\n};\n\n\nfunction http_src_loader(path){return {src:request_hostenv([path,{format:\'compiled\'}],{mime:\'text/plain\'}),loaded_from:path};\n\n\n\n\n}\n\n\n\n\n\n\nvar github_api=\"https://api.github.com/\";\nvar github_opts={cbfield:\"callback\"};\nfunction github_src_loader(path){var user,repo,tag;\n\ntry{\n[ ,user,repo,tag,path]=/github:\\/([^\\/]+)\\/([^\\/]+)\\/([^\\/]+)\\/(.+)/.exec(path);\n}catch(e){throw new Error(\"Malformed module id \'\"+path+\"\'\")}\n\nvar url=exports.constructURL(github_api,\'repos\',user,repo,\"contents\",path,{ref:tag});\n\nwaitfor{\nvar data=jsonp_hostenv(url,github_opts).data;\n}or{\n\nhold(10000);\nthrow new Error(\"Github timeout\");\n}\nif(data.message&&!data.content)throw new Error(data.message);\n\n\n\nvar str=exports.require(\'sjs:string\');\n\nreturn {src:str.utf8ToUtf16(str.base64ToOctets(data.content)),loaded_from:url};\n\n\n\n}\n\n\nfunction resolve(module,require_obj,parent,opts){var path=resolveAliases(module,require_obj.alias);\n\n\n\nvar hubs=exports.require.hubs;\n\nvar resolveSpec=resolveHubs(path,hubs,require_obj,parent,opts);\n\n\nresolveSpec.path=exports.canonicalizeURL(resolveSpec.path,parent.id);\n\n\n\nvar ext,extMatch=/.+\\.([^\\.\\/]+)$/.exec(resolveSpec.path);\nif(extMatch){\next=extMatch[1].toLowerCase();\nresolveSpec.ext=ext;\nif(!exports.require.extensions[ext])ext=null;\n}\nresolveSpec.type=ext||\'sjs\';\n\nresolveSpec.resolve(resolveSpec,parent);\n\n__js {\n\nvar preload=__oni_rt.G.__oni_rt_bundle;\nvar pendingHubs=false;\nif(preload.h){\n\nvar deleteHubs=[];\nfor(var k=null in preload.h){\nif(!Object.prototype.hasOwnProperty.call(preload.h,k))continue;\nvar entries=preload.h[k];\nvar parent=getTopReqParent_hostenv();\nvar resolved=resolveHubs(k,hubs,exports.require,parent,{});\nif(resolved.path===k){\n\npendingHubs=true;\ncontinue;\n}\n\nfor(var i=0;i<entries.length;i++ ){\nvar ent=entries[i];\npreload.m[resolved.path+ent[0]]=ent[1];\n}\ndeleteHubs.push(k);\n}\n\nif(!pendingHubs)delete preload.h;else{\n\n\nfor(var i=0;i<deleteHubs.length;i++ )delete preload.h[deleteHubs[i]];\n\n}\n}\n\nif(module in __oni_rt.modsrc){\n\n\nif(!preload.m)preload.m={};\npreload.m[resolveSpec.path]=__oni_rt.modsrc[module];\ndelete __oni_rt.modsrc[module];\n}\n\nif(preload.m){\nvar path=resolveSpec.path;\n\nif(path.indexOf(\'!sjs\',path.length-4)!==-1)path=path.slice(0,-4);\n\nvar contents=preload.m[path];\nif(contents!==undefined){\nresolveSpec.src=function(){delete preload.m[path];\n\n\nreturn {src:contents,loaded_from:path+\"#bundle\"};\n};\n}\n}\n\n}\nreturn resolveSpec;\n}\n\n\n\n\n\n__js exports.resolve=function(url,require_obj,parent,opts){require_obj=require_obj||exports.require;\n\nparent=parent||getTopReqParent_hostenv();\nopts=opts||{};\nreturn resolve(url,require_obj,parent,opts);\n};\n\n\nfunction requireInner(module,require_obj,parent,opts){var resolveSpec=resolve(module,require_obj,parent,opts);\n\n\n\n\nmodule=resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts,resolveSpec);\nif(opts.copyTo){\nexports.extendObject(opts.copyTo,module);\n}\n\nreturn module;\n}\n\n\nfunction requireInnerMultiple(modules,require_obj,parent,opts){var rv={};\n\n\n\n\nfunction inner(i,l){if(l===1){\n\nvar descriptor=modules[i];\nvar id,exclude,include,name;\n__js if(typeof descriptor===\'string\'){\nid=descriptor;\nexclude=[];\ninclude=null;\nname=null;\n}else{\n\nid=descriptor.id;\nexclude=descriptor.exclude||[];\ninclude=descriptor.include||null;\nname=descriptor.name||null;\n}\n\nvar module=requireInner(id,require_obj,parent,opts);\n\n\n__js {\nvar addSym=function(k,v){if(rv[k]!==undefined){\n\nif(rv[k]===v)return;\nthrow new Error(\"require([.]) name clash while merging module \'#{id}\': Symbol \'#{k}\' defined in multiple modules\");\n}\nrv[k]=v;\n};\n\nif(name){\naddSym(name,module);\n}else if(include){\nfor(var i=0;i<include.length;i++ ){\nvar o=include[i];\nif(!(o in module))throw new Error(\"require([.]) module #{id} has no symbol #{o}\");\naddSym(o,module[o]);\n}\n}else{\nfor(var o=null in module){\n\n\n\nif(exclude.indexOf(o)!==-1)continue;\naddSym(o,module[o]);\n}\n}\n}\n}else{\n\nvar split=Math.floor(l/2);\nwaitfor{\ninner(i,split);\n}and{\n\ninner(i+split,l-split);\n}\n}\n}\n\n\nif(modules.length!==0)inner(0,modules.length);\nreturn rv;\n}\n\n\n__js exports.require=makeRequire(getTopReqParent_hostenv());\n\n__js exports.require.modules[\'builtin:apollo-sys.sjs\']={id:\'builtin:apollo-sys.sjs\',exports:exports,loaded_from:\"[builtin]\",required_by:{\"[system]\":1}};\n\n\n\n\n\n\nexports.init=function(cb){init_hostenv();\n\ncb();\n};\n\n";__oni_rt.modsrc['builtin:apollo-sys-xbrowser.sjs']="var location;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__js function determineLocation(){if(!location){\n\nlocation={};\nvar scripts=document.getElementsByTagName(\"script\"),matches;\nfor(var i=0;i<scripts.length;++i){\nif((matches=/^(.*\\/)(?:[^\\/]*)stratified(?:[^\\/]*)\\.js(?:\\?.*)?$/.exec(scripts[i].src))){\nlocation.location=exports.canonicalizeURL(matches[1]+\"modules/\",document.location.href);\nlocation.requirePrefix=scripts[i].getAttribute(\"require-prefix\");\nlocation.req_base=scripts[i].getAttribute(\"req-base\")||document.location.href;\nlocation.main=scripts[i].getAttribute(\"main\");\nbreak;\n}\n}\n}\nreturn location;\n}\n\n\n\n\nif(determineLocation().requirePrefix){\n__oni_rt.G[determineLocation().requirePrefix]={require:__oni_rt.sys.require};\n}else __oni_rt.G.require=__oni_rt.sys.require;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nfunction jsonp_hostenv(url,settings){var opts=exports.mergeObjects({iframe:false,cbfield:\"callback\"},settings);\n\n\n\n\n\n\n\n\n\n\nurl=exports.constructURL(url,opts.query);\nif(opts.iframe||opts.forcecb)return jsonp_iframe(url,opts);else return jsonp_indoc(url,opts);\n\n\n\n};\n\nvar jsonp_req_count=0;\nvar jsonp_cb_obj=\"_oni_jsonpcb\";\nfunction jsonp_indoc(url,opts){if(!window[jsonp_cb_obj])window[jsonp_cb_obj]={};\n\n\nvar cb=\"cb\"+(jsonp_req_count++ );\nvar cb_query={};\ncb_query[opts.cbfield]=jsonp_cb_obj+\".\"+cb;\nurl=exports.constructURL(url,cb_query);\nvar elem=document.createElement(\"script\");\nelem.setAttribute(\"src\",url);\nelem.setAttribute(\"async\",\"async\");\nelem.setAttribute(\"type\",\"text/javascript\");\nvar complete=false;\nwaitfor(var rv){\nwindow[jsonp_cb_obj][cb]=resume;\ndocument.getElementsByTagName(\"head\")[0].appendChild(elem);\n\nwaitfor(var error){\nif(elem.addEventListener)elem.addEventListener(\"error\",resume,false);else{\n\n\nvar readystatechange=function(){if(elem.readyState==\'loaded\'&&!complete)resume(new Error(\"script loaded but `complete` flag not set\"));\n\n};\nelem.attachEvent(\"onreadystatechange\",readystatechange);\n}\n}finally{\n\nif(elem.removeEventListener)elem.removeEventListener(\"error\",resume,false);else elem.detachEvent(\"onreadystatechange\",readystatechange);\n\n\n\n}\nthrow new Error(\"Could not complete JSONP request to \'\"+url+\"\'\"+(error?\"\\n\"+error.message:\"\"));\n}finally{\n\nelem.parentNode.removeChild(elem);\ndelete window[jsonp_cb_obj][cb];\n}\ncomplete=true;\nreturn rv;\n}\n\nfunction jsonp_iframe(url,opts){var cb=opts.forcecb||\"R\";\n\nvar cb_query={};\nif(opts.cbfield)cb_query[opts.cbfield]=cb;\n\nurl=exports.constructURL(url,cb_query);\nvar iframe=document.createElement(\"iframe\");\ndocument.getElementsByTagName(\"head\")[0].appendChild(iframe);\nvar doc=iframe.contentWindow.document;\nwaitfor(var rv){\ndoc.open();\niframe.contentWindow[cb]=resume;\n\n\nhold(0);\ndoc.write(\"\\x3Cscript type=\'text/javascript\' src=\\\"\"+url+\"\\\">\\x3C/script>\");\ndoc.close();\n}finally{\n\niframe.parentNode.removeChild(iframe);\n}\n\n\nhold(0);\nreturn rv;\n};\n\n\nvar XHR_caps;\nvar activex_xhr_ver;\n\nfunction getXHRCaps(){if(!XHR_caps){\n\nXHR_caps={};\n\nif(__oni_rt.G.XMLHttpRequest)XHR_caps.XHR_ctor=function(){\nreturn new XMLHttpRequest()};else XHR_caps.XHR_ctor=function(){\n\nif(typeof activex_xhr_ver!==\'undefined\')return new ActiveXObject(activex_xhr_ver);\n\n\nfor(var v=null in {\"MSXML2.XMLHTTP.6.0\":1,\"MSXML2.XMLHTTP.3.0\":1,\"MSXML2.XMLHTTP\":1}){\n\n\n\n\ntry{\nvar req=new ActiveXObject(v);\nactivex_xhr_ver=v;\nreturn req;\n}catch(e){\n}\n}\nthrow new Error(\"Browser does not support XMLHttpRequest\");\n};\n\n\nXHR_caps.XHR_CORS=(\"withCredentials\" in XHR_caps.XHR_ctor());\nif(!XHR_caps.XHR_CORS)XHR_caps.XDR=(typeof __oni_rt.G.XDomainRequest!==\'undefined\');\n\nXHR_caps.CORS=(XHR_caps.XHR_CORS||XHR_caps.XDR)?\"CORS\":\"none\";\n}\nreturn XHR_caps;\n}\n\n\n\n\n\n\nfunction getXDomainCaps_hostenv(){return getXHRCaps().CORS;\n\n}\n\n\n\n\n\n__js function getTopReqParent_hostenv(){var base=determineLocation().req_base;\n\nreturn {id:base,loaded_from:base,required_by:{\"[system]\":1}};\n\n\n\n}\n\n\n\n\n\n\n\n\n\n__js function resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(req_obj.path&&req_obj.path.length)url_string=exports.constructURL(req_obj.path,url_string);\n\n\nreturn exports.canonicalizeURL(url_string,parent.id);\n}\n\n\n\n\n\n\nfunction request_hostenv(url,settings){var opts=exports.mergeObjects({method:\"GET\",body:null,response:\'string\',throwing:true},settings);\n\n\n\n\n\n\n\n\n\n\n\nurl=exports.constructURL(url,opts.query);\n\nvar caps=getXHRCaps();\nif(!caps.XDR||exports.isSameOrigin(url,document.location)){\nvar req=caps.XHR_ctor();\nreq.open(opts.method,url,true,opts.username||\"\",opts.password||\"\");\n}else{\n\n\nreq=new XDomainRequest();\nreq.open(opts.method,url);\n}\n\nwaitfor(var error){\nif(typeof req.onerror!==\'undefined\'){\nreq.onload=function(){resume()};\nreq.onerror=function(){resume(true)};\nreq.onabort=function(){resume(true)};\n}else{\n\nreq.onreadystatechange=function(evt){if(req.readyState!=4)return;else resume();\n\n\n\n\n};\n}\n\nif(opts.headers&&req.setRequestHeader)for(var h=null in opts.headers)req.setRequestHeader(h,opts.headers[h]);\n\n\n\n\n\nif(opts.mime&&req.overrideMimeType)req.overrideMimeType(opts.mime);\n\nif(opts.response===\'arraybuffer\')req.responseType=\'arraybuffer\';\n\n\nreq.send(opts.body);\n}retract{\n\nreq.abort();\n}finally{\n\nif(typeof req.onerror!==\'undefined\'){\nreq.onload=null;\nreq.onerror=null;\nreq.onabort=null;\n}else req.onreadystatechange=null;\n\n\n}\n\n\nif(error||(typeof req.status!==\'undefined\'&&!(req.status.toString().charAt(0) in {\'0\':1,\'2\':1}))){\n\n\nif(opts.throwing){\nvar txt=\"Failed \"+opts.method+\" request to \'\"+url+\"\'\";\nif(req.statusText)txt+=\": \"+req.statusText;\nif(req.status)txt+=\" (\"+req.status+\")\";\nvar err=new Error(txt);\nerr.status=req.status;\nerr.data=req.response;\nthrow err;\n}else if(opts.response===\'string\'){\n\nreturn \"\";\n}\n\n}\nif(opts.response===\'string\')return req.responseText;else if(opts.response===\'arraybuffer\'){\n\n\nreturn {status:req.status,content:req.response,getHeader:name->req.getResponseHeader(name)};\n\n\n\n\n}else{\n\n\nreturn {status:req.status,content:req.responseText,getHeader:name->req.getResponseHeader(name)};\n\n\n\n\n}\n}\n\n\n\n\n__js function getHubs_hostenv(){return [[\"sjs:\",determineLocation().location||{src:function(path){\n\n\nthrow new Error(\"Can\'t load module \'\"+path+\"\': The location of the StratifiedJS standard module lib is unknown - it can only be inferred automatically if you load stratified.js in the normal way through a <script> element.\");\n\n}}],[\"github:\",{src:github_src_loader}],[\"http:\",{src:http_src_loader}],[\"https:\",{src:http_src_loader}],[\"file:\",{src:http_src_loader}],[\"x-wmapp1:\",{src:http_src_loader}],[\"local:\",{src:http_src_loader}]];\n\n\n\n\n\n\n\n\n\n\n\n\n}\n\nfunction getExtensions_hostenv(){return {\'sjs\':default_compiler,\'js\':function(src,descriptor){\n\n\n\n\n\nvar f=new Function(\"module\",\"exports\",src);\n\nf.apply(descriptor.exports,[descriptor,descriptor.exports]);\n},\'html\':html_sjs_extractor};\n\n\n\n}\n\n\n\n\nfunction eval_hostenv(code,settings){if(__oni_rt.UA==\"msie\"&&__oni_rt.G.execScript)return eval_msie(code,settings);\n\n\n\nvar filename=(settings&&settings.filename)||\"sjs_eval_code\";\nfilename=\"\'#{filename.replace(/\\\'/g,\'\\\\\\\'\')}\'\";\nvar mode=(settings&&settings.mode)||\"normal\";\nvar js=__oni_rt.c1.compile(code,{filename:filename,mode:mode});\nreturn __oni_rt.G.eval(js);\n}\n\n\n\n\n\n\n\nvar IE_resume_counter=0;\n__oni_rt.IE_resume={};\nfunction eval_msie(code,settings){var filename=(settings&&settings.filename)||\"sjs_eval_code\";\n\nfilename=\"\'#{filename.replace(/\\\'/g,\'\\\\\\\'\')}\'\";\nvar mode=(settings&&settings.mode)||\"normal\";\ntry{\nwaitfor(var rv,isexception){\nvar rc=++IE_resume_counter;\n__oni_rt.IE_resume[rc]=resume;\nvar js=__oni_rt.c1.compile(\"try{\"+code+\"\\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume[\"+rc+\"](rv[0],rv[1])) }\",{filename:filename,mode:mode});\n\n\n__oni_rt.G.execScript(js);\n}\nif(isexception)throw rv;\n}finally{\n\ndelete __oni_rt.IE_resume[rc];\n}\nreturn rv;\n}\n\n\n\n\nfunction init_hostenv(){}\n\n\n\n\nif(!__oni_rt.G.__oni_rt_no_script_load){\nfunction runScripts(){var scripts=document.getElementsByTagName(\"script\");\n\n\n\n\n\n\n\n\n\nvar ss=[];\nfor(var i=0;i<scripts.length;++i){\nvar s=scripts[i];\nif(s.getAttribute(\"type\")==\"text/sjs\"){\nss.push(s);\n}\n}\n\nfor(var i=0;i<ss.length;++i){\nvar s=ss[i];\nvar m=s.getAttribute(\"module\");\n\nvar content=s.textContent||s.innerHTML;\nif(__oni_rt.UA==\"msie\"){\n\ncontent=content.replace(/\\r\\n/,\"\");\n}\nif(m)__oni_rt.modsrc[m]=content;else{\n\n\nvar descriptor={id:document.location.href+\"_inline_sjs_\"+(i+1)};\n\n\n__oni_rt.sys.require.main=descriptor;\nvar f=exports.eval(\"(function(module, __onimodulename){\"+content+\"\\n})\",{filename:\"module #{descriptor.id}\"});\n\nf(descriptor);\n}\n}\n\nvar mainModule=determineLocation().main;\nif(mainModule){\n__oni_rt.sys.require(mainModule,{main:true});\n}\n};\n\nif(document.readyState===\"complete\"||document.readyState===\"interactive\"){\nrunScripts();\n}else{\n\nif(__oni_rt.G.addEventListener)__oni_rt.G.addEventListener(\"DOMContentLoaded\",runScripts,true);else __oni_rt.G.attachEvent(\"onload\",runScripts);\n\n\n\n}\n}\n\n\n";if(!Array.isArray){

















































































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







if(!__oni_rt.sys){







































__oni_rt.G.eval("(function(exports) {"+__oni_rt.c1.compile(__oni_rt.modsrc['builtin:apollo-sys-common.sjs'],{filename:"'apollo-sys-common.sjs'"})+"\n"+__oni_rt.c1.compile(__oni_rt.modsrc['builtin:apollo-sys-'+__oni_rt.hostenv+'.sjs'],{filename:"'apollo-sys-"+__oni_rt.hostenv+".sjs'"})+"})({})");





delete __oni_rt.modsrc['builtin:apollo-sys-common.sjs'];
delete __oni_rt.modsrc['builtin:apollo-sys-'+__oni_rt.hostenv+'.sjs'];
}




