MyouEngine = require 'myou-engine'
{vec3} = require 'vmath'

class SvgGUI
    constructor: (canvas3d,options={}) ->
        @svg = document.createElementNS 'http://www.w3.org/2000/svg','svg'
        @svg.id = "svg_gui"
        @width = canvas3d.clientWidth
        @height = canvas3d.clientHeight
        @layout canvas3d
        @svg.style.position = 'absolute'
        @svg.style.top = 0
        @svg.style.left = 0
        @svg.style.zIndex = 1
        @svg.style.pointerEvents = 'none'
        @elements = []
        document.body.append @svg
    layout: (canvas3d) =>
        @svg.setAttribute 'width',@width
        @svg.setAttribute 'height',@height
        #console.log "WIDTH: (svg) #{@width}, (canvas) #{canvas3d.clientWidth}\n
        #HEIGHT: (svg)#{@height}, (canvas) #{canvas3d.clientHeight}"
    update: (scene, fd) =>
        canvas3d = scene.context.canvas
        @width = canvas3d.clientWidth
        @height = canvas3d.clientHeight
        @layout canvas3d
        for name,element of @elements
            if element.update? then element.update fd

class SvgLabel
    constructor: (@gui,options={
            stroke:{color:'red',width:2}
        }) ->
        @line = document.createElementNS 'http://www.w3.org/2000/svg','line'
        @line.id = options.name if options.name?
        @start = {x:0, y:0}
        @end = {x:@gui.width*0.75,y:@gui.height*0.75}
        {@stroke,@planet} = options
        @gui.svg.append @line
        @speed = 2
        @draw()

    draw: () =>
        @line.setAttribute 'stroke',@stroke.color
        @line.setAttribute 'stroke-width',@stroke.width
        @line.setAttribute 'x1',@start.x
        @line.setAttribute 'y1',@start.y
        @line.setAttribute 'x2',@end.x
        @line.setAttribute 'y2',@end.y

    update: (fd) =>
        camera = @planet.triangles[0].scene.active_camera
        space_point = @planet.get_triangle_center @planet.triangles.indexOf @planet.selected_triangle
        screen_point = vec3.create()
        vec3.transformMat4 screen_point,space_point,camera.world_to_screen_matrix
        @start = {
            x: (1+screen_point.x) * @gui.width*0.5,
            y: (1-screen_point.y) * @gui.height*0.5
        }
        @end = {x:@gui.width*0.75,y:@gui.height*0.75}
        @draw()

###
class GUI
    constructor: (canvas3d,options={}) ->
        @canvas = MyouEngine.create_full_window_canvas()
        @canvas.id = "gui_canvas"
        @canvas.className = "GuiCanvas"
        @canvas.style.position = "absolute"
        @canvas.style.zIndex = 3
        @canvas.style.backgroundColor = "transparent"
        @canvas.style.pointerEvents = "none"
        @canvas.width = canvas3d.clientWidth
        @canvas.height = canvas3d.clientHeight
        @elements = {}
        @redraw = true
        @ctx = null

    clear_canvas: () =>
        @ctx.clearRect 0,0,@canvas.width,@canvas.height


class Label
    constructor: (@planet,options) ->
        {@gui} = options
        {@ctx} = @gui
        @origin = {x: 0, y:0}
        @tail = {x: @gui.canvas.width*2/3, y:@gui.canvas.height*2/3}
        @bg = '#00fe8e'
        @thickness = 5
    draw: () =>
        @ctx.beginPath()
        @ctx.strokeStyle = @bg
        @ctx.strokeRect
        @ctx.moveTo @origin.x, @origin.y
        @ctx.lineTo @tail.x, @tail.y
        @ctx.stroke()
    update: (fd) =>
        @draw()

module.exports = {GUI,Label}
###

module.exports = {SvgGUI,SvgLabel}
