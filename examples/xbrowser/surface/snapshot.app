/*
  "Stratified Snapshots"

  This sample illustrates how to code simple user interface control flows 
  with Oni Apollo's "surface" user interface module.

  For more information on Oni Surface, see http://onilabs.com/presentations/oni-surface-2012-10/

  This sample makes heavy use of "block lambda syntax", a powerful abstraction
  similar to Ruby's blocks. Block lambdas are like normal JS functions, but 
  have a more succint syntax and slightly different semantics:

  - The code

      win.withUI(someHTML) { |ui| ... }

    is roughly equivalent to
 
      win.withUI(someHTML, function(ui) { ... })

    See http://bit.ly/WkC6QR for documentation on "withUI"

  - Any 'return' in a block lambda exits not only the block lambda, but its enclosing
    function scope as well. (Search for "stream.stop()" below for an example of this)

  - For an extensive discussion of why block lambdas are a useful and
    needed feature in JS, see Yehuda Katz's excellent blog post
    http://yehudakatz.com/2012/01/10/javascript-needs-blocks/ .


  The surface module and block lambdas are not in the current stable Apollo
  release (0.13) yet; they only work in the github version 
  (https://github.com/onilabs/apollo).
 
*/

//----------------------------------------------------------------------
// INITIALIZATION:

// load in the 'surface' UI module and set up a twitter bootstrap styled window:
var surface = require('apollo:surface/base');
var win = require('apollo:surface/bootstrap').Container({style:"{text-align:center}"});
surface.root.append(win);

// load in RTC module (contains a stratified, callback-less getUserMedia implementation):
var rtc = require('./rtc');

// we're also gonna be using window.URL, which is prefixed in older chrome:
window.URL = window.URL || window.webkitURL;

// put up a page header with info about the app:
win.append("<div class='page-header'>
              <h1>Stratified Snapshots<br>
                <small>An <a href='http://onilabs.com/apollo' target='_blank'>Oni Apollo</a> 
                       Sample App - See <a href='snapshot.app!src' target='_blank'>Source Code</a></small>
              </h1>
            </div>
           ");

// check if our browser has 'getUserMedia' support:
if (!rtc.hasGetUserMedia()) {
  // nope. put up a message to that effect:
  win.withUI("<h3>Sorry, this app requires a browser with 'getUserMedia' support, 
like recent releases of Google Chrome</h3>") {
    |ui|
    // no point continuing. stop further execution:
    hold();
  }
}

//----------------------------------------------------------------------
// MAIN PROGRAM LOGIC:

while (1) {

  // first try to get a media stream for the camera:
  var stream = getCameraMediaStream();

  // now that we've got the stream, run our main 'snapshot' UI:
  runSnapshotUI(stream);

  // the user exited the 'snapshot' UI. put up a dialog with a
  // 'restart' button:
  win.withUI("<h3>Bye :-)</h3><button class='btn'>Restart</button>") {
    |ui|
    // block until user clicks on the restart button
    ui.waitforEvent('click', 'button');
  }

}

//----------------------------------------------------------------------
// Snapshot UI

function runSnapshotUI(stream) {

  // our main ui with <video> element and <canvas>, and stop, snapshot and save buttons:
  var mainUI = surface.Html({
    style:   "              { margin-top: 10px; }
              video,canvas  { width: 100%; border:1px solid #a0a0a0; margin:10px; padding:5px;}
              video         { -webkit-transform: scaleX(-1) }
             ",
    content: "<button class='btn btn-large' data-command='stop'>Stop Capture</button> 
              <button class='btn btn-large btn-danger' data-command='snapshot'>Take Snapshot</button>
              <button class='btn btn-large' disabled data-command='save'>Save Image</button>
              <div class='row'>
                <div class='span6'><video autoplay></video></div>
                <div class='span6'><canvas></canvas></div>
              </div>
             "
  });

  var video = mainUI.select1('video');
  var canvas = mainUI.select1('canvas');

  // before we actually display our ui, let's initialize the video
  // element, so that we can determine its natural height and size the
  // canvas accordingly:
  
  // since initializing takes a second or so, we'll do it while
  // displaying a message to the user:
  win.withUI("<h3>Initializing...</h3>") {
    ||
    // set the media stream as the video src...
    video.src = URL.createObjectURL(stream);
    // ... and wait until the video element has the stream metadata:
    waitforMetadata(video);
    // now set the size of the canvas element to match the video:
    canvas.setAttribute('height', video.height);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  // now that we've initialized the video element and sized the canvas
  // to match, we can display our main ui:
  win.withUI(mainUI) {
    ||
    while (1) {
      // wait for one of the buttons to be clicked:
      var command = mainUI.waitforCommand(); 
      switch (command) {
      case 'stop':
        stream.stop();
        return; // all done; note how this 'return' not only exits the 
                // block lambda, but also the runSnapshot() function
      case 'snapshot':
        canvas.getContext('2d').drawImage(video, 0, 0);
        // now that we've got a snapshot, make sure the 'save' button is enabled:
        mainUI.select1("[data-command='save']").disabled = false;
        break;
      case 'save':
        window.open(canvas.toDataURL());
        break;
      }
    }
  }
}

//----------------------------------------------------------------------
// getCameraMediaStream dialog

function getCameraMediaStream() {
  try {
    // display a message, while we wait for the user to grant camera
    // access:
    win.withUI("<h3>Please allow camera access</h3>") {
      |ui|
      // just for fun, let's do two concurrent things:
      waitfor {
        // animate the opacity of the message:
        cycleOpacity(ui.dompeer);
      }
      or {
        // ask the user for camera access, and return a media stream.
        // if our request is rejected (or there is no camera), an
        // exception will be thrown
        return rtc.getUserMedia({video:true});
      }
    }
  }
  catch (e) {
    // user rejected the camera request (or there is no camera).
    // display a message...
    win.withUI("<h3>Error accessing camera (error code: #{e.code})</h3>
                <button class='btn'>Retry</button>") {
      |ui|
      // ... and wait for user to click 'retry'
      ui.waitforEvent('click', 'button');
    }
    // user clicked 'retry', so try again:
    return getCameraMediaStream();
  }
}


//----------------------------------------------------------------------
// helpers

// periodically cycle the opacity of the given DOM element:
function cycleOpacity(elem) {
  for (var i=0;;i+=.2) {
    elem.style.opacity = .3*Math.sin(i)+.7;
    hold(100);
  }
}

function waitforMetadata(elem) {
  // Note: onloadedmetadata doesn't fire correctly in Chrome; see crbug.com/110938
  // Hence we poll at 100ms intervals :-(
  while (elem.videoHeight == 0) hold(100);
}
