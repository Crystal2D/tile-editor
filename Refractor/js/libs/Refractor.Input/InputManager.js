class InputManager
{
    static #loaded = false;
    static #mouseOver = false;
    static #mouseX = 0;
    static #mouseY = 0;
    static #keys = [];
    
    static onWheel = new DelegateEvent();
    static onMouseEnter = new DelegateEvent();
    static onMouseExit = new DelegateEvent();

    static get isMouseOver ()
    {
        return this.#mouseOver;
    }

    static #Key = class
    {
        active = false;
        lastState = false;
        name = ""
        code = "";
        
        constructor (name, code)
        {
            this.name = name;
            this.code = code;
        }
    }

    static #FindKey (name)
    {
        let output = -1;
        
        this.#keys.find((element, index) => {
            if (element.name !== name) return false;
            
            output = index;
            
            return true;
        });
        
        return output;
    }

    static #FindKeyByCode (code)
    {
        let output = -1;
        
        this.#keys.find((element, index) => {
            if (element.code !== (element.isLetter ? code.toLowerCase() : code)) return false;
            
            output = index;
            
            return true;
        });
        
        return output;
    }

    static Init ()
    {
        if (this.#loaded) return;

        this.#keys = [
            new this.#Key("left", 0),
            new this.#Key("right", 2),
            new this.#Key("middle", 1)
        ];

        document.addEventListener("mousemove", event => {
            this.#mouseX = event.clientX;
            this.#mouseY = event.clientY;

            if (this.#mouseOver) return;

            this.onMouseEnter.Invoke();
            this.#mouseOver = true;
        });
        document.addEventListener("mouseleave", () => {
            this.onMouseExit.Invoke();
            this.#mouseOver = false;
        });
        document.addEventListener("mousedown", event => {
            event.preventDefault();

            const keyIndex = this.#FindKeyByCode(event.button);

            this.#mouseX = event.clientX;
            this.#mouseY = event.clientY;
            
            this.#keys[keyIndex].active = true;
        });
        document.addEventListener("mouseup", event => {            
            event.preventDefault();

            const keyIndex = this.#FindKeyByCode(event.button);

            this.#mouseX = event.clientX;
            this.#mouseY = event.clientY;
            
            this.#keys[keyIndex].active = false;
        });
        document.addEventListener("wheel", event => {
            event.preventDefault();

            this.#mouseX = event.clientX;
            this.#mouseY = event.clientY;

            if (event.deltaY === 0) return;

            this.onWheel.Invoke(event.deltaY * ((event.ctrlKey && !Input.GetKey(KeyCode.Ctrl)) ? 25 : 2) * 1e-3);
        }, { passive: false });

        this.#loaded = true;
    }

    static End ()
    {
        for (let i = 0; i < this.#keys.length; i++) this.#keys[i].lastState = this.#keys[i].active;
    }

    static GetMouseX ()
    {
        return this.#mouseX;
    }

    static GetMouseY ()
    {
        return this.#mouseY;
    }

    static GetKey (key)
    {
        let keyIndex = key;
        
        if (typeof key === "string")
        {
            keyIndex = this.#FindKey(key);
            
            if (keyIndex == null) return false;
        }
        else if (key < 0 || key >= this.#keys.length) return;
        
        return this.#keys[keyIndex].active;
    }
    
    static GetKeyDown (key)
    {
        let keyIndex = key;
        
        if (typeof key === "string")
        {
            keyIndex = this.#FindKey(key);
            
            if (keyIndex == null) return false;
        }
        else if (key < 0 || key >= this.#keys.length) return;
        
        return this.#keys[keyIndex].active && !this.#keys[keyIndex].lastState;
    }
    
    static GetKeyUp (key)
    {
        let keyIndex = key;
        
        if (typeof key === "string")
        {
            keyIndex = this.#FindKey(key);
            
            if (keyIndex == null) return false;
        }
        else if (key < 0 || key >= this.#keys.length) return;
        
        return !this.#keys[keyIndex].active && this.#keys[keyIndex].lastState;
    }
}

InputManager.Init();