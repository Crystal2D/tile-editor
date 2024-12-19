Application.Bind(async () => {
    Crispixels.effect = true;

    await SceneManager.Load(window.targetScene);

    SceneManager.SetActiveScene(window.targetScene);
}, () => {
    Input.Terminate();
    SceneManager.Unload();
    
    Application.htmlCanvas.style.display = "none";
});

Application.wantsToQuit = new DelegateEvent();
Application.unloading = new DelegateEvent();
Application.quitting = new DelegateEvent();