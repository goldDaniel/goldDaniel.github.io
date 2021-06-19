var particleUpdateVertex = 
`
#version 300 es
precision mediump float;

uniform float u_dt;
uniform float u_elapsed;

uniform vec2 u_force;
uniform vec2 u_origin;

uniform float u_min_angle;
uniform float u_max_angle;

uniform float u_min_speed;
uniform float u_max_speed;


in vec2 i_position;
in vec2 i_velocity;
in float i_life_current;
in float i_life_max;

out vec2 v_position;
out vec2 v_velocity;
out float v_life_current;
out float v_life_max;

//https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}

uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }


float floatConstruct( uint m ) 
{
    const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32

    m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
    m |= ieeeOne;                          // Add fractional part to 1.0

    float  f = uintBitsToFloat( m );       // Range [1:2]
    return f - 1.0;                        // Range [0:1]
}

// half-open range [0:1]
float random( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }

void main() 
{
    float randX = random(u_elapsed + float(gl_VertexID));
    float randY = random(float(gl_VertexID) + u_elapsed * 1.61803398875 * 1.61803398875);
    float randZ = random(float(gl_VertexID) + u_elapsed * 1.61803398875 * 3.1415926);
    float randW = random(float(gl_VertexID) + u_elapsed * 1.61803398875);

    //spawn particle
    if (i_life_current >= i_life_max) 
    {   
        float angle = u_min_angle + randX * (u_max_angle - u_min_angle);
        float x = cos(angle);
        float y = sin(angle);
        
        v_position.x = randY * 2.0 - 1.0;
        v_position.y = randW * 2.0 - 1.0;
    
        v_life_current = 0.0;
        v_life_max = i_life_max;
    
        v_velocity = vec2(x, y) * (u_min_speed + randW * (u_max_speed - u_min_speed));
    } 
    else 
    {
        v_life_current = i_life_current + u_dt;
        v_life_max = i_life_max;
        v_position = i_position + i_velocity * u_dt;
        v_velocity = i_velocity + u_force * u_dt;
    }
}
`;

var particleUpdateFragment = 
`
#version 300 es
void main() {}
`;

var particleRenderVertex = 
`#version 300 es
precision mediump float;

in vec2 i_position;
in vec2 i_velocity;
in float i_life_current;
in float i_life_max;

out vec2 v_position;
out vec2 v_velocity;
out float v_life_current;
out float v_life_max;

void main() 
{    
    v_position = i_position;
    v_velocity = i_velocity;
    v_life_current = i_life_current;
    v_life_max = i_life_max;

    gl_PointSize = 2.0;
    gl_Position = vec4(i_position, 0.0, 1.0);
}
`;

var particleRenderFragment = 
`#version 300 es
precision mediump float;

in vec2 v_position;
in vec2 v_velocity;
in float v_life_current;
in float v_life_max;

out vec4 o_frag_color;

//http://iquilezles.org/www/articles/palettes/palettes.htm
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{  return a + b*cos( 6.28318*(c*t+d) ); }

void main() 
{
    float t = v_life_current / v_life_max;

    float alpha_final = t <= 0.5 ? (t / 0.5) : (1.0 - (t - 0.5) / 0.5);

    o_frag_color = vec4(palette(t, 
                                vec3(0.8,0.5,0.4),
                                vec3(0.2,0.4,0.2),
                                vec3(2.0,1.0,1.0),
                                vec3(0.0,0.25,0.25)), 
                        alpha_final);
}
`;

