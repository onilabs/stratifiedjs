/*
 * Oni Apollo StratifiedJS Runtime
 * Server-side NodeJS-based implementation
 *
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
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
var error_message="Error: "+e.message;

if(stack.lastIndexOf(error_message,0)==0){
stack=stack.slice(error_message.length);
}else{
if(stack.lastIndexOf("Error",0)==0)stack=stack.slice(5);
}
stack=stack.trim();
e.stack="";
var lines=stack.split("\n");
var i;
for(i=0;i<lines.length;i++ ){

if((caller_module&&lines[i].indexOf(caller_module)!=-1)||lines[i].indexOf("oni-apollo-node.js")!=-1||lines[i].indexOf("oni-apollo.js")!=-1){



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
value.__oni_stack=[];
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




},mapToJS:function(augment){
if(this.type=="t"){




throw (augment&&this.val.__oni_stack)?new Error(this.val.toString()):this.val;
}else if(!this.ef)throw new Error(this.toString());else throw this;




}};






function is_ef(obj){return obj&&obj.__oni_ef;

}

function setEFProto(t){for(var p in EF_Proto)t[p]=EF_Proto[p]}




function mergeCallstacks(target_ef,src_ef){if(target_ef.callstack){





target_ef.callstack=target_ef.callstack.concat(src_ef.callstack);
if(target_ef.callstack.length>20)target_ef.callstack.splice(20/2,target_ef.callstack.length-20+1,['    ...(frames omitted)']);



}else{


target_ef.callstack=src_ef.callstack;
}
}


var EF_Proto={toString:function(){
return "<suspended SJS>"},__oni_ef:true,setChildFrame:function(ef,idx){


if(this.child_frame&&this.child_frame.callstack){


mergeCallstacks(ef,this.child_frame);
}
this.async=true;
this.child_frame=ef;
ef.parent=this;
ef.parent_idx=idx;
},quench:function(){






this.child_frame.quench();

},abort:function(){

return this.child_frame.abort();



},returnToParent:function(val){

if((val instanceof CFException)&&val.type=='t'&&this.callstack&&val.val.__oni_stack){

val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}
if(this.swallow_r){
if((val instanceof CFException)){
if(val.type=="r"){
if(!val.ef||val.ef==this)val=val.val;

}
}else if(is_ef(val))val.swallow_r=this.swallow_r;else if(this.swallow_r!=2)val=UNDEF;




}




this.unreturnable=true;





if(this.async){
if(this.parent){
this.parent.cont(this.parent_idx,val);





}else if((val instanceof CFException)){





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


if((rv instanceof CFException))return rv.mapToJS();

return rv;
};



exports.exbl=function(env,args){var rv=I_seq(args,env);


if((rv instanceof CFException))return rv.mapToJS();

return rv;
};




function makeINCtor(exec){return function(){
return {exec:exec,ndata:arguments,__oni_dis:token_dis};





};
}





function Env(aobj,tobj,file,blref,blscope){this.aobj=aobj;

this.tobj=tobj;
this.file=file;
this.blref=blref;
this.blscope=blscope;
}

function copyEnv(e){return new Env(e.aobj,e.tobj,e.file,e.blref,e.blscope);

}






function I_call(ndata,env){try{

var rv=(ndata[0]).call(env);
if(is_ef(rv)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([env.file,ndata[1]]);
}
return rv;
}catch(e){

if((e instanceof CFException)){
if(e.type=='blb'&&e.ef==env.blscope){



return UNDEF;
}
}else{
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}
exports.C=makeINCtor(I_call);






function I_nblock(ndata,env){try{

return (ndata[0]).call(env);
}catch(e){

if(!(e instanceof CFException)){
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}
exports.Nb=makeINCtor(I_nblock);





function I_blocklambda(ndata,env){return ndata[0].bind(env);

}
exports.Bl=makeINCtor(I_blocklambda);











function EF_Seq(ndata,env){this.ndata=ndata;

this.env=env;

if(ndata[0]&8){
env.blref=this;
env.blscope=this;
}else if(ndata[0]&1){

this.env=copyEnv(env);
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

if((val instanceof CFException)){

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
}
break;
}
if((++idx==this.ndata.length&&this.tailcall)||(val instanceof CFException)){

break;
}
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
}
return this.returnToParent(val);
}
};

EF_Seq.prototype.quench=function(){if(this.child_frame)this.child_frame.quench();

};

EF_Seq.prototype.abort=function(){if(!this.child_frame){



this.aborted=true;
return this;
}else return this.child_frame.abort();


};

function I_seq(ndata,env){return (new EF_Seq(ndata,env)).cont(1);

}
exports.Seq=makeINCtor(I_seq);













function EF_Sc(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Sc.prototype={});

EF_Sc.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val instanceof CFException)){

return this.returnToParent(val);
}else{

this.child_frame=null;
if(idx==1){

this.pars.push(val);
}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.env);
++this.i;
if((rv instanceof CFException))return this.returnToParent(rv);
if(is_ef(rv)){
this.setChildFrame(rv,1);
return this;
}
this.pars.push(rv);
}


try{
rv=this.ndata[1].apply(this.env,this.pars);
}catch(e){

rv=new CFException("t",e,this.ndata[0],this.env.file);


}
return this.returnToParent(rv);
}
};

function I_sc(ndata,env){return (new EF_Sc(ndata,env)).cont(0);

}

exports.Sc=makeINCtor(I_sc);





function testIsFunction(f){if(typeof f=="function")return true;










return !!/(?:\[[^o])|(?:^\/)/.exec(""+f);
}







function EF_Fcall(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Fcall.prototype={});

EF_Fcall.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val instanceof CFException)){

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
++this.i;
if((rv instanceof CFException))return this.returnToParent(rv);
if(is_ef(rv)){
this.child_frame=null;
this.setChildFrame(rv,1);
return this;
}
if(this.i==3)this.l=rv;else this.pars.push(rv);



}


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
rv=eval(command);
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.env.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],this.pars);
}else if(!testIsFunction(this.l[0][this.l[1]])){




rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.env.file);



}else{



var command="this.l[0][this.l[1]](";
for(var i=0;i<this.pars.length;++i){
if(i)command+=",";
command+="this.pars["+i+"]";
}
command+=")";
rv=eval(command);
}
break;
case 2:




var ctor=this.l;
if(ctor&&(/\{ \[native code\] \}$/.exec(ctor.toString())||ctor==Buffer)){


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



this.o=Object.create(ctor.prototype);
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







if((e instanceof CFException)){

if(e.type=='blb'&&e.ef==this.env.blscope){
rv=UNDEF;
}else rv=e;


}else rv=new CFException("t",e,this.ndata[1],this.env.file);




}
if(is_ef(rv)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([this.env.file,this.ndata[1]]);
}
return this.returnToParent(rv);
}
};

function I_fcall(ndata,env){return (new EF_Fcall(ndata,env)).cont(0);

}

exports.Fcall=makeINCtor(I_fcall);








function EF_If(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_If.prototype={});

EF_If.prototype.cont=function(idx,val){switch(idx){case 0:



val=execIN(this.ndata[0],this.env);

case 1:
if((val instanceof CFException))break;
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

function I_if(ndata,env){return (new EF_If(ndata,env)).cont(0);

}

exports.If=makeINCtor(I_if);





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
}
if((val instanceof CFException))return this.returnToParent(val);
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
if((val instanceof CFException))return this.returnToParent(val);
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}else if(val==Default||val==this.testval)break;


}
if(++idx>=this.ndata[1].length)return this.returnToParent(null);


this.child_frame=null;
val=execIN(this.ndata[1][idx][0],this.env);
}
this.phase=2;
val=0;
case 2:
while(true){
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
if((val instanceof CFException)){
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
++idx;
}
default:
throw "Invalid phase in Switch SJS node";
}
};

function I_switch(ndata,env){return (new EF_Switch(ndata,env)).cont(0);

}

exports.Switch=makeINCtor(I_switch);











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
if(!this.aborted&&this.ndata[2]&&(((val instanceof CFException)&&val.type=="t")||this.ndata[0]&1)){



var v;
if(this.ndata[0]&1){


v=(val instanceof CFException)?[val.val,true]:[val,false];
}else v=val.val;


val=this.ndata[2](this.env,v);


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



if((this.rv instanceof CFException)&&!(val instanceof CFException)){
val=this.rv;
}
break;
default:
val=new CFException("i","invalid state in CF_Try");
}
return this.returnToParent(val);
}
};

EF_Try.prototype.quench=function(){if(this.state!=4)this.child_frame.quench();


};

EF_Try.prototype.abort=function(){this.parent=UNDEF;




this.aborted=true;

if(this.state!=4){
var val=this.child_frame.abort();
if(is_ef(val)){


this.setChildFrame(val);
}else{


if(this.cont(0,UNDEF)!=this)return;


}
}
return this;
};

function I_try(ndata,env){return (new EF_Try(ndata,env)).cont(0);

}

exports.Try=makeINCtor(I_try);








function EF_Loop(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Loop.prototype={});

EF_Loop.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

while(true){

if(idx==0){
if((val instanceof CFException)){

return this.returnToParent(val);
}

val=execIN(this.ndata[1],this.env);
if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}
idx=2;
}

if(idx>1){
if(idx==2){

if(!val||(val instanceof CFException)){

return this.returnToParent(val);
}
}
while(1){
if(idx>2){
if((val instanceof CFException)){
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


val=execIN(this.ndata[idx+1],this.env);
++idx;
if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,idx);
return this;
}
}
idx=1;
}

if(this.ndata[2]){

val=execIN(this.ndata[2],this.env);
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

function I_loop(ndata,env){return (new EF_Loop(ndata,env)).cont(ndata[0],true);

}

exports.Loop=makeINCtor(I_loop);








function EF_ForIn(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_ForIn.prototype={});

EF_ForIn.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==0){
val=execIN(this.ndata[0],this.env);
if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,1);
return this;
}
idx=1;
}
if(idx==1){

if((val instanceof CFException))return this.returnToParent(val);

for(var x in val){
if(typeof this.remainingX==='undefined'){
val=this.ndata[1](this.env,x);
if((val instanceof CFException)){
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

if((val instanceof CFException)){
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

function I_forin(ndata,env){return (new EF_ForIn(ndata,env)).cont(0);

}

exports.ForIn=makeINCtor(I_forin);








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
}else if((val instanceof CFException)){


this.pendingCFE=val;
this.quench();
return this.abortInner();
}
}
}else{


--this.pending;
this.children[idx]=UNDEF;
if((val instanceof CFException)&&!this.aborted){

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

function I_par(ndata,env){return (new EF_Par(ndata,env)).cont(-1);

}

exports.Par=makeINCtor(I_par);








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

cf=this.collapsing.cf;
this.collapsing=UNDEF;
cf.cont(1);
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

function I_alt(ndata,env){return (new EF_Alt(ndata,env)).cont(-1);

}

exports.Alt=makeINCtor(I_alt);









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

ef.cont(2,arguments);
}catch(e){

var s=function(){throw e};
process.nextTick(s);
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
return this.cont(3,null);
}

if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}
case 1:

if((val instanceof CFException)){
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
if((val instanceof CFException)){


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

function I_sus(ndata,env){return (new EF_Suspend(ndata,env)).cont(0);

}

exports.Suspend=makeINCtor(I_sus);










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

function EF_SpawnWaitFrame(waitarr){this.waitarr=waitarr;

waitarr.push(this);
}
setEFProto(EF_SpawnWaitFrame.prototype={});
EF_SpawnWaitFrame.prototype.quench=function(){};
EF_SpawnWaitFrame.prototype.abort=function(){var idx=this.waitarr.indexOf(this);

this.waitarr.splice(idx,1);
};
EF_SpawnWaitFrame.prototype.cont=function(val){if(this.parent)this.parent.cont(this.parent_idx,val);


};

function I_spawn(ndata,env){var val,async,have_val,picked_up=false;

var waitarr=[];
var stratum={abort:function(){
if(!async)return;

ef.quench();
ef.abort();
async=false;
val=new CFException("t",new Error("stratum aborted"),ndata[0],env.file);



while(waitarr.length)waitarr.shift().cont(val);

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
function notifyVal(_val){val=_val;

async=false;
if(!waitarr.length){





if((val instanceof CFException)&&(val.type!='t'||val.val instanceof Error)){










setTimeout(function(){if(!picked_up)val.mapToJS(true);







},0);

}
}else while(waitarr.length)waitarr.shift().cont(val);




}
var ef=new EF_Spawn(ndata,env,notifyAsync,notifyVal);
ef.cont(0);
return stratum;
}

exports.Spawn=makeINCtor(I_spawn);










function EF_Collapse(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Collapse.prototype={});


EF_Collapse.prototype.__oni_collapse=true;

EF_Collapse.prototype.cont=function(idx,val){if(idx==0){

var fold=this.env.fold;
if(!fold)return new CFException("t",new Error("Unexpected collapse statement"),this.ndata[0],this.env.file);


if(fold.docollapse(this.env.branch,this))return true;


this.async=true;
return this;
}else if(idx==1)this.returnToParent(true);else this.returnToParent(new CFException("t","Internal error in SJS runtime (collapse)",this.ndata[0],this.env.file));





};


EF_Collapse.prototype.quench=function(){};
EF_Collapse.prototype.abort=function(){};

function I_collapse(ndata,env){return (new EF_Collapse(ndata,env)).cont(0);

}

exports.Collapse=makeINCtor(I_collapse);




function dummy(){}

exports.Hold=function(){if(!arguments.length)return {__oni_ef:true,quench:dummy,abort:dummy};


var sus={__oni_ef:true,abort:dummy,quench:function(){

sus=null;clearTimeout(this.co)}};

sus.co=setTimeout(function(){if(sus&&sus.parent)sus.parent.cont(sus.parent_idx,UNDEF)},arguments[0]);

return sus;
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

if(!env.blref)throw "Internal runtime error; no reference frame in BlBreak";
if(env.blref.unreturnable&&!env.blref.toplevel)throw new Error("Blocklambda break to inactive scope");

e.ef=env.blref;
return e;
};

exports.BlReturn=function(exp){var e=new CFException('r',exp);

if(!this.blref)throw "Internal runtime error; no reference frame in BlReturn";
if(this.blref.unreturnable){
if(this.blref.toplevel)throw new Error("Invalid blocklambda 'return' statement; 'return' is only allowed in blocklambdas that are nested in functions");else{



throw new Error("Blocklambda return to inactive function");
}
}
e.ef=this.blref;
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


var UA="nodejs";
exports.hostenv="nodejs";
exports.UA=UA;

exports.G=global;

exports.modules={};exports.modsrc={};})(__oni_rt);(function(exports){function push_decl_scope(pctx,bl){































pctx.decl_scopes.push({vars:[],funs:"",fscoped_ctx:0,bl:bl,continue_scope:0,break_scope:0});


if(bl){
var prev=pctx.decl_scopes[pctx.decl_scopes.length-2];
if(!prev.bl)prev.notail=true;

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

if(typeof pctx.scopes!=='undefined')throw "Internal parser error: Nested script";


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

if(this.nblock_val)return this.nblock_val();else throw "Illegal statement in __js block";






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

















this.code="function "+fname+"("+pars.join(",")+"){"+body+"}";
}
ph_fun_exp.prototype=new ph();

ph_fun_exp.prototype.v=function(){return this.code;

};
ph_fun_exp.prototype.nblock_val=function(){return this.code};

function gen_fun_decl(fname,pars,body,pctx){if(top_decl_scope(pctx).fscoped_ctx){



return gen_var_decl([[new ph_identifier(fname,pctx),new ph_fun_exp("",pars,body,pctx)]],pctx);
}else return new ph_fun_decl(fname,pars,body,pctx);


}

function ph_fun_decl(fname,pars,body,pctx){this.code="function "+fname+"("+pars.join(",")+"){"+body+"}";

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

this.is_empty=this.d.length<2;
this.pctx=pctx;
this.line=pctx.line;
if(!this.is_empty)this.is_nblock=pctx.allow_nblock&&d[1].is_nblock&&!this.is_dest;


}
ph_var_decl.prototype=new ph();
ph_var_decl.prototype.is_var_decl=true;
ph_var_decl.prototype.collect_var_decls=function(vars){try{

this.d[0].collect_var_decls(vars);
}catch(e){

throw "Invalid syntax in variable declaration";
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
if(this.crf[0][2])throw "catchall statement not allowed in __js block";
rv+="catch("+this.crf[0][0]+"){"+this.crf[0][1].nb()+"}";
}
if(this.crf[1])throw "retract statement not allowed in __js block";
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
ph_bl_break.prototype.nblock_val=function(){if(this.js_ctx)throw "Blocklamdas cannot contain 'break' statements in __js{...} contexts";

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
}else throw "Can't encode this loop as __js yet";

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
ph_literal.prototype.destruct=function(){if(this.value!="")throw "invalid pattern";return ""};
ph_literal.prototype.collect_var_decls=function(){};

function ph_infix_op(left,id,right,pctx){this.left=left;


this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock;
}
ph_infix_op.prototype=new ph();
ph_infix_op.prototype.is_value=true;

ph_infix_op.prototype.collect_pars=function(pars){if(this.id!=',')throw "invalid parameter list syntax";

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
if(id!="=")throw "Invalid operator in destructuring assignment";
}
this.left=left;
this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock&&!this.is_dest;

}
ph_assign_op.prototype=new ph();
ph_assign_op.prototype.is_value=true;
ph_assign_op.prototype.nblock_val=function(){return this.left.nb()+this.id+this.right.nb();

};
ph_assign_op.prototype.val=function(){var rv;

if(this.is_nblock){
rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.is_dest){

rv="__oni_rt.Sc("+this.line+",function(_oniX";
try{
var drefs=[],body=this.left.destruct("_oniX",drefs);
for(var i=1;i<=drefs.length;++i)rv+=",_oniX"+i;

rv+="){"+body+"},"+this.right.v();
for(var i=0;i<drefs.length;++i)rv+=","+drefs[i];

rv+=")";
}catch(e){

throw {mes:"Invalid left side in destructuring assignment ",line:this.line};

}
}else if(!this.left.is_ref||this.left.is_nblock){




rv="__oni_rt.Sc("+this.line+",function(_oniX){return "+this.left.nb()+this.id+"_oniX;},"+this.right.v()+")";


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

function ph_postfix_op(left,id,pctx){if(!left.is_ref&&!left.is_id)throw "Invalid argument for postfix op '"+id+"'";

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





function ph_arrow(pars_exp,body,pctx,bound){this.is_nblock=pctx.allow_nblock;

this.js_ctx=pctx.js_ctx;
this.line=pctx.line;
this.bound=bound;

this.code='function(){';







if(pars_exp){
var pars,vars=[],assignments="";



try{
if(pars_exp.collect_pars)pars_exp.collect_pars(pars=[]);else pars=[pars_exp];



for(var i=0;i<pars.length;++i){
pars[i].collect_var_decls(vars);
assignments+=pars[i].destruct('arguments['+i+']');
}

if(vars.length){
this.code+="var "+vars.join(',')+";";
}

this.code+=assignments;

}catch(e){

throw "Invalid syntax in parameter list";
}
}

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
return r;
}else return new ph_fun_call(r,[l],pctx);


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
ph_identifier.prototype.destruct=function(dpath){return this.name+"="+dpath+";";

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
throw "'"+this.name+"' not allowed in destructuring pattern";

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
ph_dot_accessor.prototype.collect_var_decls=function(vars){throw "var declaration must not contain property accessor as lvalue";

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
if(p[0]=="pat"){
rv+=p[1]+"="+dpath+"."+p[1]+";";
}else rv+=p[2].destruct(dpath+"["+quotedName(p[1])+"]",drefs);


}
return rv;
};
ph_obj_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.props.length;++i){

var p=this.props[i];
if(p[0]=="pat")vars.push(p[1]);else p[2].collect_var_decls(vars);



}
};


function ph_conditional(t,c,a,pctx){this.t=t;

this.c=c;
this.a=a;
this.line=t.line;
this.is_nblock=pctx.allow_nblock&&t.is_nblock&&c.is_nblock&&a.is_nblock;
}
ph_conditional.prototype=new ph();
ph_conditional.prototype.is_value=true;
ph_conditional.prototype.nblock_val=function(){return this.t.nb()+"?"+this.c.nb()+":"+this.a.nb();

};
ph_conditional.prototype.val=function(){return "__oni_rt.If("+this.t.v()+","+this.c.v()+","+this.a.v()+")";

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
if(name=="arguments")throw "Cannot use 'arguments' as variable name in waitfor()";
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

if(!lhs.is_id)throw "Variable name expected in 'using' expression";
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







function ph_blocklambda(pars,body,pctx){this.code="__oni_rt.Bl(function("+pars.join(",")+"){"+body+"})";

}
ph_blocklambda.prototype=new ph();
ph_blocklambda.prototype.val=function(){return this.code};



function ph_lbl_stmt(lbl,stmt){this.lbl=lbl;

this.stmt=stmt;
}
ph_lbl_stmt.prototype=new ph();
ph_lbl_stmt.prototype.nblock_val=function(){return this.lbl+": "+this.stmt.nb();


};
ph_lbl_stmt.prototype.val=function(){throw "labeled statements not implemented yet";


};








function Hash(){}
Hash.prototype={lookup:function(key){
return this["$"+key]},put:function(key,val){
this["$"+key]=val},del:function(key){
delete this["$"+key]}};
























var TOKENIZER_SA=/(?:[ \f\r\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:\n|\/\*(?:.|\n|\r)*?\*\/)+)|((?:0[xX][\da-fA-F]+)|(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))|(\/(?:\\.|\[(?:\\.|[^\n\]])*\]|[^\[\/\n])+\/[gimy]*)|(==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$_\w]+)|('(?:\\.|[^\\\'\n])*')|('(?:\\(?:.|\n|\r)|[^\\\'])*')|(\S+))/g;



var TOKENIZER_OP=/(?:[ \f\r\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:\n|\/\*(?:.|\n|\r)*?\*\/)+)|(>>>=|===|!==|>>>|<<=|>>=|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$_\w]+))/g;



var TOKENIZER_IS=/((?:\\.|\#(?!\{)|[^#\\\"\n])+)|(\\\n)|(\n)|(\"|\#\{)/g;


var TOKENIZER_QUASI=/((?:\\.|\$(?![\{a-zA-Z_$])|[^$\\\`\n])+)|(\\\n)|(\n)|(\`|\$\{|\$(?=[a-zA-Z_$]))/g;




function SemanticToken(){}
SemanticToken.prototype={exsf:function(pctx){




throw "Unexpected '"+this+"'"},excbp:0,excf:function(left,pctx){




throw "Unexpected '"+this+"'"},stmtf:null,tokenizer:TOKENIZER_SA,toString:function(){









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



function Literal(type,value){this.id=type;

this.value=value;
}
Literal.prototype=new SemanticToken();
Literal.prototype.tokenizer=TOKENIZER_OP;
Literal.prototype.toString=function(){return "literal '"+this.value+"'"};
Literal.prototype.exsf=function(pctx){return new ph_literal(this.value,pctx,this.id);


};


function Identifier(value){this.value=value;

}
Identifier.prototype=new Literal("<id>");
Identifier.prototype.exsf=function(pctx){return gen_identifier(this.value,pctx);


};
Identifier.prototype.toString=function(){return "identifier '"+this.value+"'"};



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

S(".").exc(270,function(l,pctx){if(pctx.token.id!="<id>")throw "Expected an identifier, found '"+pctx.token+"' instead";


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
if(op.id!='->'&&op.id!='=>')throw "Was expecting '->' or '=>' after empty parameter list, but saw '"+pctx.token.id+"'";


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

scan(pctx,":");
var alternative=parseExp(pctx,110);

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

if(id=="<id>"||id=="<string>"||id=="<number>")return token.value;

if(id=='"'){
if((token=scan(pctx)).id!="<string>"||scan(pctx,undefined,TOKENIZER_IS).id!='istr-"')throw "Non-literal strings can't be used as property names ("+token+")";


return '"'+token.value+'"';
}
throw "Invalid object literal syntax; property name expected, but saw "+token;
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

var decls=pctx.decl_scopes.pop();return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exbl(this,["+1,"])");
}
function parseBlockLambda(start,pctx){var token=scan(pctx);

var pars=[];

if(start=="|"){
while(token.id!="|"){
if(pars.length)token=scan(pctx,",");

if(token.id!="<id>")throw "Expected parameter name but found '"+token+"'";

pars.push(token.value);
token=scan(pctx);
}
scan(pctx,"|");
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

if(prop.charAt(0)=="'"||prop.charAt(0)=='"')throw "Quoted identifiers not allowed in destructuring patterns ("+prop+")";

props.push(["pat",prop,pctx.line]);
}else throw "Unexpected token '"+pctx.token+"'";


}
scan(pctx,"}",TOKENIZER_OP);

return new ph_obj_lit(props,pctx);
}
}).exc(260,function(l,pctx){

var start=pctx.token.id;

if(start!="|"&&start!="||")throw "Unexpected token '"+pctx.token+"' - was expecting '|' or '||'";

var args=[parseBlockLambda(start,pctx)];

return new ph_fun_call(l,args,pctx);;
}).stmt(parseBlock);




S(";").stmt(function(pctx){return ph_empty_stmt});
S(")",TOKENIZER_OP);
S("]",TOKENIZER_OP);
S("}");
S(":");

S("<eof>").exs(function(pctx){
throw "Unexpected end of input (exs)"}).stmt(function(pctx){
throw "Unexpected end of input (stmt)"});




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



function parseFunctionInner(pctx,pars,implicit_return){var token=scan(pctx,"(");

while(token.id!=")"){
if(pars.length)token=scan(pctx,",");

if(token.id!="<id>")throw "Expected parameter name but found '"+token+"'";

pars.push(token.value);
token=scan(pctx);
}
scan(pctx,")");
return parseFunctionBody(pctx,implicit_return);
}


S("function").exs(function(pctx){

var fname="";

if(pctx.token.id=="<id>"){
fname=pctx.token.value;
scan(pctx);
}
var pars=[];
var body=parseFunctionInner(pctx,pars);

return new ph_fun_exp(fname,pars,body,pctx,false);
}).stmt(function(pctx){

if(pctx.token.id!="<id>")throw "Malformed function declaration";

var fname=pctx.token.value;
scan(pctx);
var pars=[];
var body=parseFunctionInner(pctx,pars);

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
throw "Unterminated string";
break;
default:
throw "Internal parser error: Unknown token in string ("+pctx.token+")";
}
scan(pctx,undefined,TOKENIZER_IS);
}
scan(pctx);

if(last==-1){
parts.push('');
last=0;
}

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
throw 'Unterminated string';
break;
default:
throw 'Internal parser error: Unknown token in string ('+pctx.token+')';
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


if(pctx.token.id!="<id>")throw "Unexpected "+pctx.token+" in quasi template";
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

function parseStmtTermination(pctx){if(pctx.token.id!="}"&&pctx.token.id!="<eof>"&&!pctx.newline)scan(pctx,";");


}

function parseVarDecls(pctx,noIn){var decls=[];

var parse=noIn?parseExpNoIn:parseExp;
do {
if(decls.length)scan(pctx,",");
var id_or_pattern=parse(pctx,120);
if(pctx.token.id=="="){
scan(pctx);
var initialiser=parse(pctx,110);
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

if(decls&&decls.length>1)throw "More that one variable declaration in for-in loop";

var obj_exp=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
var decl=decls?decls[0]:null;

return gen_for_in(start_exp,decl,obj_exp,body,pctx);
}else throw "Unexpected token '"+pctx.token+"' in for-statement";


});

S("continue").stmt(function(pctx){var label=null;

if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;
scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).continue_scope)return new ph_cfe("c",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_return(undefined,pctx);else throw "Unexpected 'continue' statement";
});

S("break").stmt(function(pctx){var label=null;

if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;
scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).break_scope)return new ph_cfe("b",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_bl_break(pctx,label);else throw "Unexpected 'break' statement";
});

S("return").stmt(function(pctx){var exp=null;

if(!isStmtTermination(pctx.token)&&!pctx.newline)exp=parseExp(pctx);

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
}else throw "Invalid token '"+pctx.token+"' in switch statement";


scan(pctx,":");

push_stmt_scope(pctx);top_stmt_scope(pctx).exp=clause_exp;
while(pctx.token.id!="case"&&pctx.token.id!="default"&&pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}
clauses.push((function(pctx){return [top_stmt_scope(pctx).exp,pop_block(pctx)]})(pctx));
}
--top_decl_scope(pctx).break_scope;
scan(pctx,"}");

return new ph_switch(exp,clauses);(exp,clauses,pctx);
});

S("throw").stmt(function(pctx){if(pctx.newline)throw "Illegal newline after throw";

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
if(!crf[0]&&!crf[1]&&!crf[2])throw "Missing 'catch', 'finally' or 'retract' after 'try'";


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
if(op!="and"&&op!="or")throw "Missing 'and' or 'or' after 'waitfor' block";
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
if(has_var)throw "Missing variables in waitfor(var)";
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

if(has_var)throw "Syntax error in 'using' expression";

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







if(settings)for(var a in settings)ctx[a]=settings[a];



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
exports.compile=compile;

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

return t.stmtf(pctx);
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
t=pctx.token;

if(pctx.newline&&t.asi_restricted)return left;

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

if(id&&(!pctx.token||pctx.token.id!=id))throw "Unexpected "+pctx.token;

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

var m=matches[1].match(/\n/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else if(matches[5])pctx.token=new Literal("<string>",matches[5]);else if(matches[6]){



var val=matches[6];
var m=val.match(/\n/g);
pctx.line+=m.length;
pctx.newline+=m.length;
val=val.replace(/\\\n/g,"").replace(/\n/g,"\\n");
pctx.token=new Literal("<string>",val);
}else if(matches[2])pctx.token=new Literal("<number>",matches[2]);else if(matches[3])pctx.token=new Literal("<regex>",matches[3]);else if(matches[7])throw "Unexpected characters: '"+matches[7]+"'";else throw "Internal scanner error";









}else if(tokenizer==TOKENIZER_OP){

if(matches[2]){
pctx.token=ST.lookup(matches[2]);
if(!pctx.token){
pctx.token=new Identifier(matches[2]);
}
}else if(matches[1]){

var m=matches[1].match(/\n/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else{




tokenizer=TOKENIZER_SA;

}

}else if(tokenizer==TOKENIZER_IS){


if(matches[1])pctx.token=new Literal("<string>",matches[1]);else if(matches[2]){


++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n');
}else if(matches[4]){

pctx.token=ST.lookup("istr-"+matches[4]);
}
}else if(tokenizer==TOKENIZER_QUASI){


if(matches[1])pctx.token=new Literal("<string>",matches[1]);else if(matches[2]){


++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n');
}else if(matches[4]){

pctx.token=ST.lookup("quasi-"+matches[4]);
}
}else throw "Internal scanner error: no tokenizer";


}
return pctx.token;
}


})(__oni_rt.c1={});__oni_rt.modsrc['builtin:apollo-sys-common.sjs']="__oni_rt.sys=exports;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar UNDEF;\n\n\n\n\n\n\n\n\n\nexports.hostenv=__oni_rt.hostenv;\n\n\n\n\n\nexports.getGlobal=function(){return __oni_rt.G};\n\n\n\n\n\n\n\n\n\nexports.isArrayLike=function(obj){return Array.isArray(obj)||!!(obj&&Object.prototype.hasOwnProperty.call(obj,\'callee\'))||!!(typeof NodeList==\'function\'&&obj instanceof NodeList);\n\n\n\n};\n\n\n\n\n\n\n\n\n\n\n\nexports.flatten=function(arr,rv){var rv=rv||[];\n\nvar l=arr.length;\nfor(var i=0;i<l;++i){\nvar elem=arr[i];\nif(exports.isArrayLike(elem))exports.flatten(elem,rv);else rv.push(elem);\n\n\n\n}\nreturn rv;\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nexports.expandSingleArgument=function(args){if(args.length==1&&exports.isArrayLike(args[0]))args=args[0];\n\n\nreturn args;\n};\n\n\n\n\n\n\n\n\n\nexports.isQuasi=function(obj){return (obj instanceof __oni_rt.QuasiProto);\n\n};\n\n\n\n\n\n\nexports.Quasi=function(arr){return __oni_rt.Quasi.apply(__oni_rt,arr)};\n\n\n\n\n\n\nexports.mergeObjects=function(){var rv={};\n\nvar sources=exports.expandSingleArgument(arguments);\nfor(var i=0;i<sources.length;i++ ){\nexports.extendObject(rv,sources[i]);\n}\nreturn rv;\n};\n\n\n\n\n\nexports.extendObject=function(dest,source){for(var o in source){\n\nif(Object.hasOwnProperty.call(source,o))dest[o]=source[o];\n}\nreturn dest;\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nfunction URI(){}\nURI.prototype={toString:function(){\nreturn \"#{this.protocol}://#{this.authority}#{this.relative}\";\n\n}};\n\n\nexports.parseURL=function(str){var o=exports.parseURL.options,m=o.parser.exec(str),uri=new URI(),i=14;\n\n\n\n\n\nwhile(i-- )uri[o.key[i]]=m[i]||\"\";\n\nuri[o.q.name]={};\nuri[o.key[12]].replace(o.q.parser,function($0,$1,$2){if($1)uri[o.q.name][$1]=$2;\n\n});\n\nreturn uri;\n};\nexports.parseURL.options={key:[\"source\",\"protocol\",\"authority\",\"userInfo\",\"user\",\"password\",\"host\",\"port\",\"relative\",\"path\",\"directory\",\"file\",\"query\",\"anchor\"],q:{name:\"queryKey\",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:/^(?:([^:\\/?#]+):)?(?:\\/\\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\\/?#]*)(?::(\\d*))?))?((((?:[^?#\\/]*\\/)*)([^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nexports.constructQueryString=function(){var hashes=exports.flatten(arguments);\n\nvar hl=hashes.length;\nvar parts=[];\nfor(var h=0;h<hl;++h){\nvar hash=hashes[h];\nfor(var q in hash){\nvar l=encodeURIComponent(q)+\"=\";\nvar val=hash[q];\nif(!exports.isArrayLike(val))parts.push(l+encodeURIComponent(val));else{\n\n\nfor(var i=0;i<val.length;++i)parts.push(l+encodeURIComponent(val[i]));\n\n}\n}\n}\nreturn parts.join(\"&\");\n};\n\n\n\n\n\n\n\n\nexports.constructURL=function(){var url_spec=exports.flatten(arguments);\n\nvar l=url_spec.length;\nvar rv=url_spec[0];\n\n\nfor(var i=1;i<l;++i){\nvar comp=url_spec[i];\nif(typeof comp!=\"string\")break;\nif(rv.charAt(rv.length-1)!=\"/\")rv+=\"/\";\nrv+=comp.charAt(0)==\"/\"?comp.substr(1):comp;\n}\n\n\nvar qparts=[];\nfor(;i<l;++i){\nvar part=exports.constructQueryString(url_spec[i]);\nif(part.length)qparts.push(part);\n\n}\nvar query=qparts.join(\"&\");\nif(query.length){\nif(rv.indexOf(\"?\")!=-1)rv+=\"&\";else rv+=\"?\";\n\n\n\nrv+=query;\n}\nreturn rv;\n};\n\n\n\n\n\n\n\nexports.isSameOrigin=function(url1,url2){var a1=exports.parseURL(url1).authority;\n\nif(!a1)return true;\nvar a2=exports.parseURL(url2).authority;\nreturn !a2||(a1==a2);\n};\n\n\n\n\n\n\n\n\n\n\nexports.canonicalizeURL=function(url,base){if(__oni_rt.hostenv==\"nodejs\"&&__oni_rt.G.process.platform==\'win32\'){\n\n\n\nurl=url.replace(/\\\\/g,\"/\");\nbase=base.replace(/\\\\/g,\"/\");\n}\n\nvar a=exports.parseURL(url);\n\n\nif(base&&(base=exports.parseURL(base))&&(!a.protocol||a.protocol==base.protocol)){\n\nif(!a.directory&&!a.protocol)a.directory=base.directory;else if(a.directory&&a.directory.charAt(0)!=\'/\'){\n\n\n\na.directory=(base.directory||\"/\")+a.directory;\n}\nif(!a.protocol){\na.protocol=base.protocol;\nif(!a.authority)a.authority=base.authority;\n\n}\n}\n\n\nvar pin=a.directory.split(\"/\");\nvar l=pin.length;\nvar pout=[];\nfor(var i=0;i<l;++i){\nvar c=pin[i];\nif(c==\".\")continue;\nif(c==\"..\"&&pout.length>1)pout.pop();else pout.push(c);\n\n\n\n}\na.directory=pout.join(\"/\");\n\n\nvar rv=\"\";\nif(a.protocol)rv+=a.protocol+\":\";\nif(a.authority)rv+=\"//\"+a.authority;else if(a.protocol==\"file\")rv+=\"//\";\n\n\n\nrv+=a.directory+a.file;\nif(a.query)rv+=\"?\"+a.query;\nif(a.anchor)rv+=\"#\"+a.anchor;\nreturn rv;\n};\n\n\n\n\n\n\n\n\n\n\n\nexports.jsonp=jsonp_hostenv;\n\n\n\n\n\n\n\nexports.getXDomainCaps=getXDomainCaps_hostenv;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nexports.request=request_hostenv;\n\n\n\n\n\n\nexports.makeMemoizedFunction=function(f,keyfn){var lookups_in_progress={};\n\n\nvar memoizer=function(){var key=keyfn?keyfn.apply(this,arguments):arguments[0];\n\nvar rv=memoizer.db[key];\nif(typeof rv!==\'undefined\')return rv;\nif(!lookups_in_progress[key])lookups_in_progress[key]=spawn (function(args){\nreturn memoizer.db[key]=f.apply(this,args);\n\n})(arguments);\ntry{\nreturn lookups_in_progress[key].waitforValue();\n}finally{\n\nif(lookups_in_progress[key].waiting()==0){\nlookups_in_progress[key].abort();\ndelete lookups_in_progress[key];\n}\n}\n};\n\nmemoizer.db={};\nreturn memoizer;\n};\n\n\n\n\nexports.eval=eval_hostenv;\n\n\n\n\nvar pendingLoads={};\n\n\n\n\nfunction makeRequire(parent){var rf=function(module,settings){\n\nvar opts=exports.extendObject({},settings);\n\nif(opts.callback){\n(spawn (function(){try{\n\nvar rv=requireInner(module,rf,parent,opts);\n}catch(e){\n\nopts.callback(e);return 1;\n}\nopts.callback(UNDEF,rv);\n})());\n}else return requireInner(module,rf,parent,opts);\n\n\n};\n\nrf.resolve=function(module,settings){var opts=exports.extendObject({},settings);\n\nreturn resolve(module,rf,parent,opts);\n};\n\nrf.path=\"\";\nrf.alias={};\n\n\nif(exports.require){\nrf.hubs=exports.require.hubs;\nrf.modules=exports.require.modules;\nrf.extensions=exports.require.extensions;\n}else{\n\n\nrf.hubs=getHubs_hostenv();\nrf.modules={};\n\nrf.extensions=getExtensions_hostenv();\n}\nreturn rf;\n}\n\n\nfunction resolveAliases(module,aliases){var ALIAS_REST=/^([^:]+):(.*)$/;\n\nvar alias_rest,alias;\nvar rv=module;\nvar level=10;\nwhile((alias_rest=ALIAS_REST.exec(rv))&&(alias=aliases[alias_rest[1]])){\n\nif(--level==0)throw \"Too much aliasing in modulename \'\"+module+\"\'\";\n\nrv=alias+alias_rest[2];\n}\nreturn rv;\n}\n\n\nfunction resolveHubs(module,hubs,opts){var path=module;\n\nvar loader=opts.loader||default_loader;\nvar src=opts.src||default_src_loader;\nvar level=10;\nfor(var i=0,hub;hub=hubs[i++ ];){\nif(path.indexOf(hub[0])==0){\n\nif(typeof hub[1]==\"string\"){\npath=hub[1]+path.substring(hub[0].length);\ni=0;\nif(--level==0)throw \"Too much indirection in hub resolution for module \'\"+module+\"\'\";\n\n}else if(typeof hub[1]==\"object\"){\n\nif(hub[1].src)src=hub[1].src;\nif(hub[1].loader)loader=hub[1].loader;\n\nbreak;\n}else throw \"Unexpected value for require.hubs element \'\"+hub[0]+\"\'\";\n\n\n}\n}\n\nreturn {path:path,loader:loader,src:src};\n}\n\n\nfunction default_src_loader(path){throw new Error(\"Don\'t know how to load module at \"+path);\n\n}\n\n\nvar compiled_src_tag=/^\\/\\*\\__oni_compiled_sjs_1\\*\\//;\nfunction default_compiler(src,descriptor){var f;\n\n\nif(compiled_src_tag.exec(src)){\n\n\n\n\nf=new Function(\"module\",\"exports\",\"require\",\"__onimodulename\",src);\nf(descriptor,descriptor.exports,descriptor.require,\"module #{descriptor.id}\");\n}else{\n\nf=exports.eval(\"(function(module,exports,require, __onimodulename){\"+src+\"\\n})\",{filename:\"module #{descriptor.id}\"});\n\nf(descriptor,descriptor.exports,descriptor.require);\n}\n\n}\n\nfunction default_loader(path,parent,src_loader,opts){var extension=/.+\\.([^\\.\\/]+)$/.exec(path)[1];\n\n\n\nvar compile=exports.require.extensions[extension];\nif(!compile)throw \"Unknown type \'\"+extension+\"\'\";\n\n\nvar descriptor;\nif(!(descriptor=exports.require.modules[path])){\n\nvar pendingHook=pendingLoads[path];\nif(!pendingHook){\npendingHook=pendingLoads[path]=spawn (function(){var src,loaded_from;\n\nif(typeof src_loader===\"string\"){\nsrc=src_loader;\nloaded_from=\"[src string]\";\n}else if(path in __oni_rt.modsrc){\n\n\nloaded_from=\"[builtin]\";\nsrc=__oni_rt.modsrc[path];\ndelete __oni_rt.modsrc[path];\n\n}else{\n\n({src,loaded_from})=src_loader(path);\n}\nvar descriptor={id:path,exports:{},loaded_from:loaded_from,loaded_by:parent,required_by:{},require:makeRequire(path)};\n\n\n\n\n\n\n\ncompile(src,descriptor);\n\n\n\n\n\nexports.require.modules[path]=descriptor;\n\nreturn descriptor;\n})();\n}\ntry{\nvar descriptor=pendingHook.waitforValue();\n}finally{\n\n\nif(pendingHook.waiting()==0)delete pendingLoads[path];\n\n}\n}\n\nif(!descriptor.required_by[parent])descriptor.required_by[parent]=1;else ++descriptor.required_by[parent];\n\n\n\n\nreturn descriptor.exports;\n}\n\nfunction http_src_loader(path){var src;\n\nif(getXDomainCaps_hostenv()!=\'none\'||exports.isSameOrigin(path,document.location))src=request_hostenv([path,{format:\'compiled\'}],{mime:\'text/plain\'});else{\n\n\n\n\npath+=\"!modp\";\nsrc=jsonp_hostenv(path,{forcecb:\"module\",cbfield:null});\n\n\n}\nreturn {src:src,loaded_from:path};\n}\n\n\n\n\n\n\nvar github_api=\"https://api.github.com/\";\nvar github_opts={cbfield:\"callback\"};\nfunction github_src_loader(path){var user,repo,tag;\n\ntry{\n[ ,user,repo,tag,path]=/github:([^\\/]+)\\/([^\\/]+)\\/([^\\/]+)\\/(.+)/.exec(path);\n}catch(e){throw \"Malformed module id \'\"+path+\"\'\"}\n\nvar url=exports.constructURL(github_api,\'repos\',user,repo,\"contents\",path,{ref:tag});\n\nwaitfor{\nvar data=jsonp_hostenv(url,github_opts).data;\n}or{\n\nhold(10000);\nthrow new Error(\"Github timeout\");\n}\nif(data.message&&!data.content)throw new Error(data.message);\n\n\n\nvar str=exports.require(\'sjs:string\');\n\nreturn {src:str.utf8ToUtf16(str.base64ToOctets(data.content)),loaded_from:url};\n\n\n\n}\n\n\nfunction resolve(module,require_obj,parent,opts){var path=resolveAliases(module,require_obj.alias);\n\n\n\n\nif(path.indexOf(\":\")==-1)path=resolveSchemelessURL_hostenv(path,require_obj,parent);\n\n\n\nvar resolveSpec=resolveHubs(path,exports.require.hubs,opts);\n\n\nresolveSpec.path=exports.canonicalizeURL(resolveSpec.path,parent);\n\n\nif(resolveSpec.loader==default_loader&&resolveSpec.path.charAt(resolveSpec.path.length-1)!=\'/\'){\n\n\nvar matches=/.+\\.([^\\.\\/]+)$/.exec(resolveSpec.path);\nif(!matches||!exports.require.extensions[matches[1]])resolveSpec.path+=\".sjs\";\n\n}\n\nif(parent==getTopReqParent_hostenv())parent=\"[toplevel]\";\n\n\nreturn resolveSpec;\n}\n\n\n\n\n\nexports.resolve=function(url,require_obj,parent,opts){require_obj=require_obj||exports.require;\n\nparent=parent||getTopReqParent_hostenv();\nopts=opts||{};\nreturn resolve(url,require_obj,parent,opts);\n};\n\n\nfunction requireInner(module,require_obj,parent,opts){var resolveSpec=resolve(module,require_obj,parent,opts);\n\n\n\n\nmodule=resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts);\nif(opts.copyTo){\nexports.extendObject(opts.copyTo,module);\n}\n\nreturn module;\n}\n\n\nexports.require=makeRequire(getTopReqParent_hostenv());\n\nexports.require.modules[\'builtin:apollo-sys.sjs\']={id:\'builtin:apollo-sys.sjs\',exports:exports,loaded_from:\"[builtin]\",loaded_by:\"[toplevel]\",required_by:{\"[toplevel]\":1}};\n\n\n\n\n\n\n\nexports.init=function(cb){init_hostenv();\n\ncb();\n};\n\n";__oni_rt.modsrc['builtin:apollo-sys-nodejs.sjs']="function jsonp_hostenv(url,settings){\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nvar opts=exports.mergeObjects({cbfield:\"callback\",forcecb:\"jsonp\"},settings);\n\n\n\n\n\n\n\nvar query={};\nquery[opts.cbfield]=opts.forcecb;\n\nvar parser=/^[^{]*({[^]+})[^}]*$/;\nvar data=parser.exec(request_hostenv([url,opts.query,query]));\n\n\n\n\ndata[1]=data[1].replace(/([^\\\\])\\\\x/g,\"$1\\\\u00\");\n\ntry{\nreturn JSON.parse(data[1]);\n}catch(e){\n\nthrow new Error(\"Invalid jsonp response from \"+exports.constructURL(url)+\" (\"+e+\")\");\n}\n}\n\n\n\n\n\n\nfunction getXDomainCaps_hostenv(){return \"*\";\n\n}\n\n\n\n\n\nvar req_base;\nfunction getTopReqParent_hostenv(){if(!req_base)req_base=\"file://\"+process.cwd()+\"/\";\n\nreturn req_base;\n}\n\n\n\n\n\n\n\n\n\nfunction resolveSchemelessURL_hostenv(url_string,req_obj,parent){if(/^\\.?\\.?\\//.exec(url_string))return exports.canonicalizeURL(url_string,parent);else return \"nodejs:\"+url_string;\n\n\n\n\n}\n\n\n\n\nvar readStream=exports.readStream=function readStream(stream){if(stream.readable===false)return null;\n\n\n\n\nvar data=null;\n\nwaitfor{\nwaitfor(var exception){\nstream.on(\'error\',resume);\nstream.on(\'end\',resume);\n}finally{\n\nstream.removeListener(\'error\',resume);\nstream.removeListener(\'end\',resume);\n}\nif(exception)throw exception;\n}or{\n\nwaitfor(data){\nstream.on(\'data\',resume);\n}finally{\n\nstream.removeListener(\'data\',resume);\n}\n}or{\n\n\n\nstream.resume();\nhold();\n}finally{\n\nif(stream.readable)stream.pause();\n\n}\n\nreturn data;\n};\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nfunction request_hostenv(url,settings){var opts=exports.mergeObjects({method:\"GET\",headers:{},response:\'string\',throwing:true,max_redirects:5},settings);\n\n\n\n\n\n\n\n\n\n\n\n\nvar url_string=exports.constructURL(url,opts.query);\n\n\nvar url=exports.parseURL(url_string);\nvar protocol=url.protocol;\nif(!(protocol===\'http\'||protocol===\'https\')){\nthrow (\'Unsupported protocol: \'+protocol);\n}\nvar secure=(protocol==\"https\");\nvar port=url.port||(secure?443:80);\n\nif(!opts.headers[\'Host\'])opts.headers.Host=url.authority;\n\nif(opts.body&&!opts.headers[\'Transfer-Encoding\']){\n\n\n\nopts.body=new Buffer(opts.body);\nopts.headers[\'Content-Length\']=opts.body.length;\n}else{\n\nopts.headers[\'Content-Length\']=0;\n}\nvar auth;\nif(typeof opts.username!=\'undefined\'&&typeof opts.password!=\'undefined\')auth=opts.username+\":\"+opts.password;\n\nvar request=__oni_rt.nodejs_require(protocol).request({method:opts.method,host:url.host,port:port,path:url.relative||\'/\',headers:opts.headers,auth:auth});\n\n\n\n\n\n\n\nrequest.end(opts.body);\n\nwaitfor{\nwaitfor(var err){\nrequest.on(\'error\',resume);\n}finally{\n\nrequest.removeListener(\'error\',resume);\n}\nthrow new Error(err);\n}or{\n\nwaitfor(var response){\nrequest.on(\'response\',resume);\n}finally{\n\nrequest.removeListener(\'response\',resume);\n}\n}retract{\n\n\n\nrequest.on(\'error\',function(){});\nrequest.abort();\n}\n\nif(response.statusCode<200||response.statusCode>=300){\nswitch(response.statusCode){case 300:\ncase 301:case 302:case 303:case 307:\nif(opts.max_redirects>0){\n\nopts.headers.host=null;\n--opts.max_redirects;\n\n\n\nreturn request_hostenv(exports.canonicalizeURL(response.headers[\'location\'],url_string),opts);\n\n\n}\n\ndefault:\nif(opts.throwing){\nvar txt=\"Failed \"+opts.method+\" request to \'\"+url_string+\"\'\";\ntxt+=\" (\"+response.statusCode+\")\";\nvar err=new Error(txt);\n\nerr.status=response.statusCode;\nerr.request=request;\nerr.response=response;\n\nresponse.setEncoding(\'utf8\');\nresponse.data=\"\";\nvar data;\nwhile(data=readStream(response)){\nresponse.data+=data;\n}\nerr.data=response.data;\nthrow err;\n}else if(opts.response==\'string\')return \"\";\n\n\n\n}\n}\n\n\nresponse.setEncoding(\'utf8\');\nresponse.data=\"\";\nvar data;\nwhile(data=readStream(response)){\nresponse.data+=data;\n}\n\nif(opts.response==\'string\')return response.data;else{\n\n\n\nreturn {content:response.data,getHeader:name->response.headers[name.toLowerCase()]};\n\n\n\n}\n\n};\n\nfunction file_src_loader(path){waitfor(var err,data){\n\n\n__oni_rt.nodejs_require(\'fs\').readFile(path.substr(7),resume);\n}\nif(err){\n\n\nvar matches;\nif((matches=/(.*)\\.sjs$/.exec(path))){\ntry{\nreturn file_src_loader(matches[1]);\n}catch(e){throw err+\"\\nand then\\n\"+e}\n}else throw err;\n\n\n}\nreturn {src:data.toString(),loaded_from:path};\n}\n\n\nfunction nodejs_loader(path,parent,dummy_src,opts){path=path.substr(7);\n\n\n\n\n\n\nvar base;\nif(!(/^file:/.exec(parent)))base=getTopReqParent_hostenv();else base=parent;\n\n\n\n\nbase=base.substr(7);\n\nvar mockModule={paths:__oni_rt.nodejs_require(\'module\')._nodeModulePaths(base)};\n\n\n\nvar resolved=\"\";\ntry{\nresolved=__oni_rt.nodejs_require(\'module\')._resolveFilename(path,mockModule);\n\nif(resolved instanceof Array)resolved=resolved[1];\n\nif(resolved.indexOf(\'.\')==-1)return __oni_rt.nodejs_require(resolved);\n}catch(e){\n}\n\nvar matches;\nif(!(matches=/.+\\.([^\\.\\/]+)$/.exec(path))){\ntry{\n\nresolved=__oni_rt.nodejs_require(\'module\')._resolveFilename(path+\".sjs\",mockModule);\n\nif(resolved instanceof Array)resolved=resolved[1];\n\n\nreturn default_loader(\"file://\"+resolved,parent,file_src_loader,opts);\n}catch(e){\n}\n}else if(resolved&&matches[1]!=\"js\"){\n\n\nif(exports.require.extensions[matches[1]])return default_loader(\"file://\"+resolved,parent,file_src_loader,opts);\n\n}\n\nif(resolved==\"\")throw new Error(\"nodejs module at \'\"+path+\"\' not found\");\nreturn __oni_rt.nodejs_require(resolved);\n}\n\nfunction getHubs_hostenv(){return [[\"sjs:\",\"file://\"+__oni_rt.nodejs_apollo_lib_dir],[\"github:\",{src:github_src_loader}],[\"http:\",{src:http_src_loader}],[\"https:\",{src:http_src_loader}],[\"file:\",{src:file_src_loader}],[\"nodejs:\",{loader:nodejs_loader}]];\n\n\n\n\n\n\n\n\n}\n\nfunction html_sjs_extractor(html,descriptor){var re=/<script (?:[^>]+ )?type=[\'\"]text\\/sjs[\'\"][^>]*>((.|\\n)*?)<\\/script>/mg;\n\nvar match;\nvar src=\'\';\nwhile(match=re.exec(html)){\nsrc+=match[1];\nsrc+=\';\';\n}\nif(!src)throw new Error(\"No sjs found in HTML file\");\nreturn default_compiler(src,descriptor);\n}\n\nfunction getExtensions_hostenv(){return {\'sjs\':default_compiler,\'js\':function(src,descriptor){\n\n\n\n\nvar vm=__oni_rt.nodejs_require(\"vm\");\n\nvar sandbox=vm.createContext(global);\nsandbox.module=descriptor;\nsandbox.exports=descriptor.exports;\nsandbox.require=descriptor.require;\nvm.runInNewContext(src,sandbox,\"module \"+descriptor.id);\n},\'html\':html_sjs_extractor};\n\n\n}\n\n\n\n\nfunction eval_hostenv(code,settings){var filename=(settings&&settings.filename)||\"sjs_eval_code\";\n\nfilename=\"\'#{filename.replace(/\\\'/g,\'\\\\\\\'\')}\'\";\nvar mode=(settings&&settings.mode)||\"normal\";\nvar js=__oni_rt.c1.compile(code,{filename:filename,mode:mode});\nreturn __oni_rt.G.eval(js);\n}\n\n\n\n\n\nfunction init_hostenv(){var init_path=process.env[\'APOLLO_INIT\'];\n\nif(init_path){\nvar node_fs=__oni_rt.nodejs_require(\'fs\');\nvar files=init_path.split(\':\');\nfor(var i=0;i<files.length;i++ ){\nvar path=files[i];\nif(!path)continue;\ntry{\npath=node_fs.realpathSync(path);\nexports.require(\'file://\'+path);\n}catch(e){\nconsole.error(\"Error loading init script at \"+path+\": \"+e);\nthrow e;\n}\n}\n}\n};\n\n\n";var rt=global.__oni_rt;








































var path=require('path');
var fs=require('fs');

global.__oni_rt.nodejs_require=require;
global.__oni_rt.nodejs_apollo_lib_dir=path.join(path.dirname(fs.realpathSync(__filename)),'modules/');

var sys=rt.G.eval("(function(exports) {"+rt.c1.compile(rt.modsrc['builtin:apollo-sys-common.sjs'],{filename:"'apollo-sys-common.sjs'"})+"\n"+rt.c1.compile(rt.modsrc['builtin:apollo-sys-'+rt.hostenv+'.sjs'],{filename:"'apollo-sys-"+rt.hostenv+".sjs'"})+"})");









sys(exports);

delete rt.modsrc['builtin:apollo-sys-common.sjs'];
delete rt.modsrc['builtin:apollo-sys-'+rt.hostenv+'.sjs'];


