var GroupColors = [
    { name: 'Yellow', value: [0.7, 0.7, 0.1, 1.0] },
    { name: 'Purple', value: [0.4, 0.1, 0.4, 1.0] },
    { name: 'Red', value: [0.7, 0.1, 0.1, 1.0] },
    { name: 'Cyan', value: [0.1, 0.7, 0.7, 1.0] },
    { name: 'Magenta', value: [0.7, 0.1, 0.7, 1.0] },
    { name: 'Green', value: [0.1, 0.7, 0.1, 1.0] },
    { name: 'Orange', value: [0.7, 0.4, 0.1, 1.0] },
    { name: 'Blue', value: [0.1, 0.1, 0.7, 1.0] },
];
var Highlight;
(function (Highlight) {
    Highlight[Highlight["Normal"] = 0] = "Normal";
    Highlight[Highlight["Line"] = 1] = "Line";
    Highlight[Highlight["Refelection"] = 2] = "Refelection";
    Highlight[Highlight["Curvature"] = 3] = "Curvature";
    Highlight[Highlight["Wireframe"] = 4] = "Wireframe";
})(Highlight || (Highlight = {}));
var CurvatureType;
(function (CurvatureType) {
    CurvatureType[CurvatureType["Gaussian"] = 0] = "Gaussian";
    CurvatureType[CurvatureType["Mean"] = 1] = "Mean";
    CurvatureType[CurvatureType["Max"] = 2] = "Max";
    CurvatureType[CurvatureType["Min"] = 3] = "Min";
})(CurvatureType || (CurvatureType = {}));
var defaultSettings = {
    tessellation: 2,
    showBoundingBox: false,
    showWatermark: true,
    lightsOn: [1.0, 0.0, 0.0],
    userMaxCrv: 0,
    userMinCrv: 0,
    curvatureType: CurvatureType.Gaussian
};
var settings = defaultSettings;
// Active state of the renderer, we use it instead of an object with methods
var renderState = {
    groups: [],
    // this group represents when a shader setting is applied to all groups
    globalGroup: new Group("All Groups", -1, true),
    selectedGroupIndex: -1,
    projection: new Mat4(),
    aspectRatio: 1.0,
    translation: new Float32Array([0, 0, 0]),
    origin: new Float32Array([0, 0, 0]),
    // rotation is a quaternion
    rotation: new Vec3(),
    rotateMode: true,
    scale: 1.0,
    zoom: 0.8264462809917354,
    modelview: new Mat4(),
    clipping: -55.0,
    context: null,
    highlightShader: null,
    curvatureShader: null,
    reflectionShader: null,
    shader: null,
    boundingBoxMin: new Vec3(),
    boundingBoxMax: new Vec3(),
    transparency: 1.0
};
;
var savedPositions = [];
function loadTextResource(url, cb) {
    var x = new XMLHttpRequest();
    x.addEventListener('load', function (e) {
        cb(false, x.responseText);
    });
    x.addEventListener('error', function (e) {
        console.log('Error loading resource ' + url);
        cb(true, '');
    });
    x.open('GET', url, true);
    x.responseType = 'text';
    x.send();
}
function makeShader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (gl.getShaderParameter(s, gl.COMPILE_STATUS) === false) {
        throw "Shader error: " + (gl.getShaderInfoLog(s));
    }
    else {
        return s;
    }
}
function makeProgram(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (gl.getProgramParameter(p, gl.LINK_STATUS) === false) {
        throw "Program link error: " + (gl.getProgramInfoLog(p));
    }
    else {
        return p;
    }
}
function updateProjection() {
    var gl = renderState.context;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderState.projection.setIdentity();
    renderState.projection.mul(Mat4.makeScale(renderState.zoom, renderState.zoom * gl.drawingBufferWidth / gl.drawingBufferHeight, 1));
    // diagonal = || boxMax - boxMin ||
    var diagonal = renderState.boundingBoxMax.dup().sub(renderState.boundingBoxMin).length();
    renderState.scale = 1 / diagonal;
    // middle = ( boxMax + boxMin ) / 2
    var middle = renderState.boundingBoxMax.dup().add(renderState.boundingBoxMin).scale(0.5);
    renderState.origin[0] = middle.x;
    renderState.origin[1] = middle.y;
    renderState.origin[2] = middle.z;
}
function updateModelView() {
    var mv = renderState.modelview;
    var o = renderState.origin;
    var r = renderState.rotation;
    var s = renderState.scale;
    var trs = renderState.translation;
    mv.setIdentity();
    mv.mul(Mat4.makeTranslation(trs[0], trs[1], trs[2]));
    mv.mul(Mat4.makeScale(s, s, s));
    mv.mul(Mat4.makeQuaternion(r));
    mv.mul(Mat4.makeTranslation(-o[0], -o[1], -o[2]));
}
var wireCubeArrayBuffer;
var wireCubeIndexBuffer;
function draw(timestamp) {
    var gl = renderState.context;
    gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
    for (var i = 0; i < renderState.groups.length; ++i) {
        drawGroup(renderState.groups[i]);
    }
    if (settings.showBoundingBox) {
        // scale = max - min
        var boxScale = renderState.boundingBoxMax.dup().sub(renderState.boundingBoxMin);
        var r = renderState.rotation;
        var s = renderState.scale;
        var trs = renderState.translation;
        var mv = new Mat4();
        mv.mul(Mat4.makeTranslation(trs[0], trs[1], trs[2]));
        mv.mul(Mat4.makeScale(s, s, s));
        mv.mul(Mat4.makeQuaternion(r));
        mv.mul(Mat4.makeScale(boxScale.x, boxScale.y, boxScale.z));
        gl.useProgram(renderState.shader.program);
        gl.disableVertexAttribArray(renderState.shader.attrNormal);
        // make the bounding box black
        gl.uniform4fv(renderState.shader.uniDiffuse, [0, 0, 0, 1]);
        gl.uniformMatrix4fv(renderState.shader.uniModelView, false, mv.m);
        gl.uniformMatrix4fv(renderState.shader.uniProjection, false, renderState.projection.m);
        gl.bindBuffer(gl.ARRAY_BUFFER, wireCubeArrayBuffer);
        gl.vertexAttribPointer(renderState.shader.attrPosition, 4, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireCubeIndexBuffer);
        gl.drawElements(gl.LINES, 24, gl.UNSIGNED_INT, 0);
        gl.enableVertexAttribArray(renderState.shader.attrNormal);
    }
    window.requestAnimationFrame(draw);
}
function drawGroup(group) {
    var gl = renderState.context;
    var shader;
    switch (group.highlight) {
        case Highlight.Line:
            shader = renderState.highlightShader;
            break;
        case Highlight.Refelection:
            shader = renderState.reflectionShader;
            break;
        case Highlight.Curvature:
            shader = renderState.curvatureShader;
            break;
        default:
            shader = renderState.shader;
    }
    gl.useProgram(shader.program);
    gl.uniformMatrix4fv(shader.uniProjection, false, renderState.projection.m);
    gl.uniformMatrix4fv(shader.uniModelView, false, renderState.modelview.m);
    gl.uniform1f(shader.uniClipAmt, renderState.clipping);
    if (group.highlight === Highlight.Curvature) {
        // only things for curvature shaders
        var crvShader = shader;
        gl.enableVertexAttribArray(crvShader.attrCurvature);
        gl.uniform1f(crvShader.uniMaxCrv, settings.userMaxCrv);
        gl.uniform1f(crvShader.uniMinCrv, settings.userMinCrv);
        gl.uniform1i(crvShader.uniCrvMode, settings.curvatureType);
    }
    else {
        // only things for ordinary shaders and highlight line / reflection shaders
        var s = shader;
        gl.enableVertexAttribArray(s.attrNormal);
        gl.uniform1i(s.uniFlipNormals, group.flipNormals ? 1.0 : 0.0);
        gl.uniform3fv(s.uniLightsOn, settings.lightsOn);
    }
    gl.enableVertexAttribArray(shader.attrPosition);
    if (group.highlight == Highlight.Line || group.highlight == Highlight.Refelection) {
        // things for highlight line / reflection shaders only
        var s = shader;
        gl.uniform1f(s.uniHighLightDensity, group.highlightDensity);
    }
    else if (group.highlight == Highlight.Normal) {
        // things for orinary shader only
        var s = shader;
        gl.uniform1i(s.uniFlatShading, group.flatShading ? 1.0 : 0.0);
    }
    // all patch rendering
    if (group.showPatches) {
        for (var j = 0; j < group.objs.length; ++j) {
            var obj = group.objs[j];
            var color = GroupColors[group.color].value;
            // set the alpha to the current transparency
            color[3] = renderState.transparency;
            if (group.highlight === Highlight.Curvature) {
                var crvShader = shader;
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.curvatureBuffer);
                gl.vertexAttribPointer(crvShader.attrCurvature, 4, gl.FLOAT, false, 0, 0);
            }
            else {
                // ordinary and highlight shaders
                var s = shader;
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
                gl.vertexAttribPointer(s.attrNormal, 3, gl.FLOAT, false, 0, 0);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
            gl.vertexAttribPointer(shader.attrPosition, 4, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
            if (group.highlight === Highlight.Wireframe) {
                // black wireframe
                gl.uniform4fv(shader.uniDiffuse, [0, 0, 0, 1]);
                gl.drawElements(gl.LINES, obj.indexBufferLength, gl.UNSIGNED_INT, 0);
            }
            else {
                gl.uniform4fv(shader.uniDiffuse, color);
                gl.drawElements(gl.TRIANGLES, obj.indexBufferLength, gl.UNSIGNED_INT, 0);
            }
        }
    }
    if (group.highlight === Highlight.Curvature) {
        var crvShader = shader;
        gl.disableVertexAttribArray(crvShader.attrCurvature);
    }
    if (group.showControlMesh) {
        gl.useProgram(renderState.shader.program);
        gl.disableVertexAttribArray(renderState.shader.attrNormal);
        // make the bounding box black
        gl.uniform4fv(renderState.shader.uniDiffuse, [0, 0, 0, 1]);
        gl.uniformMatrix4fv(renderState.shader.uniModelView, false, renderState.modelview.m);
        gl.uniformMatrix4fv(renderState.shader.uniProjection, false, renderState.projection.m);
        for (var j = 0; j < group.objs.length; ++j) {
            var obj = group.objs[j];
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.controlMesh.positionBuffer);
            gl.vertexAttribPointer(renderState.shader.attrPosition, 4, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.controlMesh.indexBuffer);
            gl.drawElements(gl.LINES, obj.controlMesh.indexBufferLength, gl.UNSIGNED_INT, 0);
        }
        gl.enableVertexAttribArray(renderState.shader.attrNormal);
    }
}
function setTessellationLevel(level) {
    settings.tessellation = level;
    /*
    let menuitems = document.querySelectorAll('#patch-detail-menu a[data-value]');
    for(let i = 0; i < menuitems.length; i++) {
        menuitems[i].className = menuitems[i].getAttribute('data-value') == String(level) ? 'checked' : '';
    }
    */
    var menu = document.getElementById('select-patch-detail');
    menu.value = level.toString();
    for (var i = 0; i < renderState.groups.length; ++i) {
        var group = renderState.groups[i];
        var objs = group.objs;
        for (var j = 0; j < objs.length; ++j) {
            objs[j].evaluate(renderState.context, level);
        }
        group.findMinMax();
    }
    // update the global bounding box and curvature
    if (renderState.groups.length > 0) {
        renderState.boundingBoxMin = renderState.groups[0].boundingBoxMin.dup();
        var boxMin = renderState.boundingBoxMin;
        renderState.boundingBoxMax = renderState.groups[0].boundingBoxMax.dup();
        var boxMax = renderState.boundingBoxMax;
        for (var k = 0; k < 4; ++k) {
            renderState.globalGroup.minCrv[k] = renderState.groups[0].minCrv[k];
            renderState.globalGroup.maxCrv[k] = renderState.groups[0].maxCrv[k];
        }
        for (var i = 1; i < renderState.groups.length; ++i) {
            boxMin.x = Math.min(renderState.groups[i].boundingBoxMin.x, boxMin.x);
            boxMin.y = Math.min(renderState.groups[i].boundingBoxMin.y, boxMin.y);
            boxMin.z = Math.min(renderState.groups[i].boundingBoxMin.z, boxMin.z);
            boxMax.x = Math.max(renderState.groups[i].boundingBoxMax.x, boxMax.x);
            boxMax.y = Math.max(renderState.groups[i].boundingBoxMax.y, boxMax.y);
            boxMax.z = Math.max(renderState.groups[i].boundingBoxMax.z, boxMax.z);
            for (var k = 0; k < 4; ++k) {
                renderState.globalGroup.minCrv[k] = Math.min(renderState.groups[i].minCrv[k], renderState.globalGroup.minCrv[k]);
                renderState.globalGroup.maxCrv[k] = Math.max(renderState.groups[i].maxCrv[k], renderState.globalGroup.maxCrv[k]);
            }
        }
    }
    else {
        renderState.boundingBoxMax.set(0.5, 0.5, 0.5);
        renderState.boundingBoxMin.set(-0.5, -0.5, -0.5);
        for (var k = 0; k < 4; ++k) {
            renderState.globalGroup.minCrv[k] = 0;
            renderState.globalGroup.maxCrv[k] = 0;
        }
    }
    updateCurvatureClampIfDirty(renderState.globalGroup.minCrv[settings.curvatureType], renderState.globalGroup.maxCrv[settings.curvatureType]);
}
function resetProjection() {
    renderState.projection.setIdentity();
    renderState.modelview.setIdentity();
    renderState.aspectRatio = 1.0;
    renderState.translation = new Float32Array([0, 0, 0]);
    renderState.origin = new Float32Array([0, 0, 0]);
    renderState.rotation.set_axis_angle(3, 1, 1, 0.10).normalize4();
    renderState.scale = 1.0;
    renderState.zoom = 1.0;
    updateProjection();
    updateModelView();
}
function freeGroups() {
    for (var i = 0; i < renderState.groups.length; ++i) {
        renderState.groups[i].free(renderState.context);
    }
    renderState.groups = [];
}
function selectGroup(index) {
    if (index < 0 || index >= renderState.groups.length)
        index = -1;
    renderState.selectedGroupIndex = index;
    var nodes = document.getElementsByClassName('which-group-am-i-changing');
    for (var i = 0; i < nodes.length; ++i) {
        while (nodes[i].firstChild) {
            nodes[i].removeChild(nodes[i].firstChild);
        }
        var s = (index == -1) ? 'Applying changes to all groups' : 'Applying changes to specific group: ' + renderState.groups[index].name;
        nodes[i].appendChild(document.createTextNode(s));
    }
}
// if the selected group was the global group then this
// changes the properties in all the other groups
function updateAllGroupsIfGlobal(propertyName) {
    if (renderState.selectedGroupIndex != -1)
        return;
    var value = renderState.globalGroup[propertyName];
    for (var i = 0; i < renderState.groups.length; ++i) {
        renderState.groups[i][propertyName] = value;
    }
}
function activeGroup() {
    if (renderState.selectedGroupIndex >= 0 && renderState.selectedGroupIndex < renderState.groups.length)
        return renderState.groups[renderState.selectedGroupIndex];
    else
        return renderState.globalGroup;
}
function updateGroups() {
    var o = document.getElementById('select-group');
    while (o.firstChild) {
        o.removeChild(o.firstChild);
    }
    function addOption(index, group) {
        var node = document.createElement('option');
        node.value = index.toString();
        node.appendChild(document.createTextNode(group.name));
        o.appendChild(node);
    }
    addOption(-1, renderState.globalGroup);
    for (var i = 0; i < renderState.groups.length; ++i) {
        addOption(i, renderState.groups[i]);
    }
    if (renderState.selectedGroupIndex >= 0 && renderState.selectedGroupIndex < renderState.groups.length) {
        o.value = renderState.selectedGroupIndex.toString();
    }
    else {
        o.value = '-1';
    }
    var selectGroupColor = document.getElementById('select-group-color');
    selectGroupColor.value = activeGroup().color.toString();
}
function loadBezierObject(text) {
    freeGroups();
    renderState.groups = readBVFile(renderState.context, text);
    settingsRefreshFromGroup(renderState.globalGroup);
    setTessellationLevel(settings.tessellation);
    selectGroup(-1);
    updateGroups();
    resetProjection();
}
function preload() {
    var obj = document.getElementById('loading');
    function setText(text) {
        while (obj.firstChild) {
            obj.removeChild(obj.firstChild);
        }
        if (text) {
            obj.appendChild(document.createTextNode(text));
        }
    }
    var vssrc = '';
    var totalCount = 6;
    var errorCount = 0;
    loadTextResource('shader/vs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        vssrc = s;
    });
    var fssrc = '';
    loadTextResource('shader/fs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        fssrc = s;
    });
    var hlfssrc = '';
    loadTextResource('shader/highlight.fs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        hlfssrc = s;
    });
    var refl_fssrc = '';
    loadTextResource('shader/highlight_reflection.fs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        refl_fssrc = s;
    });
    var curv_fssrc = '';
    loadTextResource('shader/curvature.fs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        curv_fssrc = s;
    });
    var curv_vssrc = '';
    loadTextResource('shader/curvature.vs.glsl', function (e, s) {
        if (e)
            ++errorCount;
        curv_vssrc = s;
    });
    function poll() {
        var numLoaded = 0;
        if (vssrc)
            ++numLoaded;
        if (fssrc)
            ++numLoaded;
        if (hlfssrc)
            ++numLoaded;
        if (refl_fssrc)
            ++numLoaded;
        if (curv_fssrc)
            ++numLoaded;
        if (curv_vssrc)
            ++numLoaded;
        if (numLoaded === totalCount) {
            obj.style.display = 'none';
            setup(vssrc, fssrc, hlfssrc, refl_fssrc, curv_fssrc, curv_vssrc);
        }
        else {
            setText('Loading ' + numLoaded.toString() + ' / ' + totalCount.toString());
            if (errorCount === 0)
                setTimeout(poll, 100);
        }
    }
    poll();
}
function setup(vssrc, fssrc, hlfssrc, refl_fssrc, curv_fssrc, curv_vssrc) {
    var canvas = document.getElementById('drawing');
    var gl = canvas.getContext('webgl');
    if (gl === null) {
        window.alert('Your browser does not support WebGL');
        throw 'no webgl support';
    }
    // extension needed for Uint32 index array
    var extA = gl.getExtension('OES_element_index_uint');
    // extension needed for flat shading
    var extB = gl.getExtension('OES_standard_derivatives');
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    renderState.context = gl;
    var prog = makeProgram(gl, makeShader(gl, gl.VERTEX_SHADER, vssrc), makeShader(gl, gl.FRAGMENT_SHADER, fssrc));
    renderState.shader = {
        program: prog,
        attrPosition: gl.getAttribLocation(prog, "inputPosition"),
        attrNormal: gl.getAttribLocation(prog, "inputNormal"),
        uniProjection: gl.getUniformLocation(prog, "projection"),
        uniClipAmt: gl.getUniformLocation(prog, "clipAmt"),
        uniModelView: gl.getUniformLocation(prog, "modelview"),
        uniDiffuse: gl.getUniformLocation(prog, "diffuse"),
        uniFlatShading: gl.getUniformLocation(prog, "flatShading"),
        uniFlipNormals: gl.getUniformLocation(prog, "flipNormals"),
        uniLightsOn: gl.getUniformLocation(prog, "lightsOn")
    };
    prog = makeProgram(gl, makeShader(gl, gl.VERTEX_SHADER, vssrc), makeShader(gl, gl.FRAGMENT_SHADER, hlfssrc));
    renderState.highlightShader = {
        program: prog,
        attrPosition: gl.getAttribLocation(prog, "inputPosition"),
        attrNormal: gl.getAttribLocation(prog, "inputNormal"),
        uniProjection: gl.getUniformLocation(prog, "projection"),
        uniClipAmt: gl.getUniformLocation(prog, "clipAmt"),
        uniModelView: gl.getUniformLocation(prog, "modelview"),
        uniDiffuse: gl.getUniformLocation(prog, "diffuse"),
        uniFlipNormals: gl.getUniformLocation(prog, "flipNormals"),
        uniLightsOn: gl.getUniformLocation(prog, "lightsOn"),
        uniHighLightDensity: gl.getUniformLocation(prog, "highlightDensity")
    };
    prog = makeProgram(gl, makeShader(gl, gl.VERTEX_SHADER, vssrc), makeShader(gl, gl.FRAGMENT_SHADER, refl_fssrc));
    renderState.reflectionShader = {
        program: prog,
        attrPosition: gl.getAttribLocation(prog, "inputPosition"),
        attrNormal: gl.getAttribLocation(prog, "inputNormal"),
        uniProjection: gl.getUniformLocation(prog, "projection"),
        uniClipAmt: gl.getUniformLocation(prog, "clipAmt"),
        uniModelView: gl.getUniformLocation(prog, "modelview"),
        uniDiffuse: gl.getUniformLocation(prog, "diffuse"),
        uniFlipNormals: gl.getUniformLocation(prog, "flipNormals"),
        uniLightsOn: gl.getUniformLocation(prog, "lightsOn"),
        uniHighLightDensity: gl.getUniformLocation(prog, "highlightDensity")
    };
    prog = makeProgram(gl, makeShader(gl, gl.VERTEX_SHADER, curv_vssrc), makeShader(gl, gl.FRAGMENT_SHADER, curv_fssrc));
    renderState.curvatureShader = {
        program: prog,
        attrCurvature: gl.getAttribLocation(prog, "crv"),
        attrPosition: gl.getAttribLocation(prog, "inputPosition"),
        uniProjection: gl.getUniformLocation(prog, "projection"),
        uniClipAmt: gl.getUniformLocation(prog, "clipAmt"),
        uniModelView: gl.getUniformLocation(prog, "modelview"),
        uniDiffuse: gl.getUniformLocation(prog, "diffuse"),
        uniCrvMode: gl.getUniformLocation(prog, "crvMode"),
        uniMaxCrv: gl.getUniformLocation(prog, "maxCrv"),
        uniMinCrv: gl.getUniformLocation(prog, "minCrv")
    };
    resizeCanvas(null);
    // these "wire cube" buffers are used for the bounding box
    wireCubeArrayBuffer = (function () {
        var A = -0.5;
        var B = 0.5;
        var arr = new Float32Array([
            A, A, A, 1.0,
            A, A, B, 1.0,
            A, B, A, 1.0,
            A, B, B, 1.0,
            B, A, A, 1.0,
            B, A, B, 1.0,
            B, B, A, 1.0,
            B, B, B, 1.0,
        ]);
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        return buffer;
    })();
    wireCubeIndexBuffer = (function () {
        var arr = new Uint32Array([
            0, 1, 1, 5, 5, 4, 4, 0,
            2, 3, 3, 7, 7, 6, 6, 2,
            2, 0, 3, 1, 7, 5, 6, 4
        ]);
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        return buffer;
    })();
    InitColorDialogBox();
    selectGroup(-1);
    // default bezier object to appear
    loadTextResource('data/logo.bv', function (err, text) {
        if (!err)
            loadBezierObject(text);
    });
    window.addEventListener('resize', resizeCanvas);
    window.requestAnimationFrame(draw);
    var mouseState = { x: 0, y: 0 };
    // prevent context menu from appearing on right click
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    }, false);
    canvas.addEventListener('mousedown', function (e) {
        if (e.button === 0 || e.button === 2)
            mouseState.x = e.clientX, mouseState.y = e.clientY;
    });
    canvas.addEventListener('mousemove', function (e) {
        if (e.buttons === 1) {
            if (renderState.rotateMode) {
                var x_angle = 0.01 * (e.clientY - mouseState.y) * Math.min(1.0, (1 / renderState.zoom));
                var x_rot = new Vec3();
                x_rot.set_axis_angle(1, 0, 0, -x_angle);
                var y_angle = 0.01 * (e.clientX - mouseState.x) * Math.min(1.0, (1 / renderState.zoom));
                var y_rot = new Vec3();
                y_rot.set_axis_angle(0, 1, 0, -y_angle);
                renderState.rotation.quaternion_mul(x_rot).quaternion_mul(y_rot);
                //renderState.rotation[1] -= 0.01 * (e.clientX - mouseState.x) * Math.min(1.0,(1/renderState.zoom));
                //renderState.rotation[0] -= 0.01 * (e.clientY - mouseState.y) * Math.min(1.0,(1/renderState.zoom));
                updateModelView();
                renderState.clipping = -55;
            }
            else {
                renderState.clipping = (e.clientY / window.innerHeight) * 2.0 - 1.0;
            }
            mouseState.x = e.clientX, mouseState.y = e.clientY;
        }
        // panning when right clicking
        else if (e.buttons === 2) {
            renderState.translation[1] -= (e.clientY - mouseState.y) / window.innerHeight * (1 / renderState.zoom);
            renderState.translation[0] += (e.clientX - mouseState.x) / window.innerWidth * (1 / renderState.zoom);
            updateModelView();
            mouseState.x = e.clientX, mouseState.y = e.clientY;
        }
    });
    var handleScroll = function (e) {
        function clamp(v) {
            var amt = 0.25;
            if (v < -amt)
                return -amt;
            if (v > amt)
                return amt;
            return v;
        }
        if (!e)
            e = event;
        var direction = (e.detail < 0 || e.wheelDelta > 0) ? 1 : -1;
        if (e.altKey) {
            renderState.scale *= Math.pow(1.1, direction);
            updateModelView();
        }
        else {
            if (direction > 0) {
                var dy = (e.clientY - canvas.height / 2) / window.innerHeight;
                var dx = (e.clientX - canvas.width / 2) / window.innerWidth;
                renderState.translation[1] += (clamp(dy) * (1 / renderState.zoom)) * 0.2;
                renderState.translation[0] -= (clamp(dx) * (1 / renderState.zoom)) * 0.2;
            }
            renderState.zoom *= Math.pow(1.1, direction);
            updateProjection();
            updateModelView();
        }
    };
    canvas.addEventListener('DOMMouseScroll', handleScroll, false); // for Firefox
    canvas.addEventListener('mousewheel', handleScroll, false); // for everyone else
    window.addEventListener('keydown', function (e) {
        // angle = 10 degrees
        var angle = 0.174532925199430;
        switch (e.keyCode) {
            case 81: {
                // Q	
                var left = new Vec3();
                left.set_axis_angle(0, 0, 1, angle);
                renderState.rotation.quaternion_mul(left);
                updateModelView();
                break;
            }
            case 69: {
                // E
                var right = new Vec3();
                right.set_axis_angle(0, 0, 1, -angle);
                renderState.rotation.quaternion_mul(right);
                updateModelView();
                break;
            }
            case 76: {
                // L
                defaultSettings.showWatermark = !defaultSettings.showWatermark;
                if (defaultSettings.showWatermark) {
                    canvas.style.backgroundColor = '';
                }
                else {
                    canvas.style.backgroundColor = 'rgb(255, 255, 255)';
                }
                break;
            }
            case 27:
                // ESC
                resetProjection();
                break;
        }
    });
    document.getElementById('upload-file').addEventListener('change', function () {
        var files = this.files;
        if (files.length == 1) {
            var reader = new FileReader();
            reader.onload = function (e) {
                loadBezierObject(e.target.result.toString());
            };
            reader.readAsText(files[0]);
        }
    });
    function dragFileOver(e) {
        e.stopPropagation();
        e.preventDefault();
        e.target.className = (e.type == "dragover" ? "hover" : "");
    }
    function dropFile(e) {
        var reader;
        dragFileOver(e);
        var files = e.target.files || e.dataTransfer.files;
        if (files.length == 1) {
            reader = new FileReader();
            reader.onload = function (e) {
                loadBezierObject(e.target.result);
            };
            reader.readAsText(files[0]);
        }
    }
    canvas.addEventListener('dragover', dragFileOver, false);
    canvas.addEventListener('dragleave', dragFileOver, false);
    canvas.addEventListener('drop', dropFile, false);
    var menuitems = document.querySelectorAll('#patch-detail-menu a[data-value]');
    for (var i = 0; i < menuitems.length; i++) {
        menuitems[i].addEventListener('click', function (e) {
            var n = Number(e.target.getAttribute('data-value'));
            if (!isNaN(n))
                setTessellationLevel(n);
        });
    }
    setTessellationLevel(settings.tessellation);
    menuitems = document.querySelectorAll('#curv-detail-menu a[data-value]');
    for (var i = 0; i < menuitems.length; i++) {
        menuitems[i].addEventListener('click', function (e) {
            var type = Number(e.target.value);
            if (!isNaN(type))
                setCurvatureType(type);
        });
    }
    setCurvatureType(settings.curvatureType);
    document.getElementById('check-control-mesh').addEventListener('change', function (e) {
        activeGroup().showControlMesh = e.target.checked;
        updateAllGroupsIfGlobal('showControlMesh');
    });
    document.getElementById('check-flat-shading').addEventListener('change', function (e) {
        activeGroup().flatShading = e.target.checked;
        updateAllGroupsIfGlobal('flatShading');
    });
    document.getElementById('check-flip-normals').addEventListener('change', function (e) {
        activeGroup().flipNormals = e.target.checked;
        updateAllGroupsIfGlobal('flipNormals');
    });
    document.getElementById('check-light-1').addEventListener('change', function (e) {
        settings.lightsOn[0] = e.target.checked ? 1.0 : 0.0;
    });
    document.getElementById('check-light-2').addEventListener('change', function (e) {
        settings.lightsOn[1] = e.target.checked ? 1.0 : 0.0;
    });
    document.getElementById('check-light-3').addEventListener('change', function (e) {
        settings.lightsOn[2] = e.target.checked ? 1.0 : 0.0;
    });
    var checkHighlightBox = document.getElementById('check-highlight');
    var checkReflectionBox = document.getElementById('check-reflection');
    var checkCurvatureBox = document.getElementById('check-curvature');
    var checkWireframeBox = document.getElementById('check-wireframe');
    var updateHighlightMode = function (e) {
        var lines = checkHighlightBox.checked;
        var refl = checkReflectionBox.checked;
        var curv = checkCurvatureBox.checked;
        var wire = checkWireframeBox.checked;
        // count of number of boxes checked
        var count = (lines ? 1 : 0) + (refl ? 1 : 0) + (curv ? 1 : 0) + (wire ? 1 : 0);
        // if more than one box checked, disable all but the most recent
        if (count > 0) {
            checkHighlightBox.checked = false;
            checkReflectionBox.checked = false;
            checkCurvatureBox.checked = false;
            checkWireframeBox.checked = false;
            e.target.checked = true;
            lines = checkHighlightBox.checked;
            refl = checkReflectionBox.checked;
            curv = checkCurvatureBox.checked;
            wire = checkWireframeBox.checked;
        }
        if (lines) {
            activeGroup().highlight = Highlight.Line;
        }
        else if (refl) {
            activeGroup().highlight = Highlight.Refelection;
        }
        else if (curv) {
            activeGroup().highlight = Highlight.Curvature;
        }
        else if (wire) {
            activeGroup().highlight = Highlight.Wireframe;
        }
        else {
            activeGroup().highlight = Highlight.Normal;
        }
        updateAllGroupsIfGlobal('highlight');
    };
    document.getElementById('check-bounding-box').addEventListener('change', function (e) {
        settings.showBoundingBox = e.target.checked;
    });
    document.getElementById('check-patches').addEventListener('change', function (e) {
        activeGroup().showPatches = e.target.checked;
        updateAllGroupsIfGlobal('showPatches');
    });
    checkHighlightBox.addEventListener('change', updateHighlightMode);
    checkReflectionBox.addEventListener('change', updateHighlightMode);
    checkCurvatureBox.addEventListener('change', updateHighlightMode);
    checkWireframeBox.addEventListener('change', updateHighlightMode);
    document.getElementById('rotateModeTrue').addEventListener('change', function (e) {
        renderState.rotateMode = e.target.checked;
    });
    document.getElementById('rotateModeFalse').addEventListener('change', function (e) {
        renderState.rotateMode = !e.target.checked;
    });
    document.getElementById('select-curv-type').addEventListener('change', function (e) {
        var n = Number(e.target.value);
        if (!isNaN(n))
            setCurvatureType(n);
    });
    document.getElementById('select-patch-detail').addEventListener('change', function (e) {
        var n = Number(e.target.value);
        if (!isNaN(n))
            setTessellationLevel(n);
    });
    document.getElementById('select-group').addEventListener('change', function (e) {
        selectGroup(Number(e.target.value));
        var selectGroupColor = document.getElementById('select-group-color');
        if (renderState.selectedGroupIndex >= 0 && renderState.selectedGroupIndex < renderState.groups.length) {
            var group = renderState.groups[renderState.selectedGroupIndex];
            selectGroupColor.value = group.color.toString();
        }
        else {
            selectGroupColor.value = '0';
        }
        settingsRefreshFromGroup(activeGroup());
    });
    document.getElementById('select-group-color').addEventListener('change', function (e) {
        activeGroup().color = Number(e.target.value);
        updateAllGroupsIfGlobal('color');
    });
    document.getElementById('select-highlight-density').addEventListener('change', function (e) {
        activeGroup().highlightDensity = Number(e.target.value);
        updateAllGroupsIfGlobal('highlightDensity');
    });
    document.getElementById('select-model').addEventListener('change', function (e) {
        loadTextResource(e.target.value, function (err, text) {
            if (!err)
                loadBezierObject(text);
        });
    });
    document.getElementById('select-model').value = 'data/logo.bv';
    document.getElementById('delete-group').addEventListener('click', function (e) {
        if (renderState.selectedGroupIndex < 0 || renderState.selectedGroupIndex >= renderState.groups.length)
            return;
        activeGroup().free(renderState.context);
        renderState.groups.splice(renderState.selectedGroupIndex, 1);
        selectGroup(renderState.selectedGroupIndex - 1);
        updateGroups();
    });
    // curvature clamping
    (function () {
        var a = document.getElementById('min-crv-in');
        var b = document.getElementById('max-crv-in');
        var restoreBtn = document.getElementById('restore-crv-in');
        a.addEventListener('change', function (e) {
            var val = Number(a.value);
            if (isNaN(val)) {
                a.value = renderState.globalGroup.minCrv[settings.curvatureType].toString();
                return;
            }
            if (val > Number(b.value)) {
                b.value = val.toString();
            }
            restoreBtn.disabled = false;
            settings.userMinCrv = val;
        });
        b.addEventListener('change', function (e) {
            var val = Number(b.value);
            if (isNaN(val)) {
                b.value = renderState.globalGroup.maxCrv[settings.curvatureType].toString();
                return;
            }
            if (val < Number(a.value)) {
                a.value = val.toString();
            }
            restoreBtn.disabled = false;
            settings.userMaxCrv = val;
        });
        restoreBtn.addEventListener('click', function () {
            settings.userMinCrv = renderState.globalGroup.minCrv[settings.curvatureType];
            settings.userMaxCrv = renderState.globalGroup.maxCrv[settings.curvatureType];
            a.value = settings.userMinCrv.toString();
            b.value = settings.userMaxCrv.toString();
            restoreBtn.disabled = true;
        });
    })();
}
function InitColorDialogBox() {
    var tmp = document.getElementById('select-group-color');
    for (var i = 0; i < GroupColors.length; ++i) {
        var el = document.createElement('option');
        el.textContent = GroupColors[i].name;
        el.value = i.toString();
        tmp.appendChild(el);
    }
}
function resizeCanvas(e) {
    var canvas = renderState.context.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateProjection();
}
// curvature clamping
function updateCurvatureClampIfDirty(low, high) {
    var a = document.getElementById('min-crv-in');
    var b = document.getElementById('max-crv-in');
    var restoreBtn = document.getElementById('restore-crv-in');
    if (restoreBtn.disabled) {
        a.value = low.toString();
        b.value = high.toString();
        settings.userMinCrv = low;
        settings.userMaxCrv = high;
    }
    function set_to(id, val) {
        var obj = document.getElementById(id);
        while (obj.firstChild) {
            obj.removeChild(obj.firstChild);
        }
        obj.appendChild(document.createTextNode(val.toString()));
    }
    set_to('min-crv-actual', low);
    set_to('max-crv-actual', high);
}
function setCurvatureType(type) {
    var menuitems = document.querySelectorAll('#curv-detail-menu a[data-value]');
    for (var i = 0; i < menuitems.length; i++) {
        menuitems[i].className = menuitems[i].getAttribute('data-value') == String(type) ? 'checked' : '';
    }
    settings.curvatureType = type;
    updateCurvatureClampIfDirty(renderState.globalGroup.minCrv[settings.curvatureType], renderState.globalGroup.maxCrv[settings.curvatureType]);
}
document.addEventListener('DOMContentLoaded', preload);
