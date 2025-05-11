class InputManager
{
    static #loaded = false;

    static mousePresent = false;
    static onWheel = new DelegateEvent();
    static onMouseEnter = new DelegateEvent();
    static onMouseExit = new DelegateEvent();

    static Init ()
    {
        if (this.#loaded) return;

        document.addEventListener("wheel", event => {
            event.preventDefault();

            if (event.deltaY === 0) return;

            this.onWheel.Invoke(event.deltaY * ((event.ctrlKey && !Input.GetKey(KeyCode.Ctrl)) ? 25 : 2) * 1e-3);
        }, { passive: false });

        this.#loaded = true;
    }
}

InputManager.Init();