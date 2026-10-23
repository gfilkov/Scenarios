/*
Each load function onload calls next one (to ensure sequential load of scripts)
# load jquery.min.js	// common
# load scripts using script-specific array of script names from common array
# load MoW scripts array
# load scenario script
*/

// Issue of names collision on vars like 'scenario', 'param', 'scene' etc.
// I will use here gfl_ prefix

//// primitive but effective prod/debug switch: uncomment for jsdebug scripts.COMMENT for PROD!
var JSDEBUG = true;

// Dynamically override JSDEBUG using url parameter 'debug' (with any value: defined, no value: undefined)
if (!window.JSDEBUG) {
    // must be unique name, myparams, urlParams... - conflicting.
    let gfl_params = new URLSearchParams(window.location.search);
    if (gfl_params.get('debug')) {
        // define JSDEBUG
        var JSDEBUG = true;
    }
}

const jquery = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";

// scripts from this array are loaded selectively for each scenario in loadByName()
const scripts = [
    // "https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"
    // DEBUG
    "https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.js"

    , "https://cdn.jsdelivr.net/npm/three@0.132.2/src/Three.js|m"   // module

    // special version for Marienbad, otherwise it looks poor.
    , "js/three/legacy/three.js"

    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"

    , "js/controls/OrbitControls_qiao.js"

    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/libs/fflate.min.js"
    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js"
    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/FBXLoader.js"
    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/OBJLoader.js"
    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/DRACOLoader.js"

    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/geometries/DecalGeometry.js"

    , "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/utils/SkeletonUtils.js"

    , "js/three/utils/SkeletonUtils.js"
    , "js/three/loaders/GLTFLoader_r97.js"

    , "js/three/objects/Water.js"
    , "js/three/objects/Sky.js"

    , "js/soundmanager2/soundmanager2-jsmin.js"

    , "js/shaders/FresnelShader.js"
    , "js/shaders/mow_gemShader.js"

    , "js/sprite.js"
    , "js/Detector.js"
    , "js/createjs.js"

    , "js/mowsprite.js"

    , "js/GfAxesHelper.js"
    , "js/AnimationManager.js"
    , "js/deepseek_butterfly.js"

    // glitch addition
    , "js/shaders/CopyShader.js"
    , "js/libs/postprocessing/ShaderPass.js"
    , "js/libs/postprocessing/EffectComposer.js"
    , "js/libs/postprocessing/MaskPass.js"
    , "js/libs/postprocessing/RenderPass.js"
    , "js/libs/postprocessing/DigitalGlitch.js"
    , "js/libs/postprocessing/GlitchPass.js"

    , "js/gifler.min.js"
    , "js/vector2js.js"
];

// Common MoW scripts: loaded all by loadScriptsRecursive(), after loadByName() is done.
const mowScripts = [
 "js/three/misc/Timer.js"
    , "js/screenfull.js"

    , "https://cdn.jsdelivr.net/npm/video-stream-merger@4.0.1/dist/video-stream-merger.min.js"
    //    , "js/video-stream-merger.js"

    , "js/mow.js"
    , "js/MoW_template.js"
    , "js/ShowRaster.js"
    , "js/gfWebRecorder.js"
    , "js/scenario_three_template.js"
];

// get scenario parameter first

const gfl_queryString = window.location.search;
console.log(gfl_queryString);
const gfl_params = new URLSearchParams(gfl_queryString);
let gfl_scene = gfl_params.get('scene');
console.log('scene: ' + gfl_scene);

// Scenario-specific script names array. Declare here, define in switch()
let scriptNames = [];
let moduleNames = [];   // type="modules" // *.js
let playScript = gfl_scene; // assuming script name == scenario name
switch (gfl_scene) {
    case "autumn":
        //scriptNames.push("three", "orbit");
        scriptNames.push("three");
        playScript = "autumn_leaves";
        break;
    case "birds":
        scriptNames.push("detector", "createjs", "sprite");
        break;
    case "bubbles":
        scriptNames.push("three", "gltfloader", "orbit", "detector", "FresnelShader");
        break;
    case "fireworks":
        scriptNames.push("three", "detector", "createjs", "sprite");
        break;

    case "honey-bees":
        scriptNames.push("three", "orbit", "GLTFLoader", "objloader", "decal", "GfAxesHelper", "skeleton", "AnimationManager");
        break;

    case "march":
        scriptNames.push("three", "fbxloader", "gltfloader", "skeleton", "fflate", "water", "sky", "soundmanager");
        moduleNames.push("AnimationMixer", "AnimationAction", "AnimationObjectGroup");
        break;
    case "marienbad":
        // # Does not work for gems!
        // scriptNames.push("three.js", "OrbitControls_qiao", "gltfloader", "detector", "mow_gemShader");
        scriptNames.push("legacy/three.js", "OrbitControls_qiao", "gltfloader", "detector", "mow_gemShader");

        playScript = "kolonada";
        break;
    case "shells":
        scriptNames.push("three", "sprite");
        playScript = "beach";
        break;
    case "space":
        scriptNames.push("legacy/three.js", "detector", "CopyShader", "ShaderPass", "EffectComposer", "MaskPass", "RenderPass", "DigitalGlitch", "GlitchPass");
        break;
    case "train":
        scriptNames.push("three", "sprite", "mowsprite");
        break;
    case "wintry-road":
        scriptNames.push("three", "sprite", "mowsprite", "vector2js", "gifler");
        break;
    case "xmas-tree":
        scriptNames.push("three", "orbit", "fflate", "gltfloader", "skeleton");
        break;

    case "flowers":
        scriptNames.push("three", "orbit", "fflate", "gltfloader", "fflate", "GfAxesHelper", "skeleton", "butterfly");
        break;

    default:
        console.log(`No ${gfl_scene} in the list.`);
}

