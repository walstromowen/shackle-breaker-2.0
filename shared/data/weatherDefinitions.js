/* Weather. `animationId` is the battle animation that plays when the weather acts in a fight (see battleAnimationDefinitions.js: weatherRain,
   weatherFog, weatherSandstorm, weatherBlizzard). It plays on everyone in the battle. Clear skies have none. */
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
        animationId: 'weatherFog',
        visualEffect: 'overlay_fog',
        audioEffect: 'weatherFog', 
        durationRange: [8, 12],
        appliedStatusId: 'evasive',   // everyone in the fight is harder to hit while the fog lasts ...
        appliedStatusCharges: 99,     // ... for the whole fight (evasive normally wears off after 3 turns)
        battleMessage: "A thick fog rolls onto the battlefield!" // ✅ NEW
    },
    SANDSTORM: {
        id: 'sandstorm',
        name: 'Sandstorm',
        animationId: 'weatherSandstorm',
        visualEffect: 'particle_sand',
        audioEffect: 'weatherFog',
        durationRange: [10,20],
        battleMessage: "A blinding sandstorm whips up around you!" // ✅ NEW
    },
    /* Wind-driven snow that whites out the screen and chills everyone in a fight (status 'chilled', see statusEffectDefinitions.js).
       Only a biome that lists 'blizzard' in its allowedWeather can roll it (the snowy mountains); its odds are in WEATHER_WEIGHTS (timeSystem.js).
       audioEffect is the fog loop until there is a wind loop: register e.g. weatherBlizzard in main.js and put its key here. */
    BLIZZARD: {
        id: 'blizzard',
        name: 'Blizzard',
        animationId: 'weatherBlizzard',
        visualEffect: 'particle_blizzard',
        audioEffect: 'weatherFog',
        durationRange: [6, 14],
        appliedStatusId: 'chilled',
        battleMessage: "A howling blizzard sweeps across the battlefield!"
    }
};