// WeatherDefinitions.js
export const WeatherDefinitions = {
    CLEAR: {
        id: 'clear',
        name: 'Clear Skies',
        visualEffect: 'none',
        audioEffect: 'none', // No sound for clear skies
        durationRange: [1, 10]
    },
    RAIN: {
        id: 'rain',
        name: 'Rain',
        animationId: 'weatherRain', // Link to the battle animation for rain
        visualEffect: 'particle_rain',
        audioEffect: 'weatherRain', // The ID of your audio asset
        durationRange: [8,20],
        appliedStatusId: 'wet'
    },
    FOG: {
        id: 'fog',
        name: 'Dense Fog',
        visualEffect: 'overlay_fog',
        audioEffect: 'weatherFog', 
        durationRange: [8, 12]
    },
    SANDSTORM: {
        id: 'sandstorm',
        name: 'Sandstorm',
        visualEffect: 'particle_sand',
        audioEffect: 'weatherFog',
        durationRange: [10,20]
    }
};