function loadScriptBySrc(src, callback) {
    // check for module token
    let parts = src.split('|');
    let ismod = parts.length > 1;

    // CREATE NEW <SCRIPT> TAG
    var js = document.createElement("script");
    js.src = parts[0];
    if (ismod)
        js.type = "module";

    // ON SUCCESSFUL LOAD OR ERROR
    js.onerror = e => { console.log("ERROR loading " + js.src); if (callback) callback(); };
    js.onload = () => { console.log("Loaded: " + js.src); if (callback) callback(); };

    //// turn off async mode for dynamic scripts
    //js.async = false;

    // APPEND <SCRIPT> TAG TO <HEAD>
    document.head.appendChild(js);

    // no sense to put callback here. It will be called immediately, BEFORE the load completes.
    // callback();
}

// NB: exception without window. spec
if (window.JSDEBUG !== undefined) {
    console.log('Using JSDEBUG scripts');

    for (let i = 0; i < mowScripts.length; i++) {
        mowScripts[i] = mowScripts[i].replace('js/', 'jsdebug/');
    }
}
//// START LOADING SCRIPTS. jquery is always there.
loadScriptBySrc(jquery, loadByNames);

// func to load scripts from scripts[] array selecting them by names in scriptNames[]
let gfl_count = 0;  // loaded count
function loadByNames() {
    console.log("gfloader::loadByNames()");

    // loads recursively (calling loadByName() on a new count); when done calls callback func.
    loadByName(loadByNamesDone);
}

function loadByNamesDone() {
    console.log("gfloader::loadByNamesDone()");

    console.log("loadModules(): TBD");

    gfl_count = 0;
    loadScriptsRecursive(mowScripts, loadSceneScript);
}

// finds the next name token in scriptNames[], finds scripts[idx] and loads; callbac when done.
let doneCallback = null;    // poor-man recursion
function loadByName(callback) {
    console.log(`gfloader::loadByName(${gfl_count})`);

    // memorize doneCallback
    if (null == doneCallback)
        doneCallback = callback;

    if (gfl_count >= scriptNames.length) {
        doneCallback();
        return;
    }

    let src = findInArray(scripts, scriptNames[gfl_count]);

    // make sure one missing script in array does not stop loading the others. Exit when all names checked.
    if (gfl_count >= scriptNames.length) {
        doneCallback();
        return;
    }

    gfl_count++;
    // recursively call for next one in scriptNames[]; no callback param here.
    loadScriptBySrc(src, loadByName);
}

// find and return item in string array that contains token. Return null if not found.
function findInArray(arr, token) {
    let result = null;

    token = token.toLowerCase();
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].toLowerCase().includes(token)) {
            result = arr[i];
            break;
        }
    }
    return result;
}

// load scripts sequentially, in the scripts array order.
function loadScriptsRecursive(arr, callback) {
    if (gfl_count >= arr.length) {
        if (callback)
            callback();

        return;
    }

    // CREATE NEW <SCRIPT> TAG
    var js = document.createElement("script");
    js.src = arr[gfl_count++];

    // ON SUCCESSFUL LOAD OR ERROR
    js.onerror = e => { console.log("ERROR loading " + js.src); loadScriptsRecursive(); };
    js.onload = () => {
        console.log("Loaded: " + js.src);

        // load next one
        loadScriptsRecursive(arr, callback);
    };

    // APPEND <SCRIPT> TAG TO <HEAD>
    document.head.appendChild(js);
}

function loadSceneScript() {
    let src = "js/" + playScript + ".js";

    if (window.JSDEBUG !== undefined) {
        src = src.replace('js/', 'jsdebug/');
    }

    loadScriptBySrc(src);
}


