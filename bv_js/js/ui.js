function savedPositionsRefresh(after) {
    var o = document.getElementById('select-load-position');
    while (o.hasChildNodes()) {
        o.removeChild(o.lastChild);
    }
    for (var i = 0; i < savedPositions.length; ++i) {
        var option = document.createElement('option');
        option.value = i.toString();
        option.appendChild(document.createTextNode('Position ' + savedPositions[i].id));
        o.appendChild(option);
    }
    o.value = after.toString();
}
function settingsRefreshFromGroup(group) {
    var hlLine = false;
    var hlRefl = false;
    var hlCurv = false;
    var hlWire = false;
    switch (group.highlight) {
        case Highlight.Normal:
            break;
        case Highlight.Line:
            hlLine = true;
            break;
        case Highlight.Refelection:
            hlRefl = true;
            break;
        case Highlight.Curvature:
            hlCurv = true;
            break;
        case Highlight.Wireframe:
            hlWire = true;
            break;
    }
    document.getElementById('check-highlight').checked = hlLine;
    document.getElementById('check-reflection').checked = hlRefl;
    document.getElementById('check-curvature').checked = hlCurv;
    document.getElementById('check-wireframe').checked = hlWire;
    document.getElementById('check-patches').checked = group.showPatches;
    document.getElementById('select-highlight-density').value = group.highlightDensity.toString();
    document.getElementById('check-flat-shading').checked = group.flatShading;
    document.getElementById('check-flip-normals').checked = group.flipNormals;
    document.getElementById('check-control-mesh').checked = group.showControlMesh;
}
function settingsUIRefresh() {
    document.getElementById('check-light-1').checked = settings.lightsOn[0] != 0.0;
    document.getElementById('check-light-2').checked = settings.lightsOn[1] != 0.0;
    document.getElementById('check-light-3').checked = settings.lightsOn[2] != 0.0;
    document.getElementById('check-bounding-box').checked = settings.showBoundingBox;
}
function addMyEventListeners() {
    document.getElementById('btn-reset').addEventListener('click', function (e) {
        resetProjection();
    });
    document.getElementById('remove-position').addEventListener('click', function (e) {
        var index = Number(document.getElementById('select-load-position').value);
        if (index >= 0) {
            savedPositions.splice(index, 1);
            savedPositionsRefresh(index - 1);
        }
    });
    // TODO also save curvature type
    var savedPositionsCount = 0;
    var parse_f32_arr = function (obj) {
        var arr = [0, 1, 2];
        arr[0] = Number(obj[0]);
        arr[1] = Number(obj[1]);
        arr[2] = Number(obj[2]);
        return new Float32Array(arr);
    };
    var parse_mat4 = function (obj) {
        var ret = new Mat4();
        obj = obj.m;
        for (var i in obj) {
            ret.m[i] = Number(obj[i]);
        }
        return ret;
    };
    document.getElementById('save-position').addEventListener('click', function (e) {
        ++savedPositionsCount;
        savedPositions.push({
            id: savedPositionsCount,
            translation: new Float32Array(renderState.translation),
            rotation: new Float32Array([renderState.rotation.x, renderState.rotation.y, renderState.rotation.z, renderState.rotation.d]),
            zoom: renderState.zoom,
            scale: renderState.scale,
            projection: (new Mat4()).copy(renderState.projection),
            modelview: (new Mat4()).copy(renderState.modelview),
            setting_flatShading: renderState.globalGroup.flatShading,
            setting_flipNormals: renderState.globalGroup.flipNormals,
            setting_showControlMesh: renderState.globalGroup.showControlMesh,
            setting_showPatches: renderState.globalGroup.showPatches,
            setting_highlight: renderState.globalGroup.highlight,
            setting_showBoundingBox: settings.showBoundingBox,
            setting_highlightDensity: renderState.globalGroup.highlightDensity,
            setting_lightsOn0: settings.lightsOn[0],
            setting_lightsOn1: settings.lightsOn[1],
            setting_lightsOn2: settings.lightsOn[2]
        });
        savedPositionsRefresh(savedPositions.length - 1);
        window.localStorage.setItem('bv_settings', JSON.stringify(savedPositions));
    });
    var lastSavedPosition = 0;
    var loadSavedPosition = function (index) {
        if (index < 0 || index >= savedPositions.length)
            return;
        lastSavedPosition = index;
        var s = savedPositions[index];
        renderState.rotation.x = s.rotation[0];
        renderState.rotation.y = s.rotation[1];
        renderState.rotation.z = s.rotation[2];
        renderState.rotation.d = s.rotation[3];
        renderState.translation = new Float32Array(s.translation);
        renderState.projection = Mat4.makeCopy(s.projection);
        renderState.modelview = Mat4.makeCopy(s.modelview);
        renderState.zoom = s.zoom;
        renderState.scale = s.scale;
        renderState.globalGroup.flatShading = s.setting_flatShading;
        renderState.globalGroup.flipNormals = s.setting_flipNormals;
        renderState.globalGroup.showControlMesh = s.setting_showControlMesh;
        renderState.globalGroup.showPatches = s.setting_showPatches;
        renderState.globalGroup.highlight = s.setting_highlight;
        settings.showBoundingBox = s.setting_showBoundingBox;
        renderState.globalGroup.highlightDensity = s.setting_highlightDensity;
        settings.lightsOn[0] = s.setting_lightsOn0;
        settings.lightsOn[1] = s.setting_lightsOn1;
        settings.lightsOn[2] = s.setting_lightsOn2;
        settingsUIRefresh();
        settingsRefreshFromGroup(renderState.globalGroup);
        updateProjection();
    };
    document.getElementById('select-load-position').addEventListener('change', function (e) {
        var index = Number(e.srcElement.value);
        // this check is to prevent NaN
        if (index >= 0) {
            loadSavedPosition(index);
        }
    });
    document.getElementById('select-load-position').addEventListener('click', function (e) {
        if (e.srcElement.length == 1) {
            loadSavedPosition(0);
        }
    });
    document.getElementById('restore-load-position').addEventListener('click', function (e) {
        loadSavedPosition(lastSavedPosition);
    });
    function loadSettings() {
        var stored = window.localStorage.getItem('bv_settings');
        if (stored) {
            // parse stored settings
            var obj = JSON.parse(stored);
            for (var i = 0; i < obj.length; ++i) {
                obj[i].translation = parse_f32_arr(obj[i].translation);
                obj[i].rotation = parse_f32_arr(obj[i].rotation);
                obj[i].projection = parse_mat4(obj[i].projection);
                obj[i].modelview = parse_mat4(obj[i].modelview);
            }
            savedPositions = obj;
            savedPositionsCount = obj.length;
        }
        settings = defaultSettings;
        savedPositionsRefresh(0);
        settingsUIRefresh();
    }
    window.addEventListener('load', loadSettings);
}
window.addEventListener('DOMContentLoaded', addMyEventListeners);
window.addEventListener('DOMContentLoaded', function () {
    // setup hover menu
    var currently_displayed_menu = null;
    function close_menu() {
        if (currently_displayed_menu) {
            currently_displayed_menu.style.display = 'none';
        }
        currently_displayed_menu = null;
    }
    function show_obj(obj) {
        close_menu();
        obj.style.display = 'block';
        currently_displayed_menu = obj;
    }
    function link_objects(obj_a, obj_b) {
        obj_a.addEventListener('mouseover', function () {
            show_obj(obj_b);
        });
    }
    var menuIDs = [
        'load-file', 'shader-settings', 'curvature', 'display', 'groups', 'other', 'help'
    ];
    for (var i = 0; i < menuIDs.length; ++i) {
        var obj_a = document.getElementById('top-level-' + menuIDs[i]);
        var obj_b = document.getElementById('bottom-level-' + menuIDs[i]);
        link_objects(obj_a, obj_b);
    }
    var all_canvas = document.getElementsByTagName('canvas');
    for (var i = 0; i < all_canvas.length; ++i) {
        // click and mousedown seem like they would be the same but they are not
        all_canvas[i].addEventListener('click', close_menu);
        all_canvas[i].addEventListener('mousedown', close_menu);
    }
});
