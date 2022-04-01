/**
 * prepare color name data
 */
// color name lookup table
c3.load("lib/c3_data.json");
let color_name_map = {};
for (var c = 0; c < c3.color.length; ++c) {
    var x = c3.color[c];
    color_name_map[[x.L, x.a, x.b].join(",")] = c;
}

var name_index_map = {};
for (var i = 0; i < c3.terms.length; ++i) {
    name_index_map[c3.terms[i]] = i;
}

function getColorNameIndex(c) {
    var x = d3.lab(c),
        L = 5 * Math.round(x.L / 5),
        a = 5 * Math.round(x.a / 5),
        b = 5 * Math.round(x.b / 5),
        s = [L, a, b].join(",");
    return color_name_map[s];
}

function getNameDifference(x1, x2) {
    let c1 = getColorNameIndex(x1),
        c2 = getColorNameIndex(x2);
    return 1 - c3.color.cosine(c1, c2);
}

function getColorName(color) {
    let c = getColorNameIndex(d3.rgb(color)),
        t = c3.color.relatedTerms(c, 1);
    if (t[0] != undefined) {
        return c3.terms[t[0].index]
    }
    return undefined
}

// the score for a color value is named by a given term
function getColorNameScore(color) {
    let c = getColorNameIndex(d3.rgb(color)),
        t = c3.color.relatedTerms(c, 1);
    if (t[0] != undefined) {
        return [c3.terms[t[0].index], (t[0].score).toFixed(2)]
        return
    }
    return [undefined, undefined]
}

//color saliency is the degree to which a color value is uniquely named
function getColorSaliency(x) {
    // color saliency range
    let minE = -4.5,
        maxE = 0;
    let c = getColorNameIndex(x);
    return (c3.color.entropy(c) - minE) / (maxE - minE);
}

let colors_for_each_name = {}
let color_name_positions = [],
    color_name_colors = [],
    color_name_probs = []
let component_step = 15;
for (let r = 0; r < 256; r += component_step) {
    for (let g = 0; g < 256; g += component_step) {
        for (let b = 0; b < 256; b += component_step) {
            let color = d3.rgb(r, g, b),
                score = getColorSaliency(color)
            if (score > 0.5) {
                color_name_positions = color_name_positions.concat([r * 10 / 255, g * 10 / 255, b * 10 / 255])
                color_name_colors = color_name_colors.concat([r / 255, g / 255, b / 255])
                color_name_probs = color_name_probs.concat([score, score, score])
            }
        }
    }
}
console.log(colors_for_each_name, Object.keys(colors_for_each_name).length);

let discretized_lab_colors = [],
    discretized_lab_colors_rgb = []
for (var c = 0; c < c3.color.length; ++c) {
    var x = c3.color[c],
        rgb = d3.rgb(x),
        [name, score] = getColorNameScore(rgb)
    if (name != undefined && score > 0.5) {
        discretized_lab_colors = discretized_lab_colors.concat([x.L, x.a, x.b]);
        discretized_lab_colors_rgb = discretized_lab_colors_rgb.concat([rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0]);
    }
}

/*========== Defining and storing the geometry ==========*/
// Create an array of positions for the coordinates.
const axis_positions = [
    // x
    0.0, 0.0, 0.0,
    15.0, 0.0, 0.0,

    // y
    0.0, 0.0, 0.0,
    0.0, 15.0, 0.0,

    // z
    0.0, 0.0, 0.0,
    0.0, 0.0, 15.0
];

// Now set up the colors for the axis.
const axis_Colors = [
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0
];

var THETA = 0,
    PHI = 0;
var time_old = 0;

function findPos(obj) {
    var curleft = 0,
        curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}


