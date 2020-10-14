{vec3,quat} = require 'vmath'

class Camera
    constructor: (options) ->
        {@camera_object,@control,@mouse_rotation_multiplier=1.5,@angle_limit=60} = options
        @camera_parent = @camera_object.parent
        @initial_rotation = {}
        @rotation_origin = {x:0,y:0}
        @initial_position = vec3.clone @camera_object.position
        Object.assign(@initial_rotation,@camera_parent.rotation)
        callbacks = @camera_object.scene.post_animation_callbacks or @camera_object.scene.pre_draw_callbacks
        
        Object.defineProperty @camera_object, 'world_position_x',
            get: -> @get_world_position().x,
            set: (v) ->
                p = @get_world_position()
                p.x = v
                @set_world_position p
        Object.defineProperty @camera_object, 'world_position_y',
            get: -> @get_world_position().y,
            set: (v) ->
                p = @get_world_position()
                p.y = v
                @set_world_position p
        Object.defineProperty @camera_object, 'world_position_z',
            get: -> @get_world_position().z,
            set: (v) ->
                p = @get_world_position()
                p.z = v
                @set_world_position p

        # WARNING: This must be the last tick,
        # so make sure others are added before or with unshift
        # NOTE: This is pending an API change in the engine
        callbacks.push (scene,frame_duration) =>
            @tick(frame_duration)
    tick: (fd)->
        switch @get_game_state()
            when "orbit"
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

    get_game_state: () -> @camera_object.scene.global_vars.game_state
module.exports = Camera
