var context;
var file;
var analyser;
var bufferlength;
var waveformdata;
var cameraoffset = 0;
var trackBuffer = null;
var playing = false;
var started = false;
var poscount = 0;
var framecount = 0;
var framemax = 11;
var currentsong;

var params = {
    song: "dubtrack.mp3",
    move: false,
    speed: 0.1,
    bars: 64,
    barheight: 1,
    wireframe: false,
    cameray: 5,
    cameraz: 30,
    cameraxrotation: 0,
    color1: 0xff0000,
    color2: 0x0000ff
};


function init() {
  try {
    // Fix up for prefixing
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
	context = new AudioContext();
	loadTrack();
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
  
}

function loadTrack() {  
    var button = document.getElementById("playbutton");
    button.disabled = true;
    button.innerText = "Loading";
    button.textContent = "Loading";

    var request = new XMLHttpRequest();
    console.log(currentsong);
	request.open('GET', params.song,true);
	request.responseType = 'arraybuffer';

	request.onload = function() {
		context.decodeAudioData(request.response, function(buffer) {
		  trackBuffer = buffer;
		});
	  }
    request.send();
    analyser = context.createAnalyser();
    analyser.fftSize = 128;
    bufferlength = analyser.frequencyBinCount;
    waveformdata = new Uint8Array(bufferlength);
    analyser.getByteTimeDomainData(waveformdata);
    setTimeout(enableButton,3000);
    console.log(waveformdata);
  }

function playSound(buffer) {
	var source = context.createBufferSource(); // creates a sound source
    source.buffer = buffer;                    // tell the source which sound to play

    source.connect(analyser);
	source.connect(context.destination);       // connect the source to the context's destination (the speakers)
	source.start(0);                           // play the source now
                                               // note: on older systems, may have to use deprecated noteOn(time);
  }

function enableButton()
{
    var button = document.getElementById("playbutton");
    button.disabled = false;
    button.innerText = "Play";
    button.textContent = "Play";
}

function playButton(){
    var button = document.getElementById("playbutton");
    var txt = button.textContent || button.innerText;

    if(!started)
    {
        button.innerText = "Pause";
        button.textContent = "Pause";
        playSound(trackBuffer);
        playing = true;
        started = true;
    }
    else if(playing){
        button.innerText = "Play";
        button.textContent = "Play";
        context.suspend();
        playing = false;
    }
    else if(!playing){
        button.innerText = "Pause";
        button.textContent = "Pause";
        context.resume();
        playing = true;
    }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth/window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

var gui = new dat.GUI();
currentsong = gui.add( params, 'song', {Dub: '/dubtrack.mp3', Jazz: '/jazztrack.mp3', Piano: '/pianotrack.mp3', Rock: '/rocktrack.mp3', Solo: '/solotrack.mp3'});
gui.add( params, 'move');
gui.add( params, 'speed').min(0.1).max(0.5).step(.0001);
gui.add( params, 'wireframe');
gui.add( params, 'cameray').min(5).max(30).step(.001);
gui.add( params, 'cameraz').min(30).max(50).step(.001);
gui.add( params, 'cameraxrotation').min(-90).max(45).step(1);
gui.addColor( params, 'color1');
gui.addColor( params, 'color2');

currentsong.onChange(function(){
    context.close();
    init();
    started = false;
})

init();


var geometry = new THREE.BoxBufferGeometry(1,1,1);
var material = new THREE.MeshBasicMaterial({color:0x0000ff});
var cubes = [];
var lines = [];
var allcubes = [];

/*
for(var i = 0; i < 11; i++)
{
    cubes.push(new THREE.Mesh(geometry,material));
    scene.add(cubes[i]);
    cubes[i].position.x = (i)-5;
}*/
//allcubes.push(cubes);
//console.log(allcubes);



//Random colors, not used anymore
//var colors = [];
/*
for(var i = 0; i<11; i++)
{
    colors.push("#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);}));
}*/

const lerpColor = function(a, b, amount) {
    const ar = a >> 16,
          ag = a >> 8 & 0xff,
          ab = a & 0xff,

          br = b >> 16,
          bg = b >> 8 & 0xff,
          bb = b & 0xff,

          rr = ar + amount * (br - ar),
          rg = ag + amount * (bg - ag),
          rb = ab + amount * (bb - ab);

    return (rr << 16) + (rg << 8) + (rb | 0);
};

function animate(){
    requestAnimationFrame(animate);
    if(playing)
    {
        cameraoffset += params.speed;
    }
    camera.position.y = params.cameray;
    camera.position.z = params.cameraz-cameraoffset;
    camera.rotation.x = params.cameraxrotation * Math.PI / 180 ;
    
    

    if(playing)
    {        
        analyser.getByteFrequencyData(waveformdata);
        //console.log(waveformdata);
        var avgs = [];
        /*
        var increment = Math.floor(waveformdata.length/(params.bars));
        for(var i = 0; i<params.bars+1; i++)
        {
            avgs.push(0);
            for(var j = increment*(i); j < increment*(i+1); j++)
            {
                avgs[i] = (avgs[i]+waveformdata[j])/2;
            }
        }*/

        var j = 0;
        for(var i = 0; i < params.bars; i++)
        {
            avgs.push(waveformdata[j]);
            j+= Math.floor(1024/params.bars);
        }


        //console.log(avgs);

        for(var i = 0; i<params.bars+1; i++)
        {
            var col = lerpColor(params.color1,params.color2,(i/params.bars));
            var material = new THREE.MeshBasicMaterial({color:col,wireframe:params.wireframe,stencilWrite:true});
            var height = Math.max(waveformdata[i]/50, 0.000001);
            var geometry = new THREE.BoxBufferGeometry(1,height,1);
            var edges = new THREE.EdgesGeometry(geometry);
            scene.remove(cubes[i]);
            scene.remove(lines[i]);

            if(framecount == framemax-1)
            {
                if(params.move)
                {
                    cubes = [];
                    lines = [];
                }
            }
            
            cubes[i] = new THREE.Mesh(geometry,material);
            lines[i] = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x000000 } ));
            scene.add(cubes[i]);
            scene.add(lines[i]);
            lines[i].position.x = (i)-(params.bars)/2;
            lines[i].position.y = height/2;
            lines[i].position.z = -cameraoffset;
            cubes[i].position.x = (i)-(params.bars/2);
            cubes[i].position.y = height/2;
            cubes[i].position.z = -cameraoffset;
            //allcubes.push(cubes);
        }
        //console.log(cubes.length);
    }
    framecount++;
    if(framecount > framemax-1)
    {
        framecount = 0;
    }
    
    renderer.render(scene,camera);
    //console.log(allcubes);
}
animate();