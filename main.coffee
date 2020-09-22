MyouEngine = require 'myou-engine'

# Configure and create the engine instance
canvas = MyouEngine.create_full_window_canvas()
options =
    data_dir: 'data',
    debug: true,
    gl_options: {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    }
myou = new MyouEngine.Myou canvas, options
window.myou = myou

Camera = require './camera'
Control = require './control'
Planet = require './planet'

handleCameraMove = (camera,e) ->
    rotateCamera camera,e

# GUI Canvas initialization
#{GUI} = require './ui'
#gui = new GUI canvas

# GUI Svg initialization
document.body.style.overflow = 'hidden'
{SvgGUI} = require './ui'
gui = new SvgGUI canvas
window.gui = gui

# Load the scene called "Scene", its objects and enable it
myou.load_scene('Scene').then (scene) ->
    # At this point, the scene has loaded but not the meshes, textures, etc.
    # We must call scene.load to tell which things we want to load.
    return scene.load 'visible', 'physics'
.then (scene) ->
    # This part will only run after objects have loaded.
    # At this point we can enable rendering and physics at the same time.
    # Otherwise we would have a black screen.
    scene.enable 'render', 'physics'

    # If we ran this line before things have loaded, things would pop out
    # and fall unpredictably.
    camera = new Camera {camera_object:scene.active_camera,control:new Control myou,mouse_rotation_multiplier:2,angle_limit:360}
    planet = new Planet scene
    #Debug
    window.scene = scene
    window.camera = camera
    window.planet = planet
    rotateCamera = (e) ->
            x;y;
            e.stopPropagation()
            if e.type == 'mousemove'
                x = (e.clientX-camera.rotation_origin.x)/canvas.clientWidth*2
                y = (e.clientY-camera.rotation_origin.y)/canvas.clientHeight*2
            else if e.type == 'touchmove'
                e.preventDefault()
                x = (e.touches[0].clientX-camera.rotation_origin.x)/canvas.clientWidth*2
                y = (e.touches[0].clientY-camera.rotation_origin.y)/canvas.clientHeight*2
            camera.camera_parent.rotation.z = camera.initial_rotation.z - x
            camera.camera_parent.rotation.y = camera.initial_rotation.y - y
            if camera.camera_parent.rotation.y >= camera.angle_limit*Math.PI/180
                camera.camera_parent.rotation.y = camera.angle_limit*Math.PI/180
            else if camera.camera_parent.rotation.y <= -camera.angle_limit*Math.PI/180
                camera.camera_parent.rotation.y = -camera.angle_limit*Math.PI/180
            myou.main_loop.reset_timeout()
    enableCameraMove = (e) ->
        console.log e.type
        if e.type == 'mousedown'
            camera.rotation_origin = {x:e.clientX,y:e.clientY}
            canvas.addEventListener 'mousemove',rotateCamera
        else if e.type == 'touchstart'
            camera.rotation_origin = {x:e.touches[0].clientX,y:e.touches[0].clientY}
            e.preventDefault()
            canvas.addEventListener 'touchmove', rotateCamera
    disableCameraMove = (e) ->
        console.log e.type
        Object.assign(camera.initial_rotation,camera.camera_parent.rotation)
        if e.type == 'mouseup' || e.type == 'mouseout'
            canvas.removeEventListener 'mousemove',rotateCamera
        else if e.type == 'touchend' || e.type == 'touchleave'
            e.preventDefault()
            canvas.removeEventListener 'touchmove', rotateCamera

    canvas.addEventListener 'mousedown',enableCameraMove
    canvas.addEventListener 'touchstart', enableCameraMove

    canvas.addEventListener 'mouseout',disableCameraMove
    canvas.addEventListener 'mouseup',disableCameraMove
    canvas.addEventListener 'touchend', disableCameraMove
    canvas.addEventListener 'touchleave', disableCameraMove

    #initialize_GUI scene,planet
    # Initialize GUI
    initialize_GUI(scene,planet)

initialize_GUI = (scene,planet) ->
    Label = require('./ui').SvgLabel
    {CategoryWindow} = require './ui'

    gui.elements.push new Label gui,{
        name:"label",
        stroke:{width:'2'}
        ,planet
    }
    gui.elements.push new CategoryWindow gui,{
        name:"category-window"
        width:320,
        height:180,
        radius:15,
        stroke:{color:"cyan",width:4},
        planet
    }
    scene.post_draw_callbacks.push gui.update
###
initialize_GUI = (scene,planet) ->

    {Label} = require './ui'

    gui.ctx = gui.canvas.getContext '2d'
    gui.elements.label = new Label planet,{gui}
    console.log gui.elements

    scene.post_draw_callbacks.push (scene,fd) =>
        if gui.redraw then gui.clear_canvas()
        for name,element of gui.elements
            element.update fd
###
# Convenience variables for console access
# They have $ in the name to avoid using them by mistake elsewhere
window.$myou = myou
window.$MyouEngine = MyouEngine
window.$vmath = require 'vmath'
