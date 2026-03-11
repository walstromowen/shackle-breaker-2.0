import { WeatherDefinitions } from '../../data/weatherDefinitions.js';
import { WeatherModel } from '../../models/weatherModel.js';

export class WeatherFactory {
    static createWeather(weatherId) {
        // Convert to uppercase to match the definition keys, fallback to CLEAR if not found
        const definitionKey = weatherId.toUpperCase();
        const def = WeatherDefinitions[definitionKey];
        
        if (!def) {
            console.warn(`Weather definition '${weatherId}' not found. Defaulting to CLEAR.`);
            return this.createWeather('CLEAR');
        }
        
        const weather = new WeatherModel(def);
        
        // Calculate a random duration based on the definition's min and max range
        const minTime = def.durationRange[0];
        const maxTime = def.durationRange[1];
        weather.timeRemaining = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
        
        // --- NEW: Store the total duration so the model knows when to fade ---
        weather.totalDuration = weather.timeRemaining;
        
        return weather;
    }
}