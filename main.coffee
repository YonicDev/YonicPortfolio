MyouEngine = require 'myou-engine'

# Configure and create the engine instance
canvas = MyouEngine.create_full_window_canvas()
options =
    data_dir: 'data',
    debug: true
myou = new MyouEngine.Myou canvas, options

Camera = require './camera'
Control = require './control'


handleCameraMove = (camera,e) ->
    rotateCamera camera,e
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
    camera = new Camera {camera_object:scene.active_camera,control:new Control myou}
    rotateCamera = (e) ->
            x;y;
            if e.type == 'mousemove'
                e.preventDefault()
                x = e.clientX/canvas.clientWidth*2-1
                y = e.clientY/canvas.clientHeight*2-1
            else if e.type == 'touchmove'
                x = e.touches[0].clientX/canvas.clientWidth*2-1
                y = e.touches[0].clientY/canvas.clientHeight*2-1
            camera.camera_parent.rotation.z += x/10
            camera.camera_parent.rotation.y += y/10
            if camera.camera_parent.rotation.y >= camera.angle_limit*Math.PI/180
                camera.camera_parent.rotation.y = camera.angle_limit*Math.PI/180
            else if camera.camera_parent.rotation.y <= -camera.angle_limit*Math.PI/180
                camera.camera_parent.rotation.y = -camera.angle_limit*Math.PI/180
            myou.main_loop.reset_timeout()
    enableCameraMove = (e) ->
        console.log e.type
        if e.type == 'mousedown'
            canvas.addEventListener 'mousemove',rotateCamera
        else if e.type == 'touchstart'
            e.preventDefault()
            canvas.addEventListener 'touchmove', rotateCamera
    disableCameraMove = (e) ->
        console.log e.type
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

# Convenience variables for console access
# They have $ in the name to avoid using them by mistake elsewhere
window.$myou = myou
window.$MyouEngine = MyouEngine
window.$vmath = require 'vmath'
