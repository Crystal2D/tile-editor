Application.Bind(async () => {
    Crispixels.effect = true;

    await SceneManager.Load(0);

    SceneManager.SetActiveScene(0);
}, () => {
    Input.Terminate();
    SceneManager.Unload();
    
    Application.htmlCanvas.style.display = "none";
});

Application.wantsToQuit = new DelegateEvent();
Application.unloading = new DelegateEvent();
Application.quitting = new DelegateEvent();