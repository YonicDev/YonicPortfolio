class HSLColor
    constructor: (@h,@s,@l) ->
    toCSS: () => return "hsl(#{@h},#{@s}%,#{@l}%)"
    @lerp: (a,b,amount) =>
        amount = Math.min(Math.max(amount, 0), 1)
        h = Math.round(a.h * amount + b.h * (1-amount))
        s = Math.round(a.s * amount + b.s * (1-amount))
        l = Math.round(a.l * amount + b.l * (1-amount))
        return new HSLColor(h,s,l)

class Background
    constructor: (@options) ->
        @root = document.createElement "canvas"
        @root.id = "background"
        @root.width = window.innerWidth
        @root.height = window.innerHeight
        @ctx = @root.getContext '2d'
        @mouse = { x: @root.width*0.5, y: @root.height*0.5 }
        @root.style.position = "absolute"
        @root.style.top = 0
        @root.style.zIndex = -1
        @root.style.pointerEvents = "none"

        document.body.appendChild @root
    init: () =>
        @hexes = {left:[],right:[]}
        @triMesh = new TriMesh(@,@options.triMesh.triSize,-@options.triMesh.triSize,@options.triMesh.colors[0])
        @buildHexWall "left"
        @buildHexWall "right"

        @bgElements = []

        @constellations = []

        # Waves
        wave1 = new Wave(40,0.006,0.02,0);
        wave2 = new Wave(20,0.006,0.023,Math.PI/4);
        wave3 = new Wave(40,0.006,0.021,Math.PI/6);
        wave4 = new Wave(20,0.006,0.024,Math.PI/2);
        @bgElements.push new WaveOverlap @,wave3,wave4,@options.wave1Color
        @bgElements.push new WaveOverlap @,wave1,wave2,@options.wave1Color
    
        # Constellations
        constellationBounds = new Bounds {x:@root.width*0.5,y:@root.height * 0.25},@root.width*0.25,@root.height*0.25

        @constellations.push new Constellation @,15,3,constellationBounds,"azure"

        window.addEventListener "resize", this.onResize
        window.addEventListener "mousemove",(ev) =>
            this.mouse.x = ev.x
            this.mouse.y = ev.y
        return

    hideMesh: () =>
        for tri in @triMesh.tris
            tri.drawable = false
            tri.active = false
        return
    
    buildHexWall: (side,radius=15,padding=6.5) =>
        this.hexes[side] = [];
        x = 0

        beginColor = new HSLColor 230,20,12
        endColor = new HSLColor 140,80,32

        for row in [1...6]
            x = if side == "left" then radius*row*Math.sin(Math.PI/6)+padding else @root.width-radius*row*Math.sin(Math.PI/6)-padding
            y = padding + radius
            while y<=@root.height-radius-padding
                @hexes[side].push new Hex @,x,y+(radius+padding)*Math.cos(Math.PI/3)*(1-row%2),radius-padding*1.25,beginColor,endColor
                y+=radius+padding
        return
    
    onResize: (ev) =>
        @root.width = window.innerWidth
        @root.height = window.innerHeight
        @buildHexWall "left"
        @buildHexWall "right"
        @triMesh = new TriMesh(@,@options.triMesh.triSize,-@options.triMesh.triSize,@options.triMesh.colors[0]) 
        for constellation in @constellations
            constellation.bounds.center = {x: @root.width*0.5, y:@root.height*0.25}
            constellation.bounds.width = @root.width*0.25
            constellation.bounds.height = @root.height*0.25
        return

    showStars: () =>
        
        gsap.to(@bgElements[0],{alpha:0,duration:2})
        gsap.to(@bgElements[1],{alpha:0,duration:2})
        gsap.set(@bgElements[0],{active:false,drawable:false,delay:2})
        gsap.set(@bgElements[1],{active:false,drawable:false,delay:2})
        gsap.set(@options.triMesh,{active:true,drawable:true,delay:2})
        gsap.to(@options.triMesh,{alpha:1,duration:2,delay:2})

        for constellation in @constellations
            gsap.set(constellation,{active:true,drawable:true,delay:2})
            gsap.to(constellation,{alpha:1,duration:2,delay:2})
        return

    showWaves: () =>
        for constellation in @constellations
            gsap.to(constellation,{alpha:0,duration:2})
            gsap.set(constellation,{active:false,drawable:false,delay:2})
        gsap.set(@options.triMesh,{active:false,drawable:false,delay:2})
        gsap.to(@options.triMesh,{alpha:0,duration:2})
        gsap.to(@bgElements[0],{alpha:1,duration:2,delay:2})
        gsap.to(@bgElements[1],{alpha:1,duration:2,delay:2})
        gsap.set(@bgElements[0],{active:true,drawable:true,delay:2})
        gsap.set(@bgElements[1],{active:true,drawable:true,delay:2})
        return

    update: () =>
        for element in @bgElements when element.active
            element.update()
        @triMesh.update()
        for constellation in @constellations when constellation.active
            constellation.update()
        for i in [0...@hexes.left.length]
            hexLeft = @hexes.left[i]
            hexRight = @hexes.right[i]
            hexLeft.update() if hexLeft.active
            hexRight.update() if hexRight.active
        @render()
    
    render: () =>
        @ctx.fillStyle = "#05160f"
        @ctx.fillRect 0,0,@root.width,@root.height
        for element in this.bgElements when element.drawable
            element.draw()
        @triMesh.draw() if @triMesh.drawable
        for constellation in this.constellations when constellation.drawable
            constellation.draw()
        for i in [0...@hexes.left.length]
            hexLeft = @hexes.left[i]
            hexRight = @hexes.right[i]
            hexLeft.draw() if hexLeft.drawable
            hexRight.draw() if hexRight.drawable
        return

