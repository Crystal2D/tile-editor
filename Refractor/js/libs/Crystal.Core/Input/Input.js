class Input
{
    static #terminating = false;
    static #terminated = false;
    static #mouseOver = false;
    static #keys = [];
    static #mousePos = new Vector2();
    static #mousePosOld = new Vector2();

    static get mousePresent ()
    {
        return this.#mouseOver;
    }

    static get mousePosition ()
    {
        return new Vector2(this.#mousePos.x, this.#mousePos.y);
    }

    static get mousePositionDelta ()
    {
        return Vector2.Subtract(this.#mousePosOld, this.#mousePos);
    }
    
    static #Key = class
    {
        active = false;
        lastState = false;
        isLetter = false;
        name = "";
        code = "";
        
        constructor (name, code, isLetter)
        {
            this.name = name;
            this.code = code;
            this.isLetter = isLetter ?? false;
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
        this.#keys = [
            new this.#Key("w", "w", true),
            new this.#Key("s", "s", true),
            new this.#Key("a", "a", true),
            new this.#Key("d", "d", true),
            new this.#Key("shift", "Shift"),
            new this.#Key("backspace", "Backspace"),
            new this.#Key("f", "f", true),
            new this.#Key("t", "t", true),
            new this.#Key("ctrl", "Control"),
            new this.#Key("b", "b", true),
            new this.#Key("e", "e", true),
            new this.#Key("r", "r", true),
            new this.#Key("p", "p", true),
            new this.#Key("c", "c", true),
            new this.#Key("v", "v", true),
            new this.#Key("n", "n", true),
            new this.#Key("x", "x", true),
            new this.#Key("del", "Delete"),
            new this.#Key("o", "o", true),
            new this.#Key("z", "z", true),
            new this.#Key("mouse0", "mouse0"),
            new this.#Key("mouse1", "mouse1"),
            new this.#Key("mouse2", "mouse2")
        ];

        document.addEventListener("mousemove", event => {
            setMousePos(event.clientX, event.clientY);

            if (this.#mouseOver) return;

            this.#mouseOver = true;
        });
        document.addEventListener("mouseleave", event => {
            setMousePos(event.clientX, event.clientY);

            this.#mouseOver = false;
        });
        document.addEventListener("contextmenu", event => event.preventDefault());

        const getScreenPos = (x, y) => new Vector2(
            Math.Clamp(x - (window.innerWidth - Interface.canvasWidth) * 0.5, 0, Interface.canvasWidth),
            Math.Clamp(y - (window.innerHeight - Interface.canvasHeight) * 0.5, 0, Interface.canvasHeight)
        );
        const setMousePos = (x, y) => {
            this.#mousePosOld = this.#mousePos;
            this.#mousePos = getScreenPos(x, y);
        };
        const mouseKeys = [
            "mouse0",
            "mouse2",
            "mouse1"
        ];

        document.addEventListener("mousedown", event => {
            if (this.#terminated) return;

            event.preventDefault();

            setMousePos(event.clientX, event.clientY);

            const keyIndex = this.#FindKeyByCode(mouseKeys[event.button]);
            
            this.#keys[keyIndex].active = true;
            
            window.parent.RefractBack("window.getSelection().removeAllRanges(); document.activeElement.blur()");
        });
        document.addEventListener("mouseup", event => {
            if (this.#terminated) return;

            event.preventDefault();

            setMousePos(event.clientX, event.clientY);

            const keyIndex = this.#FindKeyByCode(mouseKeys[event.button]);
            
            this.#keys[keyIndex].active = false;
        });
    }

    static KeyDown (code)
    {
        if (this.#terminated) return;

        const keyIndex = this.#FindKeyByCode(code);

        if (keyIndex === -1) return;
        
        this.#keys[keyIndex].active = true;
    }

    static KeyUp (code)
    {
        if (this.#terminated) return;

        const keyIndex = this.#FindKeyByCode(code);

        if (keyIndex === -1) return;
        
        this.#keys[keyIndex].active = false;
    }
    
    static Terminate ()
    {
        this.#terminating = true;
    }
    
    static Update ()
    {
        if (this.#terminated) return;
    }
    
    static End ()
    {
        if (this.#terminated) return;
        
        for (let i = 0; i < this.#keys.length; i++) this.#keys[i].lastState = this.#keys[i].active;
        
        if (this.#terminating) this.#terminated = true;
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

    static GetMouseButton (key)
    {
        const mouseKeys = [
            "mouse0",
            "mouse1",
            "mouse2"
        ];

        return this.GetKey(mouseKeys[key]);
    }

    static GetMouseButtonDown (key)
    {
        const mouseKeys = [
            "mouse0",
            "mouse1",
            "mouse2"
        ];

        return this.GetKeyDown(mouseKeys[key]);
    }

    static GetMouseButtonUp (key)
    {
        const mouseKeys = [
            "mouse0",
            "mouse1",
            "mouse2"
        ];

        return this.GetKeyUp(mouseKeys[key]);
    }

    static OnCtrl (key)
    {
        let keyIndex = key;

        if (typeof key === "string")
        {
            keyIndex = this.#FindKey(key);

            if (keyIndex == null) return false;
        }
        else if (key < 0 || key >= this.#keys.length) return;

        const ctrlIndex = this.#FindKeyByCode("Control");

        for (let i = 0; i < this.#keys.length; i++)
        {
            if (i === keyIndex || i === ctrlIndex) continue;

            if (this.#keys[i].active) return false;
        }

        return this.#keys[keyIndex].active && !this.#keys[keyIndex].lastState && this.#keys[ctrlIndex].active;
    }

    static OnCtrlShift (key)
    {
        let keyIndex = key;

        if (typeof key === "string")
        {
            keyIndex = this.#FindKey(key);

            if (keyIndex == null) return false;
        }
        else if (key < 0 || key >= this.#keys.length) return;

        const ctrlIndex = this.#FindKeyByCode("Control");
        const shiftIndex = this.#FindKeyByCode("Shift");

        for (let i = 0; i < this.#keys.length; i++)
        {
            if (i === keyIndex || i === ctrlIndex || i === shiftIndex) continue;

            if (this.#keys[i].active) return false;
        }

        return this.#keys[keyIndex].active && !this.#keys[keyIndex].lastState && this.#keys[ctrlIndex].active && this.#keys[shiftIndex].active;
    }
}