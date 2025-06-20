/**
 * The main static class of the engine
 * 
 * @public
 * @static
 * @class
 */
class CrystalEngine
{
    // Static Classes
    
    static Script = class
    {
        #loaded = false;
        
        #src = null;
        
        get isLoaded ()
        {
            return this.#loaded;
        }
        
        get src ()
        {
            return this.#src;
        }
            
        constructor (src)
        {
            this.#src = src;
        }
        
        OnLoad () { }
        
        async Load ()
        {
            if (this.#loaded) return;
            
            const script = document.createElement("script");
            
            script.src = this.#src;
            script.type = "text/javascript";
            script.async = true;
            
            document.body.append(script);
            
            await new Promise(resolve => script.addEventListener("load", resolve));
            
            this.OnLoad();
            
            this.#loaded = true;
        }
    }

    static IsBehavior (className)
    {
        let classCheck = eval(className).toString().replace(/\s+/g, " ");

        const searchString = `${className} extends `;
        const checkIndex = classCheck.indexOf(searchString);

        if (checkIndex >= 0)
        {
            classCheck = classCheck.substring(checkIndex + searchString.length);
            classCheck = classCheck.substring(0, classCheck.indexOf("{")).trim();
            
            if (classCheck === "Behavior") return true;

            return this.IsBehavior(classCheck);
        }

        return false;
    }

    static async Wait (conditionCall)
    {
        const loop = callback => {
            if (conditionCall())
            {
                callback();
    
                return;
            }
    
            requestAnimationFrame(loop.bind(this, callback));
        };
    
        await new Promise(resolve => loop(resolve));
    }
    
    static Inner = class
    {
        static #inited = false;
        static #terminateStart = false;
        static #resources = [];
        static #compiledData = {
            libs : [],
            scripts : [],
            shaders : [],
            layers: []
        };
        
        static #buildData = null;
        
        static #Lib = class
        {
            #startedLoading = false;
            #loaded = false;
            #name = "";
            #id = "";
            #desc = "";
            #ver = "";
            #deps = [];
            #unloadedScripts = [];
            #scripts = [];
            #classes = [];
            
            #src = null;
            
            get isLoaded ()
            {
                return this.#loaded;
            }
            
            get name ()
            {
                return this.#name;
            }

            get id ()
            {
                return this.#id;
            }
            
            get description ()
            {
                return this.#desc;
            }

            get version ()
            {
                return this.#ver;
            }
            
            get scripts ()
            {
                return this.#scripts;
            }
            
            get classes ()
            {
                return this.#classes;
            }

            get deps ()
            {
                return this.#deps;
            }
            
            constructor (name, id, desc, ver, scripts, classes, src, deps)
            {
                this.#name =  name;
                this.#id = id;
                this.#desc = desc ?? "";
                this.#ver = ver;
                this.#unloadedScripts = scripts;
                this.#classes = classes ?? [];
                this.#src = src;
                this.#deps = deps ?? [];
            }
            
            async Load ()
            {
                if (this.#loaded) return;

                if (this.#startedLoading)
                {
                    await CrystalEngine.Wait(() => this.#loaded);

                    return;
                }

                this.#startedLoading = true;

                const scriptCount = this.#unloadedScripts.length;
                let scriptIndex = 0;

                // preload lol
                for (let i = 0; i < scriptCount; i++) (async () => {
                    await fetch(`js/libs/${this.#src}/${this.#unloadedScripts[i]}.js`);
                    scriptIndex++;
                })();

                await CrystalEngine.Wait(() => scriptIndex === scriptCount);

                for (let i = 0; i < this.#unloadedScripts.length; i++)
                {
                    const script = new CrystalEngine.Script(`js/libs/${this.#src}/${this.#unloadedScripts[i]}.js`);
                    
                    await script.Load();
                    
                    this.#scripts.push(script);
                }
                
                let newClasses = [];
                
                for (let i = 0; i < this.#classes.length; i++)
                {
                    if (this.#classes[i].name == null) continue;
                    else if (this.#classes[i].args == null) this.#classes[i].args = [];

                    if (this.#classes[i].type === 0 && CrystalEngine.IsBehavior(this.#classes[i].name)) this.#classes[i].args.push({
                        type: "boolean",
                        name: "enabled"
                    });
                    
                    newClasses.push(this.#classes[i]);
                }
                
                this.#classes = newClasses;
                
                this.#loaded = true;
            }
        }
        
        static #Script = class extends CrystalEngine.Script
        {
            #classes = [];
            
            get classes ()
            {
                return this.#classes;
            }
            
            constructor (src, classes)
            {
                super(src);
                
                this.#classes = classes ?? [];
            }
            
            OnLoad ()
            {
                let newClasses = [];
                
                for (let i = 0; i < this.#classes.length; i++)
                {
                    if (this.#classes[i].name == null) continue;
                    else if (this.#classes[i].args == null) this.#classes[i].args = [];

                    if (this.#classes[i].type === 0 && CrystalEngine.IsBehavior(this.#classes[i].name)) this.#classes[i].args.push({
                        type: "boolean",
                        name: "enabled"
                    });
                    
                    newClasses.push(this.#classes[i]);
                }
                
                this.#classes = newClasses;
            }
        }
        
        static #IsClassOfType (item, name, type)
        {
            return item.name === name && item.type === type;
        }
        
        static GetClassOfType (name, type)
        {
            const libs = this.#compiledData.libs;
            const scripts = this.#compiledData.scripts;
            
            let output = null;
            
            for (let i = 0; i < libs.length; i++)
            {
                const currentClass = libs[i].classes.find(element => this.#IsClassOfType(element, name, type));
                
                if (currentClass == null) continue;
                
                output = currentClass;
                
                break;
            }
            
            for (let i = 0; i < scripts.length; i++)
            {
                if (output != null) break;
                
                const currentClass = scripts[i].classes.find(element => this.#IsClassOfType(element, name, type));
                
                if (currentClass == null) continue;
                
                output = currentClass;
                
                break;
            }
            
            return output;
        }
        
        static InitiateProgram ()
        {
            if (this.#inited) return;
            
            document.body.style.height = "100vh";
            document.body.style.margin = "0";
            document.body.style.display = "flex";
            document.body.style.userSelect = "none";
            document.body.style.color = "white";
            document.body.style.fontFamily = "monospace";
            document.body.style.overflow = "clip";
            
            let errLogs = null;

            const onError = error => {
                if (this.#terminateStart)
                {
                    errLogs.append(`\n\n${error.stack}`);
                    
                    return;
                }
                
                this.#terminateStart = true;
                
                if (Application.isLoaded)
                {
                    PlayerLoop.OnError();

                    Application.Unload();
                }
                else Application.htmlCanvas.style.display = "none";
                
                document.body.style.height = "";
                document.body.style.overflow = "";

                Window.resizable = true;

                const errWrap = document.createElement("div");
                errWrap.style.whiteSpace = "pre-wrap";
                errWrap.style.marginTop = "12px";
                errWrap.style.marginLeft = "12px";

                errLogs = document.createElement("span");
                errLogs.style.userSelect = "text";
                errLogs.append(error.stack);
                
                const tip = document.createElement("span");
                tip.append("\n\n\n----------\n\nPlease report this problem");
                
                errWrap.append(errLogs, tip)
                document.body.append(errWrap);
            };
            
            window.addEventListener("error", event => onError(event.error));
            window.addEventListener("unhandledrejection", event => onError(event.reason));
            
            this.#inited = true;
            
            this.#LoadData();
        }
        
        static async #LoadData ()
        {
            Application.Init();
            Interface.SetResolution(window.innerWidth, window.innerHeight);
            
            const engineBuildResponse = await fetch("data/build.json");
            this.#buildData = await engineBuildResponse.json();
            this.#buildData.libs.unshift("Crystal.Core");

            const projDir = Application.projectDir;

            const buildResponse = await fetch(`${projDir}\\data\\build.json`);
            const buildData = await buildResponse.json();
            buildData.shaders.unshift("vertex", "fragment");

            const loadEnd = this.#buildData.libs.length + buildData.shaders.length + this.#buildData.shaders.length + 1;
            let loadCount = 0;
            
            for (let i = 0; i < this.#buildData.libs.length; i++) (async () => {
                const libResponse = await fetch(`js/libs/${this.#buildData.libs[i]}/manifest.json`);
                const libData = await libResponse.json();

                if (libData.id !== "com.crystal.core")
                {
                    if (libData.deps == null) libData.deps = [];

                    libData.deps.unshift("com.crystal.core");
                }
                
                this.#compiledData.libs.push(new this.#Lib(
                    libData.name,
                    libData.id,
                    libData.description,
                    libData.version,
                    libData.scripts,
                    libData.classes,
                    this.#buildData.libs[i],
                    libData.deps
                ));

                loadCount++;
            })();
            
            for (let i = 0; i < this.#buildData.scripts.length; i++)
            {
                const scriptData = this.#buildData.scripts[i];
                
                let script = null;
                
                if (typeof scriptData === "string") script = new this.#Script(`js/${scriptData}.js`);
                else script = new this.#Script(`js/${scriptData.src}.js`, scriptData.classes);
                
                this.#compiledData.scripts.push(script);
            }
            
            for (let i = 0; i < buildData.shaders.length; i++) (async () => {
                const shaderResponse = await fetch(`${projDir}\\shaders\\${buildData.shaders[i]}.glsl`);

                this.#compiledData.shaders.push(await shaderResponse.text());

                loadCount++;
            })();

            for (let i = 0; i < this.#buildData.shaders.length; i++) (async () => {
                const shaderResponse = await fetch(`shaders/${this.#buildData.shaders[i]}.glsl`);

                this.#compiledData.shaders.push(await shaderResponse.text());

                loadCount++;
            })();

            (async () => {
                const resResponse = await fetch(Application.resourcesPath);
                this.#resources = await resResponse.json();

                loadCount++;
            })();

            this.#compiledData.layers = buildData.layers;

            await CrystalEngine.Wait(() => loadCount === loadEnd);
            
            this.#Init();
        }
        
        static async #Init ()
        {
            const libCount = this.#compiledData.libs.length;
            let libIndex = 0;

            for (let i = 0; i < libCount; i++) (async () => {
                const deps = this.#compiledData.libs[i].deps;
                let loadCount = 0;

                for (let i = 0; i < deps.length; i++) (async () => {
                    const lib = this.#compiledData.libs.find(item => item.id === deps[i]);

                    await lib.Load();

                    loadCount++;
                })();

                await CrystalEngine.Wait(() => loadCount === deps.length);

                await this.#compiledData.libs[i].Load();

                libIndex++;
            })();
            
            await CrystalEngine.Wait(() => libIndex === libCount);
            
            for (let i = 0; i < this.#compiledData.scripts.length; i++) await this.#compiledData.scripts[i].Load();
            
            if (this.#terminateStart) return;
            
            Application.targetFrameRate = this.#buildData.targetFrameRate;
            Application.vSyncCount = this.#buildData.vSyncCount;
            
            Time.maximumDeltaTime = this.#buildData.maximumDeltaTime;

            QuadTree.maxDepth = this.#buildData.partioningMaxDepth;
            
            Shader.Set(this.#compiledData.shaders);

            if (this.#terminateStart) return;

            Resources.Set(this.#resources);

            if (this.#terminateStart) return;

            SortingLayer.Add(this.#compiledData.layers);
            SceneManager.Set(this.#buildData.scenes);

            if (this.#terminateStart) return;

            Input.Init();
            PlayerLoop.Init();
        }
    }
}