class Tri
    constructor: (@bg,@baseCorner,@length,@flipped,@phase,@color) ->
        {@ctx} = @bg
        @points = [null,null,null]
        height = @length*Math.sin(Math.PI/3)
        @drawable = false
        @active = false

        @points = []
        @alpha = 0
        @time = 0
        if !@flipped
            @points[0] = @baseCorner;
            @points[1] = {x:@baseCorner.x+@length,y:@baseCorner.y}
            @points[2] = {x:@baseCorner.x+@length*0.5,y:@baseCorner.y-height}
        else
            @points[0] = {x:@baseCorner.x,y:@baseCorner.y-height};
            @points[1] = {x:@baseCorner.x+@length,y:@baseCorner.y-height}
            @points[2] = {x:@baseCorner.x+@length*0.5,y:@baseCorner.y}
    getCenter: () =>
        center = {x:0, y:0}
        for point in @points
            center.x += point.x
            center.y += point.y
        return {
            x:center.x/@points.length,
            y:center.y/@points.length
        }
    update: () =>
        center = @getCenter()
        mouseDistance = Math.sqrt Math.pow(@bg.mouse.x - center.x,2) + Math.pow(@bg.mouse.y - center.y,2)
        mouseBonus1 = @length / (mouseDistance/3+@length*32)
        mouseBonus2 = @length / (mouseDistance*2+@length*4)
        mouseBonus3 = @length / (mouseDistance*4+@length*2.5)
        @time++
        @opacity = ((Math.cos(@time/24+@phase)+1)/12+mouseBonus1+mouseBonus2+mouseBonus3)*@alpha
        return
    draw: () =>
        @ctx.beginPath()
        @ctx.moveTo this.points[0].x, this.points[0].y
        @ctx.lineTo this.points[1].x, this.points[1].y
        @ctx.lineTo this.points[2].x, this.points[2].y
        @ctx.closePath()
        @ctx.fillStyle = @color
        @ctx.globalAlpha = @opacity
        @ctx.globalCompositeOperation = "lighter"
        @ctx.fill()
        @ctx.globalAlpha = 1
        @ctx.globalCompositeOperation = "source-over"
        return

class TriMesh
    @active = false
    @drawable = false

    constructor: (@bg,length=50,margin=20,color="cyan") ->
        @tris = []

        @active = @bg.options.triMesh.active
        @drawable = @bg.options.triMesh.drawable
        @globalAlpha = @bg.options.triMesh.alpha

        triHeight = length * Math.sin(Math.PI/6)
        triOffset = length * Math.sin(Math.PI/3)
        tri = 0
        row = 0
        phaseScale = 150

        y=triHeight * 2

        while y < @bg.root.height
            x = margin+(row%2)*triHeight
            while x < @bg.root.width - margin
                if tri%2==0
                    @tris.push new Tri @bg,{x,y},length,false,Math.random()*Math.PI*phaseScale,color
                    x+=length
                else
                    @tris.push new Tri @bg,{x:x-triHeight,y},length,true,Math.random()*Math.PI*phaseScale,color
                tri++
            row++
            tri = row
            y+=triOffset
    update: () =>
        @active = @bg.options.triMesh.active
        @drawable = @bg.options.triMesh.drawable
        @globalAlpha = @bg.options.triMesh.alpha
        for tri in @tris
            tri.active = @active
            tri.drawable = @drawable
            tri.alpha = @globalAlpha
            tri.update() if tri.active
        return
    draw: () =>
        for tri in @tris when tri.drawable
            tri.draw()
        return

class Hex
    constructor: (@bg,@x,@y,@baseRadius,@startColor,@endColor) ->
        {@ctx} = @bg
        @radius = @baseRadius
        @active = true
        @drawable = true
    update: () =>
        distance = Math.abs @bg.mouse.x - @x
        awayness = (distance/@radius)*0.2

        @color = HSLColor.lerp this.startColor,this.endColor,awayness
        @radius = @baseRadius - distance/(@bg.root.width*0.01)
        if @radius >= @baseRadius then @radius = @baseRadius else if @radius<=0 then @radius = 0
        @drawable = @radius > 0
        return
    
    draw: () =>
        angle = 2*Math.PI/6
        rotation = Math.PI/6
        @ctx.beginPath()
        @ctx.moveTo @x, @y-@radius
        for i in [0...5]
            @ctx.lineTo @x+@radius*Math.cos(i*angle-rotation),this.y+this.radius*Math.sin(i*angle-rotation)
        @ctx.closePath()
        @ctx.fillStyle = @color.toCSS()
        @ctx.fill()
        return

