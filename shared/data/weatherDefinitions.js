export const WeatherDefinitions = {
    CLEAR: {
        id: 'clear',
        name: 'Clear Skies',
        visualEffect: 'none',
        audioEffect: 'none', 
        durationRange: [1, 10]
    },
    RAIN: {
        id: 'rain',
        name: 'Rain',
        animationId: 'weatherRain', 
        visualEffect: 'particle_rain',
        audioEffect: 'weatherRain', 
        durationRange: [8,20],
        appliedStatusId: 'wet',
        battleMessage: "A heavy rain begins to fall!" // ✅ NEW
    },
    FOG: {
        id: 'fog',
        name: 'Dense Fog',
        visualEffect: 'overlay_fog',
        audioEffect: 'weatherFog', 
        durationRange: [8, 12],
        battleMessage: "A thick fog rolls onto the battlefield!" // ✅ NEW
    },
    SANDSTORM: {
        id: 'sandstorm',
        name: 'Sandstorm',
        visualEffect: 'particle_sand',
        audioEffect: 'weatherFog',
        durationRange: [10,20],
        battleMessage: "A blinding sandstorm whips up around you!" // ✅ NEW
    }
};