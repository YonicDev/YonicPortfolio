{vec3} = require 'vmath'

class Planet
    constructor: (scene) ->
        @triangles = for i in [1..20]
            if i < 10 then scene.objects['Icosphere.00'+i] else scene.objects['Icosphere.0'+i]
        @selected_triangle = @get_closest_triangle()
        scene.pre_draw_callbacks.unshift (scene, frame_duration)=>
            @tick frame_duration

    tick: (fd) =>
        @prev_triangle = @selected_triangle
        @selected_triangle = @get_closest_triangle()
        if @prev_triangle != @selected_triangle
            document.dispatchEvent new Event 'triangleChanged'
        for triangle in @triangles
            vec3.set triangle.ob.materials[0].inputs.selected.value,0,0,0
        vec3.set @selected_triangle.ob.materials[0].inputs.selected.value,10,0,0

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
module.exports = Planet