function drawCanvas(canvasId, vertexPos, vertexColor) {
    /*============= Creating a canvas ======================*/
    var canvas = document.getElementById(canvasId);
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    // If we don't have a GL context, give up now
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    }

    // Create a buffer for the cube's vertex positions.
    const axis_positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, axis_positionBuffer);
    // Now pass the list of positions into WebGL to build the shape. We do this by creating a Float32Array from the JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis_positions), gl.STATIC_DRAW);

    const axis_colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, axis_colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis_Colors), gl.STATIC_DRAW);

    const point_positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, point_positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPos), gl.STATIC_DRAW);

    const point_colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, point_colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColor), gl.STATIC_DRAW);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var shaderprogram = gl.createProgram();
    gl.attachShader(shaderprogram, vertShader);
    gl.attachShader(shaderprogram, fragShader);
    gl.linkProgram(shaderprogram);

    /*======== Associating attributes to vertex shader =====*/
    var _Pmatrix = gl.getUniformLocation(shaderprogram, "Pmatrix");
    var _Vmatrix = gl.getUniformLocation(shaderprogram, "Vmatrix");
    var _Mmatrix = gl.getUniformLocation(shaderprogram, "Mmatrix");
    var _flag = gl.getUniformLocation(shaderprogram, "flag");

    var _position = gl.getAttribLocation(shaderprogram, "position");
    var _color = gl.getAttribLocation(shaderprogram, "color");

    var mouseDown = function(e) {
        drag = true;
        old_x = e.pageX, old_y = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function(e) {
        drag = false;
    };

    var mouseMove = function(e) {
        if (!drag) return false;
        dX = (e.pageX - old_x) * 2 * Math.PI / canvas.width,
            dY = (e.pageY - old_y) * 2 * Math.PI / canvas.height;
        THETA += dX;
        PHI += dY;
        old_x = e.pageX, old_y = e.pageY;

        e.preventDefault();
    };

    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseUp, false);
    canvas.addEventListener("mousemove", mouseMove, false);

    canvas.onclick = function(e) {
        animate(0)
            // get color
        var pos = findPos(this);
        var x = e.pageX - pos.x;
        var y = gl.drawingBufferHeight - (e.pageY - pos.y);
        var coord = "x=" + x + ", y=" + y;
        var pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let index = y * gl.drawingBufferWidth * 4 + x * 4
        let [name, score] = getColorNameScore(d3.rgb(pixels[index + 0], pixels[index + 1], pixels[index + 2]))
        d3.select('#status').html("position is: ( " + coord + " )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Color is: ( " + [pixels[index + 0], pixels[index + 1], pixels[index + 2]].join(",") + " )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Name is: ( " + name + " )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Score is: ( " + score + " )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Saliency score is: ( " + getColorSaliency(d3.rgb(pixels[index + 0], pixels[index + 1], pixels[index + 2])).toFixed(2) + " )");
        d3.select('#click_point_color_div').style("background-color", d3.rgb(pixels[index + 0], pixels[index + 1], pixels[index + 2]))
        let c = getColorNameIndex(d3.rgb(pixels[index + 0], pixels[index + 1], pixels[index + 2])),
            t = c3.color.relatedTerms(c, 5);
        let s = "<h3>Name&Score for the clicked color:</h3>"
        for (let d of t) {
            if (t[0] != undefined) {
                s += c3.terms[d.index] + " : " + (d.score).toFixed(2) + "<br>"
            }
        }
        d3.select('#status2').html(s)
    }

    var proj_matrix = get_projection(60, canvas.width / canvas.height, 1, 200);
    var mo_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    var view_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    view_matrix[14] = view_matrix[14] - 20;

    var animate = function(time) {
        var dt = time - time_old;

        if (!drag) {
            dX *= AMORTIZATION, dY *= AMORTIZATION;
            THETA += dX, PHI += dY;
        }

        //set model matrix to I4

        mo_matrix[0] = 1, mo_matrix[1] = 0, mo_matrix[2] = 0,
            mo_matrix[3] = 0,

            mo_matrix[4] = 0, mo_matrix[5] = 1, mo_matrix[6] = 0,
            mo_matrix[7] = 0,

            mo_matrix[8] = 0, mo_matrix[9] = 0, mo_matrix[10] = 1,
            mo_matrix[11] = 0,

            mo_matrix[12] = 0, mo_matrix[13] = 0, mo_matrix[14] = 0,
            mo_matrix[15] = 1;

        rotateY(mo_matrix, THETA);
        rotateX(mo_matrix, PHI);

        time_old = time;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.clearColor(1, 1, 1, 1);
        gl.clearDepth(1.0);
        gl.viewport(0.0, 0.0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shaderprogram);
        gl.uniformMatrix4fv(_Pmatrix, false, proj_matrix);
        gl.uniformMatrix4fv(_Vmatrix, false, view_matrix);
        gl.uniformMatrix4fv(_Mmatrix, false, mo_matrix);

        gl.uniform1f(_flag, false); {
            gl.bindBuffer(gl.ARRAY_BUFFER, axis_positionBuffer);
            gl.vertexAttribPointer(_position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(_position);

            gl.bindBuffer(gl.ARRAY_BUFFER, axis_colorBuffer);
            gl.vertexAttribPointer(_color, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(_color);

            gl.drawArrays(gl.LINES, 0, axis_positions.length / 3);
        }

        gl.uniform1f(_flag, true); {
            gl.bindBuffer(gl.ARRAY_BUFFER, point_positionBuffer);
            gl.vertexAttribPointer(_position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(_position);

            gl.bindBuffer(gl.ARRAY_BUFFER, point_colorBuffer);
            gl.vertexAttribPointer(_color, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(_color);

            gl.drawArrays(gl.POINTS, 0, vertexPos.length / 3);
        }
        window.requestAnimationFrame(animate);
    }
    animate(0);
}

/*=================== SHADERS =================== */
var vertCode = `
    attribute vec3 position;
    uniform mat4 Pmatrix;
    uniform mat4 Vmatrix;
    uniform mat4 Mmatrix;
    attribute vec3 color;//the color of the point
    varying vec3 vColor;
    void main(void) { //pre-built function
        gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);
        vColor = color;
        gl_PointSize = 10.0;
    }`;

var fragCode = `
    precision mediump float;
    varying vec3 vColor;
    uniform bool flag;
    void main(void) {
        if(flag){
            float distanceFromCenter = distance( gl_PointCoord, vec2(0.5,0.5) );
            if ( distanceFromCenter >= 0.5 ) {
                discard;
            }
        }
        gl_FragColor = vec4(vColor, 1.);
    }
    `;


/*==================== MATRIX ====================== */

function get_projection(angle, a, zMin, zMax) {
    var ang = Math.tan((angle * .5) * Math.PI / 180); //angle*.5
    return [
        0.5 / ang, 0, 0, 0,
        0, 0.5 * a / ang, 0, 0,
        0, 0, -(zMax + zMin) / (zMax - zMin), -1,
        0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
    ];
}


/*================= Mouse events ======================*/

var AMORTIZATION = 0.95;
var drag = false;
var old_x, old_y;
var dX = 0,
    dY = 0;

/*=========================rotation================*/

function rotateX(m, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var mv1 = m[1],
        mv5 = m[5],
        mv9 = m[9];

    m[1] = m[1] * c - m[2] * s;
    m[5] = m[5] * c - m[6] * s;
    m[9] = m[9] * c - m[10] * s;

    m[2] = m[2] * c + mv1 * s;
    m[6] = m[6] * c + mv5 * s;
    m[10] = m[10] * c + mv9 * s;
}

function rotateY(m, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var mv0 = m[0],
        mv4 = m[4],
        mv8 = m[8];

    m[0] = c * m[0] + s * m[2];
    m[4] = c * m[4] + s * m[6];
    m[8] = c * m[8] + s * m[10];

    m[2] = c * m[2] - s * mv0;
    m[6] = c * m[6] - s * mv4;
    m[10] = c * m[10] - s * mv8;
}

/*=================== Drawing =================== */

function changeScoreSlider(value) {
    document.getElementById("scoreInputBox").value = value
    document.getElementById("scoreSlider").value = value

    // re-generate colors
    color_name_positions = [], color_name_colors = [], color_name_probs = []
    for (let r = 0; r < 256; r += component_step) {
        for (let g = 0; g < 256; g += component_step) {
            for (let b = 0; b < 256; b += component_step) {
                let color = d3.rgb(r, g, b),
                    score = getColorSaliency(color)
                if (score > value / 100.0) {
                    color_name_positions = color_name_positions.concat([r * 10 / 255, g * 10 / 255, b * 10 / 255])
                    color_name_colors = color_name_colors.concat([r / 255, g / 255, b / 255])
                    color_name_probs = color_name_probs.concat([score, score, score])
                }
            }
        }
    }

    drawCanvas('glcanvas', color_name_positions, color_name_colors)
    drawCanvas('glcanvas2', color_name_positions, color_name_probs)
}


drawCanvas('glcanvas', color_name_positions, color_name_colors)
drawCanvas('glcanvas2', color_name_positions, color_name_probs)
    // drawCanvas('glcanvas3', discretized_lab_colors, discretized_lab_colors_rgb)