function iOS() 
{
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

function main() 
{    
    //IOS does not support webgl3 
    if(iOS()) return;

    var canvas_element = document.getElementById("background-canvas");
    canvas_element.width = window.innerWidth;
    canvas_element.height = window.innerHeight;

    var webgl_context = canvas_element.getContext("webgl2");
    if (webgl_context != null) 
    {
        var state = init(
            webgl_context,
            1000, //particle count
            0.5, //birth rate
            5.4, 10.6, //lifespan
            -Math.PI, Math.PI, ///angle
            0.1, 0.4, //speed
            [0.0, 0.4]); //force
    
        //particles follow mouse
        canvas_element.onmousemove = function(e) 
        {
            var x = 2.0 * (e.pageX - this.offsetLeft)/this.width - 1.0; 
            var y = -(2.0 * (e.pageY - this.offsetTop)/this.height - 1.0);
            state.origin = [x,y];
        };
        window.requestAnimationFrame(
            function(ts) 
            { 
                render(webgl_context, state, ts); 
            }
        );
    } 
    else 
    {
      document.write("WebGL2 is not supported by your browser");
    }
}

function render(gl, state, timestamp_millis) 
{
    var num_part = state.born_particles;

    var time_delta = 0.0;
    if (state.old_timestamp != 0) 
    {
        time_delta = timestamp_millis - state.old_timestamp;
        if (time_delta > 500.0) 
        {
            time_delta = 0.0;
        }
    }

    if (state.born_particles < state.num_particles) 
    {
        state.born_particles = Math.min(state.num_particles,
                                        Math.floor(state.born_particles + state.birth_rate * time_delta));
    }
    state.old_timestamp = timestamp_millis;

    state.origin[0] = Math.cos(state.total_time / 800) * 0.6;
    state.origin[1] = Math.sin(state.total_time / 800) * 0.8;

    state.gravity[0] = Math.sin(state.total_time / 400) * 0.4;
    state.gravity[1] = Math.cos(state.total_time / 400) * 0.4;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(state.particle_update_program);

    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_dt"),
        time_delta / 1000.0);
    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_elapsed"),
        state.total_time);
    gl.uniform2f(
        gl.getUniformLocation(state.particle_update_program, "u_force"),
        state.gravity[0], state.gravity[1]);
    gl.uniform2f(
        gl.getUniformLocation(state.particle_update_program, "u_origin"),
        state.origin[0],
        state.origin[1]);
    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_min_angle"),
        state.min_angle);
    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_max_angle"),
        state.max_angle);
    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_min_speed"),
        state.min_speed);
    gl.uniform1f(
        gl.getUniformLocation(state.particle_update_program, "u_max_speed"),
        state.max_speed);
    state.total_time += time_delta;
   

    //bind read buffer
    gl.bindVertexArray(state.particle_sys_vaos[state.read]);

    //bind write buffer
    gl.bindBufferBase(
        gl.TRANSFORM_FEEDBACK_BUFFER, 0, state.particle_sys_buffers[state.write]);
    gl.enable(gl.RASTERIZER_DISCARD);

    //transform feedback
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, num_part);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    
    gl.bindVertexArray(state.particle_sys_vaos[state.read + 2]);
    gl.useProgram(state.particle_render_program);
    gl.drawArrays(gl.POINTS, 0, num_part);

    //swap buffers
    var tmp = state.read;
    state.read = state.write;
    state.write = tmp;

    window.requestAnimationFrame(
        function(ts) 
        { 
            render(gl, state, ts); 
        }
    );
}

function init(
    gl,
    num_particles,
    particle_birth_rate,
    min_age,
    max_age, 
    min_angle,
    max_angle,
    min_speed,
    max_speed,
    gravity) 
{

    //Do some parameter validation
    if (max_age < min_age) {
        throw "Invalid min-max age range.";
    }
    if (max_angle < min_angle ||
        min_angle < -Math.PI ||
        max_angle > Math.PI) {
        throw "Invalid angle range.";
    }
    if (min_speed > max_speed) {
        throw "Invalid min-max speed range.";
    }

    /* Create programs for updating and rendering the particle system. */
    var update_program = createGLProgram(
        gl,
        [
            {source: particleUpdateVertex, type: gl.VERTEX_SHADER},
            {source: particleUpdateFragment, type: gl.FRAGMENT_SHADER},
        ],
        [
            "v_position",
            "v_velocity",
            "v_life_current",
            "v_life_max",
        ]
    );
    var render_program = createGLProgram(
        gl,
        [
            {source: particleRenderVertex, type: gl.VERTEX_SHADER},
            {source: particleRenderFragment, type: gl.FRAGMENT_SHADER},
        ],
        null
    );

    /* Capture attribute locations from program objects. */
    var update_attrib_locations = 
    {
        i_position: 
        {
            location: gl.getAttribLocation(update_program, "i_position"),
            num_components: 2,
            type: gl.FLOAT
        },
        i_velocity: 
        {
            location: gl.getAttribLocation(update_program, "i_velocity"),
            num_components: 2,
            type: gl.FLOAT
        },
        i_life_current: 
        {
            location: gl.getAttribLocation(update_program, "i_life_current"),
            num_components: 1,
            type: gl.FLOAT
        },
        i_life_max: 
        {
            location: gl.getAttribLocation(update_program, "i_life_max"),
            num_components: 1,
            type: gl.FLOAT
        }
    };
    var render_attrib_locations = 
    {
        i_position: 
        {
            location: gl.getAttribLocation(render_program, "i_position"),
            num_components: 2,
            type: gl.FLOAT
        },
        i_velocity: 
        {
            location: gl.getAttribLocation(render_program, "i_velocity"),
            num_components: 2,
            type: gl.FLOAT
        },
        i_life_current: 
        {
            location: gl.getAttribLocation(render_program, "i_life_current"),
            num_components: 1,
            type: gl.FLOAT
        },
        i_life_max: 
        {
            location: gl.getAttribLocation(render_program, "i_life_max"),
            num_components: 1,
            type: gl.FLOAT
        }
    };

    var buffers = 
    [
        gl.createBuffer(),
        gl.createBuffer(),
    ];
    var vaos = 
    [
        gl.createVertexArray(), /* for updating buffer 1 */
        gl.createVertexArray(), /* for updating buffer 2 */
        gl.createVertexArray(), /* for rendering buffer 1 */
        gl.createVertexArray()  /* for rendering buffer 2 */
    ];

    /* this has information about buffers and bindings for each VAO. */
    var vao_desc = 
    [
        {
            vao: vaos[0],
            buffers: 
            [{
                buffer_object: buffers[0],
                stride: 4 * 6,
                attribs: update_attrib_locations
            }]
        },
        {
            vao: vaos[1],
            buffers: 
            [{
                buffer_object: buffers[1],
                stride: 4 * 6,
                attribs: update_attrib_locations
            }]
        },
        {
            vao: vaos[2],
            buffers: 
            [{
                buffer_object: buffers[0],
                stride: 4 * 6,
                attribs: render_attrib_locations
            }],
            },
        {
            vao: vaos[3],
            buffers: 
            [{
                buffer_object: buffers[1],
                stride: 4 * 6,
                attribs: render_attrib_locations
            }],
        },
    ];

    var initial_data = new Float32Array(initParticleData(num_particles, min_age, max_age));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
    gl.bufferData(gl.ARRAY_BUFFER, initial_data, gl.STREAM_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
    gl.bufferData(gl.ARRAY_BUFFER, initial_data, gl.STREAM_DRAW);

    
    for (var i = 0; i < vao_desc.length; i++) 
    {
        setupParticleBufferVAO(gl, vao_desc[i].buffers, vao_desc[i].vao);
    }

    gl.clearColor(0.12, 0.12, 0.12, 1.0);    

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.enable(gl.SAMPLE_COVERAGE);


    return {
        particle_sys_buffers: buffers,
        particle_sys_vaos: vaos,
        read: 0,
        write: 1,
        particle_update_program: update_program,
        particle_render_program: render_program,
        num_particles: initial_data.length / 6,
        old_timestamp: 0.0,
        total_time: 0.0,
        born_particles: 0,
        birth_rate: particle_birth_rate,
        gravity: gravity,
        origin: [0.0, 0.0],
        min_angle: min_angle,
        max_angle: max_angle,
        min_speed: min_speed,
        max_speed: max_speed
    };
}

function createShader(gl, shader_source) 
{
    var shader = gl.createShader(shader_source.type);
    //skip whitespace
    var i = 0;
    while (/\s/.test(shader_source.source[i])) i++; 
    {
        shader_source.source = shader_source.source.slice(i);
    }
    
    gl.shaderSource(shader, shader_source.source);
    gl.compileShader(shader);
    var compile_status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!compile_status) 
    {
        var error_message = gl.getShaderInfoLog(shader);
        throw "Could not compile shader \"" +
                error_message +
                "\" \n" +
                shader_source.source;
    }
    return shader;
  }

