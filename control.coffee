class Control
    constructor: (@myou) ->
        {Axes2} = @myou
        @axes = new Axes2 'Key:KeyA','Key:KeyD','Key:KeyW','Key:KeyS'

    get_current: ->
        x = @axes.value.x
        y = @axes.value.y
        return {x,y}

module.exports = Control
