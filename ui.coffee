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
        @game_state = scene.global_vars.game_state
        canvas3d = scene.context.canvas
        @width = canvas3d.clientWidth
        @height = canvas3d.clientHeight
        @layout canvas3d
        for name,element of @elements
            if element.update? then element.update fd
    find_element: (target,multiple=false) ->
        matches = for element in @elements
            if element.name == target then element else continue
        if multiple then matches else matches[0]

class SvgLabel
    constructor: (@gui,options={}) ->
        @g = document.createElementNS SVG_NS,'g'
        @g.id = options.name if options.name?
        @name = options.name

        @line = document.createElementNS SVG_NS,'path'
        @start = {x:0, y:0}
        @end = {x:@gui.width*0.75,y:@gui.height*0.75}
        {@stroke={color:'red',width:2},@tail_length=40,@planet} = options
        @stroke.length = @line.getTotalLength()
        @stroke.target_length = 0
        @stroke.animation_direction = "backwards"
        # BUG: Dynamically updating the stroke-dasharray will cause the
        # stroke-dashoffset to constantly trigger.
        @line.style.transition = "stroke-dashoffset 1s linear"

        @text = document.createElementNS SVG_NS,'text'
        text_node = document.createTextNode("")
        @text.appendChild text_node
        @title = ""
        @update_label_text()

        {@text_margin = {x:20,0,y:0},@font_size=24} = options

        @g.append @line
        @g.append @text
        @gui.svg.append @g

        document.addEventListener "triangleChanged",(e) =>
            @update_label_text()

        @draw()

    draw: () =>
        @line.setAttribute 'stroke',@stroke.color
        @line.setAttribute 'stroke-width',@stroke.width
        @line.setAttribute 'fill','none'
        @line.setAttribute 'd',"M#{@start.x} #{@start.y} L#{@end.x} #{@end.y} L#{@end.x+@tail_length} #{@end.y}"
        @line.setAttribute 'stroke-dasharray',@stroke.length
        @line.setAttribute 'stroke-dashoffset',@stroke.target_length

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

        # Get pixel color from the selected triangle.
        {gl} = @planet.triangles[0].scene.context.render_manager
        p = new Uint8Array(4)
        gl.readPixels @start.x,@start.y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p
        @stroke.color = "rgba(#{p[0]+32},#{p[1]+32},#{p[2]+32},1)"

        # Update stroke animation limits
        @stroke.length = @line.getTotalLength()
        switch @stroke.animation_direction
            when "forwards" then @stroke.target_length = @stroke.length
            when "backwards" then @stroke.target_length = 0

        @draw()

    update_label_text: () =>
        selected_work = Works.find (work) => work.triangle == @planet.triangles.indexOf(@planet.selected_triangle)+1
        txt = if selected_work? then selected_work.title else "Coming soon..."
        window.requestAnimationFrame @animate_text txt,0,20

    animate_text: (txt,count,limit) =>
        return () =>
            if count++ > limit
                @title = txt
            else
                @title = @shuffle_text txt,limit-count
                window.requestAnimationFrame @animate_text txt,count,limit

    shuffle_text: (source,amount) =>
        alpha = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
        bet = alpha.join("")
        arr = for char in source
            if !/[A-z '.]/.test char then continue
            if /[ '.]/.test char then char
            else
                offset = amount
                if bet.indexOf(char)+offset < 0
                    while bet.indexOf(char)+offset < 0
                        offset = (alpha.length) + (offset-1) - (bet.indexOf(char)-1)
                else if bet.indexOf(char)+offset >= alpha.length
                    while bet.indexOf(char)+offset >= alpha.length
                        offset = (offset-1) - bet.indexOf char
                alpha[bet.indexOf(char)+offset]
        return arr.join("")

class CategoryWindow
    constructor: (@gui,options={}) ->
        @name = options.name

        @x = @gui.width*0.75
        @y = @gui.height*0.4

        @maxWidth = options.width
        @maxHeight = options.height

        @g = document.createElementNS SVG_NS,'g'
        @g.id = options.name if options.name?
        {@width,@height,@radius,@stroke,@planet} = options

        @path = document.createElementNS SVG_NS,'polygon'

        @overlay = document.createElementNS SVG_NS,'polygon'
        @overlay.style.backgroundBlendMode = "linear-burn"
        @overlay.setAttribute 'fill','rgba(0,255,255,0.15)'

        @image = document.createElementNS(SVG_NS,'image')
        @image_src = "/assets/gui/static.gif"
        img = new Image()
        img.onload = @update_window
        img.src = "/assets/gui/static.gif"

        @mask = {
            element: document.createElementNS(SVG_NS,'clipPath'),
            path: document.createElementNS(SVG_NS,'polygon'),
        }
        @mask.element.id = @g.id+"-mask"

        @mask.element.append @mask.path
        @g.append @mask.element
        @g.append @image
        @g.append @path
        @g.append @overlay
        @gui.svg.append @g

        document.addEventListener "triangleChanged",(e) =>
            @update_window()

        @draw()

    update_window: (e) =>
        selected_work = Works.find (work) => work.triangle == @planet.triangles.indexOf(@planet.selected_triangle)+1
        @image_src = "/assets/gui/static.gif"
        if selected_work? and selected_work.image != ""
            preload_image = selected_work.image
            @stroke.color = '#0FF'
            @overlay.setAttribute 'fill','rgba(0,255,255,0.15)'
            img = new Image()
            img.onload = (e) =>
                @image_src = preload_image
            img.src = preload_image
        else
            @stroke.color = '#CCC'
            @overlay.setAttribute 'fill','rgba(128,128,128,0.15)'


    update: (fd) =>
        switch @gui.game_state
            when "orbit"
                @x = @gui.width*0.75
                @y = @gui.height*0.4
            when "section"
                @maxWidth = @gui.width/3
                @maxHeight = @gui.height*0.5
                @x = @gui.width*0.25-@width*0.5
                @y = @gui.height*0.5-@height*0.75
        @width = @maxWidth
        @height = @maxHeight

        @draw()

    draw : =>
        @path.setAttribute 'points',
            "#{@x+@radius},#{@y}
            #{@x+@width-@radius},#{@y}
            #{@x+@width},#{@y+@radius}
            #{@x+@width},#{@y+@height-@radius}
            #{@x+@width-@radius},#{@y+@height}
            #{@x+@radius},#{@y+@height}
            #{@x},#{@y+@height-@radius}
            #{@x},#{@y+@radius}"
        @path.setAttribute 'stroke',@stroke.color
        @path.setAttribute 'stroke-width',@stroke.width
        @path.setAttribute 'fill','none'
        @mask.path.setAttribute('points',@path.getAttribute('points'))
        @overlay.setAttribute 'points',@path.getAttribute 'points'
        @image.setAttribute 'x',@x
        @image.setAttribute 'y',@y
        @image.setAttribute 'href',@image_src
        @image.setAttribute 'width',@width
        @image.setAttribute 'clip-path',"url(##{@mask.element.id})"

class SlideshowControls
    constructor: (@gui,options={
        name:"slideshow-controls"
        buttonsWidth:160,
        buttonsHeight:90,
        buttonsPadding:5,
        }) ->
        @container = document.createElementNS SVG_NS, 'g'

        {@name} = options
        @container.id = @name

        {@buttonsWidth,@buttonsHeight,@buttonsPadding} = options
        @x = @gui.width/4
        @y = @gui.height*0.75

        @buttons = for i in [0..7]
            new SlideshowButton @gui,{index:i,controls:@,radius:15}

        @clientRect = @container.getClientRects()[0]

        @gui.svg.append @container

        @update()
    update: () ->
        @clientRect = @container.getClientRects()[0]
        @x = @gui.width*0.25-@clientRect.width*0.5
        @y = @gui.height*0.75-@clientRect.height*0.75
        for button in @buttons
            button.update()

class SlideshowButton
    constructor: (@gui,options={}) ->
        {@index,@controls,@radius} = options

        @path = document.createElementNS SVG_NS,'polygon'
        @path.setAttribute "class","slideshowButton"

        @row = if @index>3 then 1 else 0
        @x = 0
        @y = 0
        @offset = -@controls.buttonsHeight

        @width = @controls.buttonsWidth
        @height = @controls.buttonsHeight

        @stroke = {color:"red",width:3}
        @opacity = 0

        @controls.container.append @path

        @update()

    update: () ->
        @x = @controls.x+(@controls.buttonsWidth+@controls.buttonsPadding)*(@index%4)
        @y = @offset+@controls.y+(@controls.buttonsHeight+@controls.buttonsPadding)*@row
        @draw()
    draw: () ->
        @path.setAttribute 'points',
            "#{@x+@radius},#{@y}
            #{@x+@width-@radius},#{@y}
            #{@x+@width},#{@y+@radius}
            #{@x+@width},#{@y+@height-@radius}
            #{@x+@width-@radius},#{@y+@height}
            #{@x+@radius},#{@y+@height}
            #{@x},#{@y+@height-@radius}
            #{@x},#{@y+@radius}"
        @path.setAttribute 'stroke',@stroke.color
        @path.setAttribute 'stroke-width',@stroke.width
        @path.setAttribute 'stroke-opacity',@opacity
        @path.setAttribute 'fill','none'
        @path.setAttribute 'opacity',@opacity
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

module.exports = {SvgGUI,SvgLabel,CategoryWindow,SlideshowControls}