function createGLProgram(gl, shader_sources, transform_feedback_varyings) 
{
    var program = gl.createProgram();
    for (var i = 0; i < shader_sources.length; i++) 
    {
        var shader_source = shader_sources[i];
        var shader = createShader(gl, shader_source);
        gl.attachShader(program, shader);
    }
  
    if (transform_feedback_varyings != null) 
    {
        gl.transformFeedbackVaryings(
                                    program,
                                    transform_feedback_varyings,
                                    gl.INTERLEAVED_ATTRIBS)
    }
  
    gl.linkProgram(program);
    var link_status = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!link_status) 
    {
        var error_message = gl.getProgramInfoLog(program);
        throw "Could not link program.\n" + error_message;
    }

    return program;
}
  
//interleaved data
function initParticleData(num_parts, min_age, max_age) 
{
    var data = [];
    for (var i = 0; i < num_parts; i++) 
    {
        // position
        data.push(0.0);
        data.push(0.0);

        // velocity
        data.push(0.0);
        data.push(0.0);

        var life = min_age + Math.random() * (max_age - min_age);
        // ensure the particle gets initialized in update shader
        data.push(life + 1);
        data.push(life);
    }
    return data;
}

function setupParticleBufferVAO(gl, buffers, vao) 
{
    gl.bindVertexArray(vao);
    for (var i = 0; i < buffers.length; i++) 
    {
        var buffer = buffers[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer_object);
        var offset = 0;
        for (var attrib_name in buffer.attribs) 
        {
            if (buffer.attribs.hasOwnProperty(attrib_name)) 
            {
                var attrib_desc = buffer.attribs[attrib_name];
                gl.enableVertexAttribArray(attrib_desc.location);
                gl.vertexAttribPointer(
                                    attrib_desc.location,
                                    attrib_desc.num_components,
                                    attrib_desc.type,
                                    false, 
                                    buffer.stride,
                                    offset);
                //we're only dealing with types of 4 byte size
                var type_size = 4;
                offset += attrib_desc.num_components * type_size;

                if (attrib_desc.hasOwnProperty("divisor")) 
                { 
                    gl.vertexAttribDivisor(attrib_desc.location, attrib_desc.divisor);
                }
            }
        }
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}
