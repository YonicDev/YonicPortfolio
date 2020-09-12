{vec3} = require 'vmath'

class Planet
    constructor: (@object) ->
        @normals = for face in [0...20]
            @get_face_center face
        console.log @normals
        @object.scene.pre_draw_callbacks.unshift (scene, frame_duration)=>
            @tick frame_duration
    tick: (fd) =>
        console.log @get_closest_face()
    get_vertex_coordinates: (vertex) =>
        index = vertex*@object.data.stride/4
        return [@object.data.varray[index],@object.data.varray[index+1],@object.data.varray[index+2]]
    get_face_center: (face) =>
        vertices = for vtx in [0..2]
            @get_vertex_coordinates face*3+vtx

        return vec3.new(
            (vertices[0][0] + vertices[1][0] + vertices[2][0])/3,
            (vertices[0][1] + vertices[1][1] + vertices[2][1])/3,
            (vertices[0][2] + vertices[1][2] + vertices[2][2])/3
        )
    get_closest_face: () =>
        camera = @object.scene.active_camera
        distances = for face in [0..19]
            vec3.dist(camera.get_world_position(),@get_face_center(face))*1000
        #console.log distances
        distances.indexOf Math.min.apply null,distances
module.exports = Planet
