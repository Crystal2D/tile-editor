window.onload = () => {
    CrystalEngine.Inner.InitiateProgram();
};

window.refractorID = 0;
window.targetScene = 0;
window.Refract = data => eval(data);