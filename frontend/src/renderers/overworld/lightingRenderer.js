export class LightingRenderer {
    constructor(config) {
        this.config = config;

        this.lightingCanvas = document.createElement('canvas');
        this.lightingCtx = this.lightingCanvas.getContext('2d');
        
        this.width = 0;
        this.height = 0;
    }

    render(mainCtx, ambientColor, camera, visibleEntities) {
        // 1. If it's basically fully bright, don't draw anything
        if (ambientColor.a <= 0.01) return;

        // 2. Sync Buffer Size
        if (this.width !== mainCtx.canvas.width || this.height !== mainCtx.canvas.height) {
            this.width = mainCtx.canvas.width;
            this.height = mainCtx.canvas.height;
            this.lightingCanvas.width = this.width;
            this.lightingCanvas.height = this.height;
        }

        // 3. Clear & Fill Darkness
        this.lightingCtx.clearRect(0, 0, this.width, this.height);
        this.lightingCtx.fillStyle = `rgba(${ambientColor.r}, ${ambientColor.g}, ${ambientColor.b}, ${ambientColor.a})`;
        this.lightingCtx.fillRect(0, 0, this.width, this.height);

        // 4. Punch Holes (Lights)
        this.lightingCtx.globalCompositeOperation = 'destination-out';

        // -- Light 1: The Player --
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        const baseRadius = 140; 

        // --- DYNAMIC GEOMETRY FIX ---
        // Calculate the distance from center to the furthest corner of the screen.
        // This ensures the circle is ALWAYS big enough to cover the screen at 0% darkness.
        const maxDist = Math.sqrt(Math.pow(this.width / 2, 2) + Math.pow(this.height / 2, 2));
        
        // Calculate the 'gap' between the tight night circle and the screen corner
        const maxExpansion = maxDist - baseRadius;

        // Map the Alpha (Darkness Level) to the Radius.
        // Alpha 0.0 (Day) -> Expansion is Max (Circle touches corners).
        // Alpha 1.0 (Night) -> Expansion is 0 (Circle is tight 140px).
        const expansion = (1.0 - ambientColor.a) * maxExpansion;

        this.drawLightGradient(cx, cy, baseRadius + expansion); 

        // 5. Draw Buffer to Main Screen
        this.lightingCtx.globalCompositeOperation = 'source-over';
        mainCtx.drawImage(this.lightingCanvas, 0, 0);
    }

    drawLightGradient(x, y, radius) {
        // Safety check to prevent crashing on negative radius
        if (radius < 0) radius = 0;

        const gradient = this.lightingCtx.createRadialGradient(x, y, 0, x, y, radius);
        
        // 0% - 50%: Pure Clear (Player can see themselves clearly)
        gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)'); 
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)'); 
        
        // 100%: Fades into the darkness
        gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)'); 

        this.lightingCtx.fillStyle = gradient;
        this.lightingCtx.beginPath();
        this.lightingCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.lightingCtx.fill();
    }
}