export const WeatherDefinitions = {
    CLEAR: {
        id: 'clear',
        name: 'Clear Skies',
        visualEffect: 'none',
        durationRange: [1, 2] // e.g., min and max in-game hours this weather lasts
    },
    RAIN: {
        id: 'rain',
        name: 'Rain',
        visualEffect: 'particle_rain',
        durationRange: [1,2]
    },
    FOG: {
        id: 'fog',
        name: 'Dense Fog',
        visualEffect: 'overlay_fog',
        durationRange: [2, 8]
    },
    SANDSTORM: {
        id: 'sandstorm',
        name: 'Sandstorm',
        visualEffect: 'particle_sand',
        durationRange: [3, 9]
    }
};