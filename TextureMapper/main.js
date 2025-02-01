const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));
let texturePath = decodeURIComponent(URLSearch.get("path"));

Refractor.SetDirectory("../");

const mapperViewWrap = document.createElement("div");
mapperViewWrap.id = "view-wrap";
document.body.append(mapperViewWrap);

const MapperView = new Refractor.Embed(mapperViewWrap, projectDir);
MapperView.content.addEventListener("load", () => MapperView.Refract("window.targetScene = 2"));
MapperView.onLoad.Add(async () => {
    MapperView.Refract(`(async () => {
        await SceneInjector.Resources(${JSON.stringify(texturePath)});
        await SceneInjector.GameObject(${JSON.stringify({
            name: "texture",
            id: 0,
            components: [
                {
                    type: "SpriteRenderer",
                    args: {
                        sprite: {
                            texture: texturePath
                        }
                    }
                }
            ]
        })});

        requestAnimationFrame(() => {
            const cam = GameObject.FindComponents("Camera")[0];
            const bounds = GameObject.FindComponents("SpriteRenderer")[0].bounds;
            
            cam.transform.position = new Vector2(bounds.center.x, bounds.center.y);
            cam.orthographicSize = Math.max(bounds.size.x, bounds.size.y) + 0.25;
            
            GameObject.FindComponents("InputHandler")[0].RecalcViewMatrix();
        });
    })()`);

    await new Promise(resolve => requestAnimationFrame(resolve));
});

window.addEventListener("resize", () => MapperView.RecalcSize());


ipcRenderer.on("OnChangePath", async (event, path) => {
    if (texturePath === path) return;

    texturePath = path;
    window.miniID = `texture-mapper:${path}`;
});