class Input
{
    static #terminating = false;
    static #terminated = false;
    static #keys = [];
    
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
            new this.#Key("z", "z", true)
        ];
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

        InputManager.End();
        
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