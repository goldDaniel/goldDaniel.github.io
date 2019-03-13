var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById("threejs").appendChild( renderer.domElement );

var cubes = [];

for(var x = 0; x < 14; x++)
{
    for(var y = 0; y < 10; y++)
    {
        var geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);

        var color = 0xffffff / 2 * x/10 + 0xffffff / 2 * y/10;

        var material = new THREE.MeshStandardMaterial( { color: color } );
        var cube = new THREE.Mesh( geometry, material );

        cube.position.x = -8 + (x/25.0) * 30;
        cube.position.y = -4 + (y/30.0) * 25;

        cubes.push(cube);

        scene.add( cube );
    }
}

var ambient = new THREE.AmbientLight( 0x6e6e6e ); 
scene.add( ambient );

var point = new THREE.PointLight( 0xeeeeee );
point.position.x = 0;
point.position.y = 1;
point.position.z = 12;
scene.add( point );

camera.position.z = 5;

camera.lookAt.x = 0;
camera.lookAt.y = 0;
camera.lookAt.z = 0;

var animate = function () {
    requestAnimationFrame( animate );

    for(var i = 0; i < cubes.length; i++)
    {
        cubes[i].rotation.x += 0.015;
        cubes[i].rotation.y += 0.015;
    }

    renderer.render( scene, camera );
};

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

animate();
