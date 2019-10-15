const vshader =
`
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 viewM;
uniform mat4 persM;
uniform mat4 rotM;

varying highp vec2 vTextureCoord;

void main()
{
    gl_Position = persM * viewM * rotM * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
}
`;

const fshader =
`
varying highp vec2 vTextureCoord;

uniform sampler2D uSampler;

void main()
{
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}
`;

const createCube = (s = 1) => {
    return {
        vertices: [
            -s, -s, s, // front bottom left
            s, -s, s,  // front bottom right
            s,  s, s,  // front top right
            -s,  s, s, // front top left

            -s, -s, -s, // back bottom left
            s, -s, -s,  // back bottom right
            s,  s, -s,  // back top right
            -s,  s, -s, // back top left
        ],
        indices: [
            0, 1, 2, // front
            0, 2, 3,
            4, 6, 5, // back
            4, 7, 6,
            3, 2, 6, // top
            3, 6, 7,
            0, 1, 5, // bottom
            0, 5, 4,
            4, 0, 3, // left
            4, 3, 7,
            1, 5, 6, // right
            1, 6, 2
        ],
        textureCoords: [
            // Front
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Back
            1.0,  1.0,
            0.0,  1.0,
            0.0,  0.0,
            1.0,  0.0,
        ]
    };
};

window.onload = () => {
    const canvas = document.getElementById('KEN');
    const gl = canvas.getContext("webgl");

    canvas.setAttribute("width", window.innerWidth);
    canvas.setAttribute("height", window.innerHeight);

    if (gl == null) {
        alert("Unable to initalize WebGl.");
        return;
    }
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vshader);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fshader);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling vertex shader');
        gl.deleteShader(vertexShader);
        return null;
    }

    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling fragment shader');
        gl.deleteShader(fragShader);
        return null;
    }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Failed to link');
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragShader);
        return null;
    }
    gl.useProgram(shaderProgram);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragShader);


    const perspm = glMatrix.mat4.perspective(glMatrix.mat4.create(), 45 * Math.PI / 180, window.innerWidth / window.innerHeight, 0.1, 100);
    const viewm  = glMatrix.mat4.lookAt(glMatrix.mat4.create(), [0,0,5], [0,0,0], [0,1,0]);

    const rotateM = glMatrix.mat4.create();

    const cube = createCube(0.5);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.vertices), gl.STATIC_DRAW);

    const vertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube.indices), gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([0,0,255,255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }
    image.src = './texture.png';

    const textureCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.textureCoords), gl.STATIC_DRAW);

    const textureLoc = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
    const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer);
    gl.vertexAttribPointer(textureLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(textureLoc);

    const viewPos = gl.getUniformLocation(shaderProgram, 'viewM');
    const perspPos = gl.getUniformLocation(shaderProgram, 'persM');
    const rotPos = gl.getUniformLocation(shaderProgram, 'rotM');
    gl.uniformMatrix4fv(viewPos, false, viewm);
    gl.uniformMatrix4fv(perspPos, false, perspm);
    gl.uniformMatrix4fv(rotPos, false, rotateM);

    var then = 0;
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;

        glMatrix.mat4.identity(rotateM);
        // glMatrix.mat4.rotateX(rotateM, rotateM, now);
        glMatrix.mat4.rotateY(rotateM, rotateM, now);
        gl.uniformMatrix4fv(rotPos, false, rotateM);

        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uSampler, 0);

        gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