class Wave
    constructor: (@amplitude,@length,@frequency,@phase) ->
    getY: (x, time) => @amplitude * Math.sin x * @length + @frequency*time + @phase

class WaveOverlap
    constructor: (@bg,wave1,wave2,@color) ->
        {@ctx} = @bg
        @time = 0
        @waves = [wave1,wave2]
        @drawable = true
        @active = true
        @alpha = 1
    update: () => 
        @time++
    draw: () =>
        @ctx.beginPath()
        @ctx.moveTo(0,@bg.root.height*0.5)
        x = 0
        while x < @bg.root.width
            @ctx.lineTo x,@waves[0].getY(x,@time)+@bg.root.height*0.5-@waves[1].amplitude*2
            x++
        while x > 0
            @ctx.lineTo x,@waves[1].getY(x,@time)+@bg.root.height*0.5-@waves[0].amplitude
            x--
        @ctx.closePath()
        @ctx.fillStyle = @color
        @ctx.globalAlpha = @alpha
        @ctx.fill()
        @ctx.globalAlpha = 1
        return

class Star

    constructor: (@bg,@bounds,@relativePosition,@speed,@radius=Math.random()*3+5,@color) ->
        {@ctx} = @bg
        @drawable = false
        @active = false
        @alpha = 0
        @position = {
            x: @bounds.topLeft.x + @bounds.width * @relativePosition.x,
            y: @bounds.topLeft.y + @bounds.height * @relativePosition.y
        }
        console.log @position
    update: () =>
        @relativePosition.x += @speed.x
        @relativePosition.y += @speed.y
        if @relativePosition.x <= 0
            @relativePosition.x = 0
            @speed.x *= -1
        else if @relativePosition.x >= 1
            @relativePosition.x = 1
            @speed.x *= -1
        if @relativePosition.y <= 0
            @relativePosition.y = 0
            @speed.y *= -1
        else if @relativePosition.y >= 1
            @relativePosition.y = 1
            @speed.y *= -1
        @position = {
            x: @bounds.topLeft.x + @bounds.width * @relativePosition.x,
            y: @bounds.topLeft.y + @bounds.height * @relativePosition.y
        }
        return
    draw: () =>
        @ctx.beginPath()
        @ctx.arc @position.x,@position.y,@radius,0,2*Math.PI
        @ctx.fillStyle = @color
        @ctx.globalAlpha = @alpha
        @ctx.fill()
        @ctx.globalAlpha = 1
        return

class Constellation

    constructor: (@bg,numStars,starSize,@bounds,@color) ->
        {@ctx} = @bg
        @drawable = false
        @active = false
        @stars = []
        @alpha = 0
        for i in [0...numStars]
            pos = {x: Math.random(),y:Math.random()}
            vel = {x:(Math.random()-0.5)*0.0025,y:(Math.random()-0.5)*0.0025}
            @stars.push new Star @bg,@bounds,pos,vel,starSize,@color
    update: () =>
        @bounds.update()
        for star in @stars
            star.bounds = @bounds
            star.active = @active
            star.drawable = @drawable
            star.alpha = @alpha
            star.update() if star.active
        return
    draw: () =>
        for i in [0...@stars.length-1]
            s1 = @stars[i]
            s2 = @stars[i+1]
            distance = Math.sqrt Math.pow(s2.position.x-s1.position.x,2)+Math.pow(s2.position.y-s1.position.y,2)
            opacity = 1-distance/this.bounds.width
            if opacity > 0
                @ctx.beginPath()
                @ctx.moveTo s1.position.x,s1.position.y
                @ctx.lineTo s2.position.x,s2.position.y
                @ctx.strokeStyle = @color
                @ctx.lineWidth = 2
                @ctx.globalAlpha = opacity*@alpha
                @ctx.stroke()
                @ctx.globalAlpha = 1
        for star in @stars when star.drawable
            star.draw()
        return

class Bounds

    constructor: (@center,@width,@height) ->
        @topLeft = {
            x: @center.x - @width  * 0.5,
            y: @center.y - @height * 0.5
        }
        @bottomRight = {
            x: @center.x + @width  * 0.5,
            y: @center.y + @height * 0.5
        }

    update: () =>
        @topLeft = {
            x: @center.x - @width  * 0.5,
            y: @center.y - @height * 0.5
        }
        @bottomRight = {
            x: @center.x + @width  * 0.5,
            y: @center.y + @height * 0.5
        }

module.exports = { Background }