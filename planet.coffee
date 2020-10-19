{vec3} = require 'vmath'
{Behaviour} = require 'myou-engine'
work_data = require './works.json'

class Planet
    constructor: (scene) ->
        @triangles = for i in [1..20]
            if i < 10
                new Triangle(scene.objects['Icosphere.00'+i],{index:i,planet:@})
            else
                new Triangle(scene.objects['Icosphere.0'+i],{index:i,planet:@})
        @selected_triangle = @get_closest_triangle()
        @game_state = scene.global_vars.game_state
        scene.pre_draw_callbacks.unshift (scene, frame_duration)=>
            @tick frame_duration

    tick: (fd) =>
        @game_state = @triangles[0].scene.global_vars.game_state
        if @game_state == "orbit"
            @prev_triangle = @selected_triangle
            @selected_triangle = @get_closest_triangle()
            if @prev_triangle != @selected_triangle
                document.dispatchEvent new Event 'triangleChanged'
            for triangle in @triangles
                vec3.set triangle.ob.materials[0].inputs.selected.value,0,0,0
            vec3.set @selected_triangle.ob.materials[0].inputs.selected.value,10,0,0
            return
    get_vertex_coordinates: (triangle, vertex) =>
        index = vertex*triangle.ob.data.stride/4
        return [triangle.ob.data.varray[index],triangle.ob.data.varray[index+1],triangle.ob.data.varray[index+2]]
    get_triangle_center: (triangle) ->
        vertices = for vtx in [0..2]
            @get_vertex_coordinates @triangles[triangle], vtx

        return vec3.new(
            (vertices[0][0] + vertices[1][0] + vertices[2][0])/3,
            (vertices[0][1] + vertices[1][1] + vertices[2][1])/3,
            (vertices[0][2] + vertices[1][2] + vertices[2][2])/3
        )
    get_closest_triangle: () =>
        camera = @triangles[0].scene.active_camera
        distances = for face in [0..19]
            vec3.dist(camera.get_world_position(),@get_triangle_center(face))
        @triangles[distances.indexOf Math.min.apply null,distances]

class Triangle extends Behaviour
    constructor: (ob,options) ->
        super ob.scene,options
        @ob = ob
        {@index,@planet} = options
        @enable_object_picking()
        for work in work_data
            if work.triangle == @index
                vec3.set @ob.materials[0].inputs.has_content.value,10,0,0
                break
    on_object_pointer_down: (e) =>
        if e.object != @ob then return
        console.log @ob.name

module.exports = Planet
