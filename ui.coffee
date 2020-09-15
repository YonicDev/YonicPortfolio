MyouEngine = require 'myou-engine'
{vec3} = require 'vmath'

Works = require './works.json'

SVG_NS = 'http://www.w3.org/2000/svg'

class SvgGUI
    constructor: (canvas3d,options={}) ->
        @svg = document.createElementNS SVG_NS,'svg'
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
    constructor: (@gui,options={}) ->
        @g = document.createElementNS SVG_NS,'g'
        @g.id = options.name if options.name?

        @line = document.createElementNS SVG_NS,'path'
        @start = {x:0, y:0}
        @end = {x:@gui.width*0.75,y:@gui.height*0.75}
        {@stroke={color:'red',width:2},@tail_length=40,@planet} = options

        @text = document.createElementNS SVG_NS,'text'
        text_node = document.createTextNode("")
        @text.appendChild text_node
        @title = ""

        {@text_margin = {x:20,0,y:0},@font_size=24} = options

        @g.append @line
        @g.append @text
        @gui.svg.append @g
        @draw()

    draw: () =>
        @line.setAttribute 'stroke',@stroke.color
        @line.setAttribute 'stroke-width',@stroke.width
        @line.setAttribute 'fill','none'
        @line.setAttribute 'd',"M#{@start.x} #{@start.y} L#{@end.x} #{@end.y} L#{@end.x+@tail_length} #{@end.y}"

        @text.setAttribute 'x',@end.x+@tail_length+@text_margin.x
        @text.setAttribute 'y',@end.y+@text_margin.y+@text.getAttribute('font-size')/3
        @text.setAttribute 'fill',@stroke.color
        @text.setAttribute 'font-size',@font_size
        @text.childNodes[0].textContent = @title

    update: (fd) =>
        camera = @planet.triangles[0].scene.active_camera
        space_point = @planet.get_triangle_center @planet.triangles.indexOf @planet.selected_triangle
        screen_point = vec3.create()
        vec3.transformMat4 screen_point,space_point,camera.world_to_screen_matrix
        canvas3d = @planet.triangles[0].scene.context.canvas
        @start = {
            x: (1+screen_point.x) * canvas3d.clientWidth*0.5,
            y: (1-screen_point.y) * canvas3d.clientHeight*0.5
        }
        @end = {x:@gui.width*0.75,y:@gui.height*0.75}

        {gl} = @planet.triangles[0].scene.context.render_manager
        p = new Uint8Array(4)
        gl.readPixels @start.x,@start.y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p
        @stroke.color = "rgba(#{p[0]+32},#{p[1]+32},#{p[2]+32},1)"

        window.Works = Works

        selected_work = Works.find (work) => work.triangle == @planet.triangles.indexOf @planet.selected_triangle
        @title = if selected_work? then selected_work.title else "Coming soon..."

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
