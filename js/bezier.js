var slider = document.getElementById("numLineSegments");
var output = document.getElementById("segmentsOutput");
output.innerHTML = slider.value;

var numLineSegments = 10;
slider.oninput = function() {
  output.innerHTML = this.value;
  numLineSegments = this.value;
}

function getBezierPointAtTime(controlPoints, t) {
    var result;

    //if we are at the last interpolation, return our point on the curve
    if(controlPoints.length == 2) {
        result = new THREE.Vector3().lerpVectors(controlPoints[0], controlPoints[1], t);
    }
    else {
        var nextControlPoints = [];
        for(var i = 0; i < controlPoints.length - 1; i++) {
            var point = new THREE.Vector3().lerpVectors(controlPoints[i], controlPoints[i + 1], t);
            nextControlPoints.push(point);
        }
        result = getBezierPointAtTime(nextControlPoints, t);
    }

    return result;
}

var mouse = new THREE.Vector2();


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight);
document.getElementById("bezier").appendChild( renderer.domElement );


camera.position.z = 20;
camera.lookAt.x = 0;
camera.lookAt.y = 0;
camera.lookAt.z = 0;

var curveMaterial = new THREE.LineBasicMaterial( { color: 0xffffff } );
var controlMaterial = new THREE.LineBasicMaterial( { color: 0xff0000, } );
var dotMaterial = new THREE.PointsMaterial( { size: 8, sizeAttenuation: false } );

var controlPoints = [];
controlPoints.push(new THREE.Vector3());
controlPoints.push(new THREE.Vector3());
controlPoints.push(new THREE.Vector3());
controlPoints.push(new THREE.Vector3());
controlPoints.push(new THREE.Vector3());


var angle = 0;
//GAMELOOP
var animate = function () {
    requestAnimationFrame( animate );

    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }

    angle += 0.005;

    controlPoints[0].x =  Math.sin(angle) * 15;
    controlPoints[0].y =  Math.cos(angle*2) * 5;

    controlPoints[1].x = -20 + Math.sin(angle) * 5;
    controlPoints[1].y =    Math.cos(angle*3) * 6;

    controlPoints[2].x =  Math.sin(angle*2) * 5;
    controlPoints[2].y =  Math.cos(angle*4) * 5;
    
    controlPoints[3].x = 10;
    controlPoints[3].y = Math.cos(angle*1.14) * 10;
    
    controlPoints[4].x = 15 + Math.cos(angle*3) * 10;
    controlPoints[4].y = Math.sin(angle*2) * 10;

    for(var i = 0; i < controlPoints.length; i++) {

        var geometry = new THREE.Geometry();
        geometry.vertices.push(controlPoints[i])
        var dot = new THREE.Points(geometry, dotMaterial);
        scene.add(dot);


    }

    for(var i = 0; i < controlPoints.length - 1; i++) {

        var geometry = new THREE.Geometry();
        geometry.vertices.push(controlPoints[i]);
        geometry.vertices.push(controlPoints[i + 1]);

        var line = new THREE.Line(geometry, controlMaterial);
        scene.add(line);
    }


    var bezierCurve = new THREE.Geometry();
    var resolution = numLineSegments;

    bezierCurve.vertices.push(controlPoints[0]);
    for(var i = 0; i < resolution; i++) {
        var vertex = getBezierPointAtTime(controlPoints, (i+1)/resolution);
        
        bezierCurve.vertices.push(vertex);
    }

    var line = new THREE.Line(bezierCurve, curveMaterial);
    scene.add(line);


    renderer.render( scene, camera );
};


window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}
function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}
animate();