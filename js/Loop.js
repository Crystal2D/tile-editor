class Loop
{
    static #loaded = false;
    static #frameIndex = 0;
    static #uTime = 0;
    static #uDeltaTime = 0;
    static #time = 0;
    static #deltaTime = 0;
    static #calls = [];
    
    static targetFrameRate = -1;
    static vSyncCount = 1;
    static timeScale = 1;
    static maximumDeltaTime = 0.1111111;
    
    static get frameCount ()
    {
        return this.#frameIndex;
    }
    
    static get unscaledTime ()
    {
        return this.#uTime;
    }
    
    static get unscaledDeltaTime ()
    {
        return this.#uDeltaTime;
    }
    
    static get time ()
    {
        return this.#time;
    }
    
    static get deltaTime ()
    {
        return this.#deltaTime;
    }
    
    static #RequestUpdate ()
    {
        if (this.targetFrameRate === 0 || this.vSyncCount === 1) requestAnimationFrame(this.#Update.bind(this));
        else if (this.vSyncCount === 2) requestAnimationFrame(() => requestAnimationFrame(this.#Update.bind(this)));
        else setTimeout(this.#Update.bind(this), 5);
    }

    static #UpdateBase ()
    {
        this.#uDeltaTime = (1e-3 * performance.now()) - this.#uTime;
        this.#uTime += this.#uDeltaTime;
            
        let deltaT = this.#uDeltaTime;
            
        if (deltaT > this.maximumDeltaTime) deltaT = this.maximumDeltaTime;
            
        this.#deltaTime = deltaT * this.timeScale;
        this.#time += this.#deltaTime;
            
        this.#Invoke();
            
        if (this.timeScale !== 0) this.#frameIndex++;
    }
    
    static #Update ()
    {
        if (this.targetFrameRate > 0 && this.vSyncCount === 0)
        {
            const slice = (1 / this.targetFrameRate) - 5e-3;
                    
            let accumulator = (1e-3 * performance.now()) - this.#uTime;
        
            while (accumulator >= slice)
            {
                this.#UpdateBase();
            
                accumulator -= slice;
            }
        }
        else this.#UpdateBase();
        
        this.#RequestUpdate();
    }
    
    static #Invoke ()
    {
        for (let i = 0; i < this.#calls.length; i++)
        {
            const currentCall = this.#calls[i];
            
            currentCall.time += this.#deltaTime;
            
            if (currentCall.time <= currentCall.timeout) continue;
            
            currentCall.callback();
            
            if (currentCall.clear()) this.#calls.splice(this.#calls.indexOf(currentCall), 1);
            else currentCall.time = 0;
        }

        Input.End();
    }
    
    static Init ()
    {
        if (this.#loaded) return;
        
        this.#loaded = true;

        Input.Init();
        
        this.#RequestUpdate();
    }
    
    static Append (callback, delay, shouldClear)
    {
        this.#calls.push({
            callback : callback,
            clear : shouldClear ?? (() => false),
            timeout : delay ?? 0,
            time : 0
        });
    }
    
    static async Delay (time)
    {
        if (time === 0) return;
        
        let done = false;
        
        return new Promise(resolve => this.Append(() => {
            done = true;
            
            resolve();
        }, time, () => done));
    }
}

Loop.Init();