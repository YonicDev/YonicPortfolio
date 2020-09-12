{vec3,quat} = require 'vmath'

class Camera
    constructor: (options) ->
        {@camera_object,@control,@mouse_rotation_multiplier=1.5,@angle_limit=60} = options
        @camera_parent = @camera_object.parent
        @initial_rotation = {}
        @rotation_origin = {x:0,y:0}
        Object.assign(@initial_rotation,@camera_parent.rotation)
        callbacks = @camera_object.scene.post_animation_callbacks or @camera_object.scene.pre_draw_callbacks
        # WARNING: This must be the last tick,
        # so make sure others are added before or with unshift
        # NOTE: This is pending an API change in the engine
        callbacks.push (scene,frame_duration) =>
            @tick(frame_duration)
    tick: (fd)->
        @camera_parent.rotation.z += @control.axes.value.x/fd
        @camera_parent.rotation.y += @control.axes.value.y/fd
        if @camera_parent.rotation.y >= @angle_limit*Math.PI/180
            @camera_parent.rotation.y = @angle_limit*Math.PI/180
        else if @camera_parent.rotation.y <= -@angle_limit*Math.PI/180
            @camera_parent.rotation.y = -@angle_limit*Math.PI/180


        # Trackball Rotation (DO NOT USE)
        #quat.rotateZ @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.x/fd
        #quat.rotateY @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.y/fd
        return
module.exports = Camera