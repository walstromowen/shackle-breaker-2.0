export const WeatherDefinitions = {
    CLEAR: {
        id: 'clear',
        name: 'Clear Skies',
        visualEffect: 'none',
        durationRange: [999, 999] // e.g., min and max in-game hours this weather lasts
    },
    RAIN: {
        id: 'rain',
        name: 'Rain',
        visualEffect: 'particle_rain',
        durationRange: [8,20]
    },
    FOG: {
        id: 'fog',
        name: 'Dense Fog',
        visualEffect: 'overlay_fog',
        durationRange: [8, 12]
    },
    SANDSTORM: {
        id: 'sandstorm',
        name: 'Sandstorm',
        visualEffect: 'particle_sand',
        durationRange: [10,209]
    }
};