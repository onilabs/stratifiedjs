/*

*/

//----------------------------------------------------------------------
// Load in 'oni surface' & 'twitter bootstrap' modules & set up page:
var surface = require('apollo:surface/base');
var win = require('apollo:surface/bootstrap').Container({style:"{text-align:center}"});
surface.root.append(win);
// Load in RTC module (getUserMedia, ...):
var rtc = require('./rtc');

//----------------------------------------------------------------------
// MAIN PROGRAM:

win.append("<div class='page-header'>
              <h1>Stratified Snapshots<br>
                <small>An <a href='http://onilabs.com/apollo' target='_blank'>Oni Apollo</a> Sample App - See <a href='snapshot.app!src' target='_blank'>Source Code</a></small>
              </h1>
            </div>
           ");

// first check if we've got camera support in the browser:
if (!rtc.hasGetUserMedia())
  win.withUI("<h3>Sorry, this app requires a browser with 'getUserMedia' support, 
like recent releases of Google Chrome</h3>") {
    |ui|
    hold(); // stop the program
  }

// run main program in an endless loop:
while (1) {
  var stream = getMediaStream();
  runSnapshotUI(stream);
  win.withUI("<h3>Bye :-)</h3>
              <button class='btn'>Restart</button>") {
    |ui|
    ui.waitforEvent('click', 'button');
  }
}

//----------------------------------------------------------------------
// Snapshot UI

function runSnapshotUI(stream) {
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
  
  surface.mixinCommandAPI(mainUI);

  var video = mainUI.select1('video');
  var canvas = mainUI.select1('canvas');

  win.withUI("<h3>Initializing...</h3>") {
    ||
    video.src = URL.createObjectURL(stream);
    waitforMetadata(video);
    canvas.setAttribute('height', video.height);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  win.withUI(mainUI) {
    ||
    while (1) {
      var command = mainUI.waitforCommand(); 
      switch (command) {
      case 'stop':
        stream.stop();
        return; // all done
      case 'snapshot':
        canvas.getContext('2d').drawImage(video, 0, 0);
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
// getMediaStream dialog

function getMediaStream() {
  try {
    win.withUI("<h3>Please allow camera access</h3>") {
      |ui|
      waitfor {
        cycleOpacity(ui.dompeer);
      }
      or {
        return rtc.getUserMedia({video:true});
      }
    }
  }
  catch (e) {
    win.withUI("<h3>Error accessing camera (error code: #{e.code})</h3>
                <button class='btn'>Retry</button>") {
      |ui|
      ui.waitforEvent('click', 'button');
    }
    // try again:
    return getMediaStream();
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
