class Control
    constructor: (@myou) ->
        {Axes2} = @myou
        @axes = new Axes2 'Key:KeyA','Key:KeyD','Key:KeyS','Key:KeyW'

    get_current: ->
        x = @axes.value.x
        y = @axes.value.y
        return {x,y}

module.exports = Control
